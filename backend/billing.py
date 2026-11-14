
from flask import Blueprint, request, jsonify, session
from config import get_db_connection
from auth import login_required
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import secrets


billing_bp = Blueprint('billing', __name__)


# Helper function to validate positive integers
def validate_positive_integer(value):

    if isinstance(value, bool):
        raise ValueError

    if isinstance(value, int):
        number = value

    elif isinstance(value, str) and value.isdigit():
        number = int(value)

    else:
        raise ValueError

    if number <= 0:
        raise ValueError

    return number


# --------------------------------------------------
# 1. CREATE CUSTOMER BILL
# --------------------------------------------------

@billing_bp.route('/create', methods=['POST'])
@login_required
def create_bill():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"message": "Invalid request data"}), 400

    customer_id = data.get('customer_id')
    items = data.get('items')
    coupon_code = data.get('coupon_code')

    if not isinstance(items, list) or not items:
        return jsonify({"message": "At least one product is required"}), 400

    if customer_id is not None:
        try:
            customer_id = validate_positive_integer(customer_id)
        except (ValueError, TypeError):
            return jsonify({"message": "Invalid customer ID"}), 400

    if coupon_code is not None:
        if not isinstance(coupon_code, str) or not coupon_code.strip():
            return jsonify({"message": "Invalid coupon code"}), 400
        coupon_code = coupon_code.strip().upper()

    product_quantities = {}

    try:
        for item in items:
            if not isinstance(item, dict):
                raise ValueError

            product_id = validate_positive_integer(item.get('product_id'))
            quantity = validate_positive_integer(item.get('quantity'))

            product_quantities[product_id] = (
                product_quantities.get(product_id, 0) + quantity
            )

    except (ValueError, TypeError):
        return jsonify({
            "message": "Product ID and quantity must be positive integers"
        }), 400

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            # Lock the customer row so concurrent bills cannot issue
            # the same spending milestone at the same time.
            if customer_id is not None:
                cursor.execute(
                    """
                    SELECT customer_id
                    FROM customers
                    WHERE customer_id = %s
                    FOR UPDATE
                    """,
                    (customer_id,)
                )

                if not cursor.fetchone():
                    connection.rollback()
                    return jsonify({"message": "Customer not found"}), 404

            # Find the customer's currently active membership.
            membership_type = None
            membership_discount_rate = Decimal('0.00')

            if customer_id is not None:
                cursor.execute(
                    """
                    SELECT membership_type
                    FROM memberships
                    WHERE customer_id = %s
                      AND status = 'Active'
                      AND start_date <= CURDATE()
                      AND (end_date IS NULL OR end_date >= CURDATE())
                    ORDER BY start_date DESC, membership_id DESC
                    LIMIT 1
                    FOR UPDATE
                    """,
                    (customer_id,)
                )

                membership = cursor.fetchone()

                if membership:
                    membership_type = membership['membership_type']
                    membership_rates = {
                        'silver': Decimal('0.02'),
                        'gold': Decimal('0.05'),
                        'platinum': Decimal('0.10')
                    }
                    membership_discount_rate = membership_rates.get(
                        str(membership_type).strip().lower(),
                        Decimal('0.00')
                    )

            # Lock and validate the coupon, if one was supplied.
            coupon = None

            if coupon_code:
                if customer_id is None:
                    connection.rollback()
                    return jsonify({
                        "message": "A customer must be selected to use a coupon"
                    }), 400

                cursor.execute(
                    """
                    SELECT coupon_id, discount_amount, status
                    FROM reward_coupons
                    WHERE coupon_code = %s AND customer_id = %s
                    FOR UPDATE
                    """,
                    (coupon_code, customer_id)
                )

                coupon = cursor.fetchone()

                if not coupon:
                    connection.rollback()
                    return jsonify({
                        "message": "Coupon not found for this customer"
                    }), 404

                if coupon['status'] != 'Available':
                    connection.rollback()
                    return jsonify({"message": "Coupon has already been redeemed"}), 400

            # Lock product rows and calculate the bill subtotal.
            product_details = {}
            subtotal_amount = Decimal('0.00')

            for product_id in sorted(product_quantities):
                cursor.execute(
                    """
                    SELECT product_id, product_name, selling_price, stock_quantity
                    FROM products
                    WHERE product_id = %s
                    FOR UPDATE
                    """,
                    (product_id,)
                )

                product = cursor.fetchone()

                if not product:
                    connection.rollback()
                    return jsonify({
                        "message": f"Product ID {product_id} not found"
                    }), 404

                quantity = product_quantities[product_id]

                if product['stock_quantity'] < quantity:
                    connection.rollback()
                    return jsonify({
                        "message": "Insufficient stock",
                        "product_name": product['product_name'],
                        "available_stock": product['stock_quantity'],
                        "requested_quantity": quantity
                    }), 400

                try:
                    unit_price = Decimal(str(product['selling_price']))
                    if not unit_price.is_finite() or unit_price < 0:
                        raise InvalidOperation
                except (InvalidOperation, ValueError, TypeError):
                    connection.rollback()
                    return jsonify({
                        "message": "Invalid product selling price"
                    }), 500

                item_subtotal = (unit_price * quantity).quantize(
                    Decimal('0.01'), rounding=ROUND_HALF_UP
                )
                subtotal_amount += item_subtotal

                product_details[product_id] = {
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "subtotal": item_subtotal
                }

            subtotal_amount = subtotal_amount.quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )

            # Apply membership discount first.
            membership_discount = (
                subtotal_amount * membership_discount_rate
            ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            amount_after_membership = subtotal_amount - membership_discount

            # Apply the fixed-value reward coupon to the remaining balance.
            coupon_discount = Decimal('0.00')

            if coupon:
                coupon_value = Decimal(str(coupon['discount_amount']))
                coupon_discount = min(coupon_value, amount_after_membership)

            discount_amount = membership_discount + coupon_discount
            final_amount = subtotal_amount - discount_amount

            # Create the sale with the final payable amount.
            cursor.execute(
                """
                INSERT INTO sales
                (customer_id, user_id, total_amount, discount_amount)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    customer_id,
                    session['user_id'],
                    final_amount,
                    discount_amount
                )
            )

            sale_id = cursor.lastrowid

            # Insert bill items and deduct stock.
            for product_id, details in product_details.items():
                cursor.execute(
                    """
                    INSERT INTO sale_items
                    (sale_id, product_id, quantity, unit_price, subtotal)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        sale_id,
                        product_id,
                        details['quantity'],
                        details['unit_price'],
                        details['subtotal']
                    )
                )

                cursor.execute(
                    """
                    UPDATE products
                    SET stock_quantity = stock_quantity - %s
                    WHERE product_id = %s
                    """,
                    (details['quantity'], product_id)
                )

            # Redeem the coupon within the same transaction as the bill.
            if coupon:
                cursor.execute(
                    """
                    UPDATE reward_coupons
                    SET status = 'Redeemed',
                        redeemed_at = CURRENT_TIMESTAMP,
                        redeemed_sale_id = %s
                    WHERE coupon_id = %s AND status = 'Available'
                    """,
                    (sale_id, coupon['coupon_id'])
                )

                if cursor.rowcount != 1:
                    connection.rollback()
                    return jsonify({
                        "message": "Coupon could not be redeemed. Please try again."
                    }), 409

            # Issue one coupon for each spending milestone reached.
            # Spending is calculated from completed sales after discounts.
            issued_coupons = []

            if customer_id is not None:
                cursor.execute(
                    """
                    SELECT COALESCE(SUM(total_amount), 0) AS total_spending
                    FROM sales
                    WHERE customer_id = %s
                    """,
                    (customer_id,)
                )

                spending_row = cursor.fetchone()
                total_spending = Decimal(str(spending_row['total_spending']))

                reward_milestones = [
                    (Decimal('5000.00'), Decimal('200.00')),
                    (Decimal('10000.00'), Decimal('500.00'))
                ]

                for threshold, reward_value in reward_milestones:
                    if total_spending >= threshold:
                        new_coupon_code = (
                            'REWARD-' + secrets.token_hex(4).upper()
                        )

                        cursor.execute(
                            """
                            INSERT IGNORE INTO reward_coupons
                            (customer_id, coupon_code, threshold_amount, discount_amount)
                            VALUES (%s, %s, %s, %s)
                            """,
                            (
                                customer_id,
                                new_coupon_code,
                                threshold,
                                reward_value
                            )
                        )

                        if cursor.rowcount == 1:
                            issued_coupons.append({
                                "coupon_code": new_coupon_code,
                                "threshold_amount": str(threshold),
                                "discount_amount": str(reward_value)
                            })

        connection.commit()

        return jsonify({
            "message": "Bill created successfully",
            "sale_id": sale_id,
            "subtotal_amount": str(subtotal_amount),
            "membership_type": membership_type,
            "membership_discount": str(membership_discount),
            "coupon_discount": str(coupon_discount),
            "discount_amount": str(discount_amount),
            "total_amount": str(final_amount),
            "redeemed_coupon": coupon_code if coupon else None,
            "new_reward_coupons": issued_coupons
        }), 201

    except Exception:
        if connection:
            connection.rollback()

        return jsonify({
            "message": "Could not create bill"
        }), 500

    finally:
        if connection:
            connection.close()


