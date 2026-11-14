
from flask import Blueprint, jsonify, request
from config import get_db_connection
from auth import login_required
from datetime import datetime, date, timedelta
from decimal import Decimal


reports_bp = Blueprint('reports', __name__)


# --------------------------------------------------
# 1. DAILY SALES REPORT
# --------------------------------------------------

@reports_bp.route('/daily', methods=['GET'])
@login_required
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

            cursor.execute("""
                SELECT
                    s.sale_id,
                    s.customer_id,
                    c.customer_name,
                    s.total_amount,
                    s.sale_date
                FROM sales s
                LEFT JOIN customers c
                    ON s.customer_id = c.customer_id
                WHERE s.sale_date >= %s
                  AND s.sale_date < %s
                ORDER BY s.sale_date DESC
            """, (
                selected_date,
               selected_date + timedelta(days=1)
            ))

            sales = cursor.fetchall()

        summary['total_revenue'] = str(summary['total_revenue'])

        for sale in sales:
            sale['total_amount'] = str(sale['total_amount'])

        return jsonify({
            "message": "Daily sales report generated successfully",
            "date": str(selected_date),
            "total_bills": summary['total_bills'],
            "total_revenue": summary['total_revenue'],
            "sales": sales
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
@login_required
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

            cursor.execute("""
                SELECT
                    s.sale_id,
                    s.customer_id,
                    c.customer_name,
                    s.total_amount,
                    s.sale_date
                FROM sales s
                LEFT JOIN customers c
                    ON s.customer_id = c.customer_id
                WHERE s.sale_date >= %s
                  AND s.sale_date < %s
                ORDER BY s.sale_date DESC
            """, (
                selected_month,
                next_month
            ))

            sales = cursor.fetchall()

        summary['total_revenue'] = str(summary['total_revenue'])

        for sale in sales:
            sale['total_amount'] = str(sale['total_amount'])

        return jsonify({
            "message": "Monthly sales report generated successfully",
            "month": selected_month.strftime('%Y-%m'),
            "total_bills": summary['total_bills'],
            "total_revenue": summary['total_revenue'],
            "sales": sales
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
@login_required
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
