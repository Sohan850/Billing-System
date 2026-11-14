
from flask import Blueprint, request, jsonify, session
from config import get_db_connection
from auth import login_required
from decimal import Decimal, InvalidOperation


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

    # Validate JSON request
    if not isinstance(data, dict):
        return jsonify({
            "message": "Invalid request data"
        }), 400

    customer_id = data.get('customer_id')
    items = data.get('items')

    # Validate items
    if not isinstance(items, list) or not items:
        return jsonify({
            "message": "At least one product is required"
        }), 400

    # Validate customer ID if provided
    if customer_id is not None:

        try:
            customer_id = validate_positive_integer(customer_id)

        except (ValueError, TypeError):
            return jsonify({
                "message": "Invalid customer ID"
            }), 400

    # Combine duplicate product entries
    product_quantities = {}

    try:
        for item in items:

            if not isinstance(item, dict):
                raise ValueError

            product_id = validate_positive_integer(
                item.get('product_id')
            )

            quantity = validate_positive_integer(
                item.get('quantity')
            )

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

            # Check customer if provided
            if customer_id is not None:

                cursor.execute(
                    """
                    SELECT customer_id
                    FROM customers
                    WHERE customer_id = %s
                    """,
                    (customer_id,)
                )

                if not cursor.fetchone():
                    return jsonify({
                        "message": "Customer not found"
                    }), 404

            # Lock product rows and check stock
            product_details = {}
            total_amount = Decimal('0.00')

            for product_id in sorted(product_quantities):

                cursor.execute(
                    """
                    SELECT
                        product_id,
                        product_name,
                        selling_price,
                        stock_quantity
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

                # Check available stock
                if product['stock_quantity'] < quantity:

                    connection.rollback()

                    return jsonify({
                        "message": "Insufficient stock",
                        "product_name": product['product_name'],
                        "available_stock": product['stock_quantity'],
                        "requested_quantity": quantity
                    }), 400

                # Validate selling price
                try:
                    unit_price = Decimal(
                        str(product['selling_price'])
                    )

                    if not unit_price.is_finite() or unit_price < 0:
                        raise InvalidOperation

                except (InvalidOperation, ValueError, TypeError):
                    connection.rollback()

                    return jsonify({
                        "message": "Invalid product selling price"
                    }), 500

                # Calculate subtotal
                subtotal = (unit_price * quantity).quantize(
                    Decimal('0.01')
                )

                total_amount += subtotal

                product_details[product_id] = {
                    "product_name": product['product_name'],
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "subtotal": subtotal
                }

            total_amount = total_amount.quantize(
                Decimal('0.01')
            )

            # Create main sales record
            cursor.execute(
                """
                INSERT INTO sales
                (customer_id, user_id, total_amount)
                VALUES (%s, %s, %s)
                """,
                (
                    customer_id,
                    session['user_id'],
                    total_amount
                )
            )

            sale_id = cursor.lastrowid

            # Insert sale items and reduce stock
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
                    (
                        details['quantity'],
                        product_id
                    )
                )

        # Save all changes together
        connection.commit()

        return jsonify({
            "message": "Bill created successfully",
            "sale_id": sale_id,
            "total_amount": str(total_amount)
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