# --------------------------------------------------
# 2. VIEW ALL SALES
# --------------------------------------------------

@billing_bp.route('/all', methods=['GET'])
@login_required
def get_all_sales():

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    s.sale_id,
                    s.customer_id,
                    c.customer_name,
                    s.user_id,
                    u.username,
                    s.total_amount,
                    s.sale_date
                FROM sales s
                LEFT JOIN customers c
                    ON s.customer_id = c.customer_id
                JOIN users u
                    ON s.user_id = u.user_id
                ORDER BY s.sale_id DESC
                """
            )

            sales = cursor.fetchall()

        # Convert Decimal amounts into JSON-safe strings
        for sale in sales:
            sale['total_amount'] = str(sale['total_amount'])

        return jsonify({
            "message": "Sales retrieved successfully",
            "sales": sales
        }), 200

    except Exception:
        return jsonify({
            "message": "Could not retrieve sales"
        }), 500

    finally:
        if connection:
            connection.close()


# --------------------------------------------------
# 3. VIEW INDIVIDUAL BILL DETAILS
# --------------------------------------------------

@billing_bp.route('/<int:sale_id>', methods=['GET'])
@login_required
def get_bill_details(sale_id):

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            # Retrieve main bill details
            cursor.execute(
                """
                SELECT
                    s.sale_id,
                    s.customer_id,
                    c.customer_name,
                    s.user_id,
                    u.username,
                    s.total_amount,
                    s.sale_date
                FROM sales s
                LEFT JOIN customers c
                    ON s.customer_id = c.customer_id
                JOIN users u
                    ON s.user_id = u.user_id
                WHERE s.sale_id = %s
                """,
                (sale_id,)
            )

            sale = cursor.fetchone()

            if not sale:
                return jsonify({
                    "message": "Bill not found"
                }), 404

            # Retrieve products included in the bill
            cursor.execute(
                """
                SELECT
                    si.sale_item_id,
                    si.product_id,
                    p.product_name,
                    p.sku,
                    si.quantity,
                    si.unit_price,
                    si.subtotal
                FROM sale_items si
                JOIN products p
                    ON si.product_id = p.product_id
                WHERE si.sale_id = %s
                """,
                (sale_id,)
            )

            sale_items = cursor.fetchall()

        # Convert Decimal values into JSON-safe strings
        sale['total_amount'] = str(sale['total_amount'])

        for item in sale_items:
            item['unit_price'] = str(item['unit_price'])
            item['subtotal'] = str(item['subtotal'])

        sale['items'] = sale_items

        return jsonify({
            "message": "Bill details retrieved successfully",
            "bill": sale
        }), 200

    except Exception:
        return jsonify({
            "message": "Could not retrieve bill details"
        }), 500

    finally:
        if connection:
            connection.close()
