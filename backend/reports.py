
from flask import Blueprint, jsonify, request
from config import get_db_connection
from auth import admin_required
from datetime import datetime, date, timedelta
from decimal import Decimal


reports_bp = Blueprint('reports', __name__)




# --------------------------------------------------
# 1. DAILY SALES REPORT
# --------------------------------------------------

@reports_bp.route('/daily', methods=['GET'])
@admin_required
def daily_sales_report():

    report_date = request.args.get('date')

    # Use today's date if no date is provided
    if report_date:
        try:
            selected_date = datetime.strptime(
                report_date, '%Y-%m-%d'
            ).date()

        except ValueError:
            return jsonify({
                "message": "Invalid date format. Use YYYY-MM-DD"
            }), 400

    else:
        selected_date = date.today()

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            # 1. Daily sales summary
            cursor.execute("""
                SELECT
                    COUNT(*) AS total_bills,
                    COALESCE(SUM(total_amount), 0) AS total_revenue
                FROM sales
                WHERE sale_date >= %s
                  AND sale_date < %s
            """, (
                selected_date,
                selected_date + timedelta(days=1)
            ))

            summary = cursor.fetchone()

            # 2. Calculate total product cost
            cursor.execute("""
                SELECT
                    COALESCE(
                        SUM(si.quantity * p.cost_price), 0
                    ) AS total_cost
                FROM sales s
                JOIN sale_items si
                    ON s.sale_id = si.sale_id
                JOIN products p
                    ON si.product_id = p.product_id
                WHERE s.sale_date >= %s
                  AND s.sale_date < %s
            """, (
                selected_date,
                selected_date + timedelta(days=1)
            ))

            cost_summary = cursor.fetchone()

            # 3. Product-wise sales, cost and estimated profit
            cursor.execute("""
                SELECT
                    p.product_id,
                    p.product_name,
                    p.sku,

                    SUM(si.quantity) AS total_quantity_sold,

                    SUM(si.subtotal) AS total_sales_price,

                    SUM(
                        si.quantity * p.cost_price
                    ) AS total_cost,

                    SUM(
                        si.subtotal
                        -
                        CASE
                            WHEN st.sale_subtotal > 0
                            THEN
                                (si.subtotal / st.sale_subtotal)
                                * COALESCE(s.discount_amount, 0)
                            ELSE 0
                        END
                        -
                        (si.quantity * p.cost_price)
                    ) AS total_profit

                FROM sales s

                JOIN sale_items si
                    ON s.sale_id = si.sale_id

                JOIN products p
                    ON si.product_id = p.product_id

                JOIN (
                    SELECT
                        sale_id,
                        SUM(subtotal) AS sale_subtotal
                    FROM sale_items
                    GROUP BY sale_id
                ) st
                    ON s.sale_id = st.sale_id

                WHERE s.sale_date >= %s
                  AND s.sale_date < %s

                GROUP BY
                    p.product_id,
                    p.product_name,
                    p.sku

                ORDER BY total_quantity_sold DESC
            """, (
                selected_date,
                selected_date + timedelta(days=1)
            ))

            products = cursor.fetchall()

        # 4. Calculate total estimated profit
        total_revenue = Decimal(str(summary['total_revenue']))
        total_cost = Decimal(str(cost_summary['total_cost']))

        total_profit = total_revenue - total_cost

        # 5. Convert Decimal amounts into JSON-safe strings
        summary['total_revenue'] = str(total_revenue)
        cost_summary['total_cost'] = str(total_cost)

        for product in products:

            product['total_sales_price'] = str(
                product['total_sales_price']
            )

            product['total_cost'] = str(
                product['total_cost']
            )

            product['total_profit'] = str(
                product['total_profit']
            )

        return jsonify({
            "message": "Daily sales report generated successfully",
            "date": str(selected_date),

            "total_bills": summary['total_bills'],
            "total_revenue": str(total_revenue),

            "total_cost": str(total_cost),
            "total_profit": str(total_profit),

            "products": products

        }), 200

    except Exception:
        return jsonify({
            "message": "Could not generate daily sales report"
        }), 500

    finally:
        if connection:
            connection.close()



# --------------------------------------------------
# 2. MONTHLY SALES REPORT
# --------------------------------------------------

