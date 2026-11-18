
from flask import Blueprint, request, jsonify
from config import get_db_connection
from auth import admin_required
from datetime import datetime


# Create Membership Blueprint
members_bp = Blueprint('members', __name__)


# Helper function to validate dates
def validate_membership_dates(start_date, end_date):

    if not isinstance(start_date, str):
        raise ValueError("Invalid start date")

    start = datetime.strptime(start_date, '%Y-%m-%d').date()

    if end_date is not None and end_date != '':

        if not isinstance(end_date, str):
            raise ValueError("Invalid end date")

        end = datetime.strptime(end_date, '%Y-%m-%d').date()

        if end < start:
            raise ValueError("End date cannot be before start date")

    else:
        end = None

    return start, end


# Add Membership API
@members_bp.route('/add', methods=['POST'])
@admin_required
def add_membership():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "message": "Invalid request data"
        }), 400

    customer_id = data.get('customer_id')
    membership_type = data.get('membership_type')
    start_date = data.get('start_date')
    end_date = data.get('end_date')

    # Validate required fields
    if customer_id is None or membership_type is None or start_date is None:
        return jsonify({
            "message": "Customer ID, membership type and start date are required"
        }), 400

    # Validate customer ID
    try:
        if isinstance(customer_id, bool):
            raise ValueError

        customer_id = int(customer_id)

        if customer_id <= 0:
            raise ValueError

        if isinstance(data.get('customer_id'), float):
            raise ValueError

        if isinstance(data.get('customer_id'), str):
            if not data.get('customer_id').isdigit():
                raise ValueError

    except (ValueError, TypeError):
        return jsonify({
            "message": "Customer ID must be a positive integer"
        }), 400

    # Validate membership type
    if not isinstance(membership_type, str) or not membership_type.strip():
        return jsonify({
            "message": "Membership type is required"
        }), 400

    membership_type = membership_type.strip()

    # Validate dates
    try:
        start, end = validate_membership_dates(start_date, end_date)

    except ValueError as error:

        if str(error) == "End date cannot be before start date":
            return jsonify({
                "message": str(error)
            }), 400

        return jsonify({
            "message": "Invalid date format. Use YYYY-MM-DD"
        }), 400

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            # Check whether customer exists
            cursor.execute(
                "SELECT customer_id FROM customers WHERE customer_id = %s",
                (customer_id,)
            )

            if not cursor.fetchone():
                return jsonify({
                    "message": "Customer not found"
                }), 404

            # Insert membership
            cursor.execute(
                """
                INSERT INTO memberships
                (customer_id, membership_type, start_date, end_date, status)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    customer_id,
                    membership_type,
                    start,
                    end,
                    'Active'
                )
            )

            membership_id = cursor.lastrowid

        connection.commit()

        return jsonify({
            "message": "Membership added successfully",
            "membership_id": membership_id
        }), 201

    except Exception:
        if connection:
            connection.rollback()

        return jsonify({
            "message": "Could not add membership"
        }), 500

    finally:
        if connection:
            connection.close()


# View All Memberships API
@members_bp.route('/all', methods=['GET'])
@admin_required
def get_all_memberships():

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    m.membership_id,
                    m.customer_id,
                    c.customer_name,
                    c.phone,
                    m.membership_type,
                    m.start_date,
                    m.end_date,
                    m.status
                FROM memberships m
                JOIN customers c
                    ON m.customer_id = c.customer_id
                ORDER BY m.membership_id DESC
                """
            )

            memberships = cursor.fetchall()

        return jsonify({
            "message": "Memberships retrieved successfully",
            "memberships": memberships
        }), 200

    except Exception:
        return jsonify({
            "message": "Could not retrieve memberships"
        }), 500

    finally:
        if connection:
            connection.close()


