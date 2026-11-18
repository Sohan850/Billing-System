
from flask import Blueprint, jsonify
from config import get_db_connection
from auth import admin_required

# Create Purchases Blueprint
purchases_bp = Blueprint('purchases', __name__)


# View Purchase History API
@purchases_bp.route('/all', methods=['GET'])
@admin_required
def get_all_purchases():

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    p.purchase_id,
                    pr.product_name,
                    pr.sku,
                    p.quantity,
                    p.cost_price,
                    p.total_cost,
                    p.purchase_date,
                    u.username
                FROM purchases p
                JOIN products pr
                    ON p.product_id = pr.product_id
                JOIN users u
                    ON p.user_id = u.user_id
                ORDER BY p.purchase_id DESC
                """
            )

            purchases = cursor.fetchall()

        return jsonify({
            "message": "Purchase history retrieved successfully",
            "purchases": purchases
        }), 200

    except Exception:
        return jsonify({
            "message": "Could not retrieve purchase history"
        }), 500

    finally:
        if connection:
            connection.close()
