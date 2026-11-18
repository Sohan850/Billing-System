
import pymysql
from flask import Blueprint, request, jsonify
from config import get_db_connection
from auth import admin_required

# Create Customer Blueprint
customers_bp = Blueprint('customers', __name__)


# Add Customer API
@customers_bp.route('/add', methods=['POST'])
@admin_required
def add_customer():

    data = request.get_json(silent=True) or {}

    customer_name = data.get('customer_name')
    phone = data.get('phone')
    email = data.get('email')

    # Validate customer name
    if not isinstance(customer_name, str) or not customer_name.strip():
        return jsonify({
            "message": "Customer name is required"
        }), 400

    customer_name = customer_name.strip()

    # Validate phone number
    if phone is not None:
        phone = str(phone).strip()

        if phone and (not phone.isdigit() or len(phone) > 15):
            return jsonify({
                "message": "Enter a valid phone number (maximum 15 digits)"
            }), 400

        if not phone:
            phone = None

    # Validate email
    if email is not None:
        if not isinstance(email, str):
            return jsonify({
                "message": "Enter a valid email address"
            }), 400

        email = email.strip()

        if not email:
            email = None

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO customers
                (customer_name, phone, email)
                VALUES (%s, %s, %s)
                """,
                (customer_name, phone, email)
            )

            customer_id = cursor.lastrowid

        connection.commit()

        return jsonify({
            "message": "Customer added successfully",
            "customer_id": customer_id,
            "customer_name": customer_name
        }), 201

    except pymysql.err.IntegrityError:
        if connection:
            connection.rollback()

        return jsonify({
            "message": "Phone number already exists. Please use a different number."
        }), 409

    except Exception:
        if connection:
            connection.rollback()

        return jsonify({
            "message": "Could not add customer"
        }), 500

    finally:
        if connection:
            connection.close()


# View All Customers API
@customers_bp.route('/all', methods=['GET'])
@admin_required
def get_all_customers():

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT customer_id, customer_name,
                       phone, email, created_at
                FROM customers
                ORDER BY customer_id DESC
                """
            )

            customers = cursor.fetchall()

        return jsonify({
            "message": "Customers retrieved successfully",
            "customers": customers
        }), 200

    except Exception:
        return jsonify({
            "message": "Could not retrieve customers"
        }), 500

    finally:
        if connection:
            connection.close()


# Search Customer API
@customers_bp.route('/search', methods=['GET'])
@admin_required
def search_customer():

    keyword = request.args.get('keyword', '').strip()

    if not keyword:
        return jsonify({
            "message": "Please enter a customer name or phone number"
        }), 400

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            search_value = f"%{keyword}%"

            cursor.execute(
                """
                SELECT customer_id, customer_name, phone, email, created_at
                FROM customers
                WHERE customer_name LIKE %s OR phone LIKE %s
                ORDER BY customer_id DESC
                """,
                (search_value, search_value)
            )

            customers = cursor.fetchall()

        return jsonify({
            "message": "Customer search completed successfully",
            "customers": customers
        }), 200

    except Exception:
        return jsonify({
            "message": "Could not search customers"
        }), 500

    finally:
        if connection:
            connection.close()


# Update Customer API
@customers_bp.route('/update/<int:customer_id>', methods=['PUT'])
@admin_required
def update_customer(customer_id):

    data = request.get_json(silent=True) or {}

    customer_name = data.get('customer_name')
    phone = data.get('phone')
    email = data.get('email')

    # Validate customer name
    if not isinstance(customer_name, str) or not customer_name.strip():
        return jsonify({
            "message": "Customer name is required"
        }), 400

    customer_name = customer_name.strip()

    # Validate phone number
    if phone is not None:
        phone = str(phone).strip()

        if phone and (not phone.isdigit() or len(phone) > 15):
            return jsonify({
                "message": "Enter a valid phone number (maximum 15 digits)"
            }), 400

        if not phone:
            phone = None

    # Validate email
    if email is not None:
        if not isinstance(email, str):
            return jsonify({
                "message": "Enter a valid email address"
            }), 400

        email = email.strip()

        if not email:
            email = None

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            # Check whether customer exists
            cursor.execute(
                "SELECT customer_id FROM customers WHERE customer_id = %s",
                (customer_id,)
            )

            customer = cursor.fetchone()

            if not customer:
                return jsonify({
                    "message": "Customer not found"
                }), 404

            # Update customer details
            cursor.execute(
                """
                UPDATE customers
                SET customer_name = %s,
                    phone = %s,
                    email = %s
                WHERE customer_id = %s
                """,
                (customer_name, phone, email, customer_id)
            )

        connection.commit()

        return jsonify({
            "message": "Customer updated successfully",
            "customer_id": customer_id
        }), 200

    except pymysql.err.IntegrityError:
        if connection:
            connection.rollback()

        return jsonify({
            "message": "Phone number already exists. Please use a different number."
        }), 409

    except Exception:
        if connection:
            connection.rollback()

        return jsonify({
            "message": "Could not update customer"
        }), 500

    finally:
        if connection:
            connection.close()


# Delete Customer API
@customers_bp.route('/delete/<int:customer_id>', methods=['DELETE'])
@admin_required
def delete_customer(customer_id):

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            # Check whether customer exists
            cursor.execute(
                "SELECT customer_id FROM customers WHERE customer_id = %s",
                (customer_id,)
            )

            customer = cursor.fetchone()

            if not customer:
                return jsonify({
                    "message": "Customer not found"
                }), 404

            # Check whether customer has sales records
            cursor.execute(
                "SELECT sale_id FROM sales WHERE customer_id = %s LIMIT 1",
                (customer_id,)
            )

            if cursor.fetchone():
                return jsonify({
                    "message": "Cannot delete customer because sales records exist"
                }), 409

            # Check whether customer has membership records
            cursor.execute(
                "SELECT membership_id FROM memberships WHERE customer_id = %s LIMIT 1",
                (customer_id,)
            )

            if cursor.fetchone():
                return jsonify({
                    "message": "Cannot delete customer because membership records exist"
                }), 409

            # Delete customer
            cursor.execute(
                "DELETE FROM customers WHERE customer_id = %s",
                (customer_id,)
            )

        connection.commit()

        return jsonify({
            "message": "Customer deleted successfully",
            "customer_id": customer_id
        }), 200

    except Exception:
        if connection:
            connection.rollback()

        return jsonify({
            "message": "Could not delete customer"
        }), 500

    finally:
        if connection:
            connection.close()