# Search Membership API
@members_bp.route('/search', methods=['GET'])
@admin_required
def search_membership():

    keyword = request.args.get('keyword', '').strip()

    if not keyword:
        return jsonify({
            "message": "Please enter a search keyword"
        }), 400

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            search_value = f"%{keyword}%"

            cursor.execute(
                """
                SELECT
                    m.membership_id,
                    m.customer_id,
                    c.customer_name,
                    c.phone,
                    m.membership_type,
                    m.start_date,
                    m.end_date,
                    m.status
                FROM memberships m
                JOIN customers c
                    ON m.customer_id = c.customer_id
                WHERE c.customer_name LIKE %s
                   OR c.phone LIKE %s
                   OR m.membership_type LIKE %s
                ORDER BY m.membership_id DESC
                """,
                (
                    search_value,
                    search_value,
                    search_value
                )
            )

            memberships = cursor.fetchall()

        return jsonify({
            "message": "Search completed successfully",
            "memberships": memberships
        }), 200

    except Exception:
        return jsonify({
            "message": "Could not search memberships"
        }), 500

    finally:
        if connection:
            connection.close()


# Update Membership API
@members_bp.route('/update/<int:membership_id>', methods=['PUT'])
@admin_required
def update_membership(membership_id):

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "message": "Invalid request data"
        }), 400

    membership_type = data.get('membership_type')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    status = data.get('status')

    # Validate required fields
    if membership_type is None or start_date is None or status is None:
        return jsonify({
            "message": "Membership type, start date and status are required"
        }), 400

    # Validate membership type
    if not isinstance(membership_type, str) or not membership_type.strip():
        return jsonify({
            "message": "Membership type is required"
        }), 400

    membership_type = membership_type.strip()

    # Validate status
    if not isinstance(status, str):
        return jsonify({
            "message": "Invalid membership status"
        }), 400

    status = status.strip().capitalize()

    if status not in ['Active', 'Inactive', 'Expired']:
        return jsonify({
            "message": "Status must be Active, Inactive or Expired"
        }), 400

    # Validate dates
    try:
        start, end = validate_membership_dates(start_date, end_date)

    except ValueError as error:

        if str(error) == "End date cannot be before start date":
            return jsonify({
                "message": str(error)
            }), 400

        return jsonify({
            "message": "Invalid date format. Use YYYY-MM-DD"
        }), 400

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            # Check whether membership exists
            cursor.execute(
                "SELECT membership_id FROM memberships WHERE membership_id = %s",
                (membership_id,)
            )

            if not cursor.fetchone():
                return jsonify({
                    "message": "Membership not found"
                }), 404

            # Update membership
            cursor.execute(
                """
                UPDATE memberships
                SET membership_type = %s,
                    start_date = %s,
                    end_date = %s,
                    status = %s
                WHERE membership_id = %s
                """,
                (
                    membership_type,
                    start,
                    end,
                    status,
                    membership_id
                )
            )

        connection.commit()

        return jsonify({
            "message": "Membership updated successfully",
            "membership_id": membership_id
        }), 200

    except Exception:
        if connection:
            connection.rollback()

        return jsonify({
            "message": "Could not update membership"
        }), 500

    finally:
        if connection:
            connection.close()


# Delete Membership API
@members_bp.route('/delete/<int:membership_id>', methods=['DELETE'])
@admin_required
def delete_membership(membership_id):

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            # Check whether membership exists
            cursor.execute(
                "SELECT membership_id FROM memberships WHERE membership_id = %s",
                (membership_id,)
            )

            if not cursor.fetchone():
                return jsonify({
                    "message": "Membership not found"
                }), 404

            # Delete membership
            cursor.execute(
                "DELETE FROM memberships WHERE membership_id = %s",
                (membership_id,)
            )

        connection.commit()

        return jsonify({
            "message": "Membership deleted successfully",
            "membership_id": membership_id
        }), 200

    except Exception:
        if connection:
            connection.rollback()

        return jsonify({
            "message": "Could not delete membership"
        }), 500

    finally:
        if connection:
            connection.close()
