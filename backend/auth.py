from functools import wraps
from flask import Blueprint, request, jsonify, session
from config import get_db_connection
from werkzeug.security import check_password_hash

# Create authentication Blueprint
auth_bp = Blueprint('auth', __name__)
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):

        if 'user_id' not in session:
            return jsonify({"message": "Please login first"}), 401

        return f(*args, **kwargs)

    return decorated_function


# Login API
@auth_bp.route('/login', methods=['POST'])
def login():

    data = request.get_json(silent=True) or {}

    username = data.get('username')
    password = data.get('password')

    # Validate input
    if not username or not password:
        return jsonify({
            "message": "Username and password are required"
        }), 400

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            cursor.execute(
                "SELECT user_id, username, password FROM users WHERE username = %s",
                (username,)
            )

            user = cursor.fetchone()

        # Verify user and password
        if user and check_password_hash(user['password'], password):

            session.clear()

            session['user_id'] = user['user_id']
            session['username'] = user['username']

            return jsonify({
                "message": "Login successful",
                "username": user['username']
            }), 200

        return jsonify({
            "message": "Invalid username or password"
        }), 401

    except Exception:
        return jsonify({
            "message": "Login could not be completed"
        }), 500

    finally:
        if connection:
            connection.close()
@auth_bp.route('/dashboard', methods=['GET'])
@login_required
def dashboard():

    return jsonify({
        "message": "Welcome to the dashboard!",
        "username": session['username']
    }), 200
# Logout API
@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():

    session.clear()

    return jsonify({
        "message": "Logout successful"
    }), 200