@reports_bp.route('/monthly', methods=['GET'])
@admin_required
def monthly_sales_report():

    month = request.args.get('month')

    # Use the current month if no month is provided
    if month:
        try:
            selected_month = datetime.strptime(
                month, '%Y-%m'
            ).date().replace(day=1)

        except ValueError:
            return jsonify({
                "message": "Invalid month format. Use YYYY-MM"
            }), 400

    else:
        today = date.today()
        selected_month = today.replace(day=1)

    # Calculate the first day of the next month
    if selected_month.month == 12:
        next_month = date(selected_month.year + 1, 1, 1)
    else:
        next_month = date(
            selected_month.year,
            selected_month.month + 1,
            1
        )

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            # 1. Monthly sales summary
            cursor.execute("""
                SELECT
                    COUNT(*) AS total_bills,
                    COALESCE(SUM(total_amount), 0) AS total_revenue
                FROM sales
                WHERE sale_date >= %s
                  AND sale_date < %s
            """, (
                selected_month,
                next_month
            ))

            summary = cursor.fetchone()

            # 2. Calculate total product cost
            cursor.execute("""
                SELECT
                    COALESCE(
                        SUM(si.quantity * p.cost_price), 0
                    ) AS total_cost
                FROM sales s
                JOIN sale_items si
                    ON s.sale_id = si.sale_id
                JOIN products p
                    ON si.product_id = p.product_id
                WHERE s.sale_date >= %s
                  AND s.sale_date < %s
            """, (
                selected_month,
                next_month
            ))

            cost_summary = cursor.fetchone()

            # 3. Monthly product-wise sales and profit
            cursor.execute("""
                SELECT
                    p.product_id,
                    p.product_name,
                    p.sku,

                    SUM(si.quantity) AS total_quantity_sold,

                    SUM(si.subtotal) AS total_sales_price,

                    SUM(
                        si.quantity * p.cost_price
                    ) AS total_cost,

                    SUM(
                        si.subtotal
                        -
                        CASE
                            WHEN st.sale_subtotal > 0
                            THEN
                                (si.subtotal / st.sale_subtotal)
                                * COALESCE(s.discount_amount, 0)
                            ELSE 0
                        END
                        -
                        (si.quantity * p.cost_price)
                    ) AS total_profit

                FROM sales s

                JOIN sale_items si
                    ON s.sale_id = si.sale_id

                JOIN products p
                    ON si.product_id = p.product_id

                JOIN (
                    SELECT
                        sale_id,
                        SUM(subtotal) AS sale_subtotal
                    FROM sale_items
                    GROUP BY sale_id
                ) st
                    ON s.sale_id = st.sale_id

                WHERE s.sale_date >= %s
                  AND s.sale_date < %s

                GROUP BY
                    p.product_id,
                    p.product_name,
                    p.sku

                ORDER BY total_quantity_sold DESC
            """, (
                selected_month,
                next_month
            ))

            products = cursor.fetchall()

        # 4. Calculate monthly profit
        total_revenue = Decimal(
            str(summary['total_revenue'])
        )

        total_cost = Decimal(
            str(cost_summary['total_cost'])
        )

        total_profit = total_revenue - total_cost

        # 5. Convert Decimal values into JSON-safe strings
        for product in products:

            product['total_sales_price'] = str(
                product['total_sales_price']
            )

            product['total_cost'] = str(
                product['total_cost']
            )

            product['total_profit'] = str(
                product['total_profit']
            )

        return jsonify({
            "message": "Monthly sales report generated successfully",

            "month": selected_month.strftime('%Y-%m'),

            "total_bills": summary['total_bills'],

            "total_revenue": str(total_revenue),

            "total_cost": str(total_cost),

            "total_profit": str(total_profit),

            "products": products

        }), 200

    except Exception:
        return jsonify({
            "message": "Could not generate monthly sales report"
        }), 500

    finally:
        if connection:
            connection.close()



# --------------------------------------------------
# 3. MOST SOLD PRODUCTS REPORT
# --------------------------------------------------

@reports_bp.route('/top-products', methods=['GET'])
@admin_required
def top_sold_products():

    try:
        limit = int(request.args.get('limit', 5))

        if limit < 1 or limit > 100:
            return jsonify({
                "message": "Limit must be between 1 and 100"
            }), 400

    except ValueError:
        return jsonify({
            "message": "Limit must be a valid number"
        }), 400

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT
                    p.product_id,
                    p.product_name,
                    p.sku,
                    SUM(si.quantity) AS total_quantity_sold,
                    SUM(si.subtotal) AS total_revenue
                FROM sale_items si
                JOIN products p
                    ON si.product_id = p.product_id
                GROUP BY
                    p.product_id,
                    p.product_name,
                    p.sku
                ORDER BY total_quantity_sold DESC
                LIMIT %s
            """, (limit,))

            products = cursor.fetchall()

        for product in products:
            product['total_revenue'] = str(
                product['total_revenue']
            )

        return jsonify({
            "message": "Top selling products retrieved successfully",
            "products": products
        }), 200

    except Exception:
        return jsonify({
            "message": "Could not retrieve top selling products"
        }), 500

    finally:
        if connection:
            connection.close()
