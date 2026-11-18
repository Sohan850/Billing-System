
from functools import wraps
import re
import pymysql

from flask import Blueprint, request, jsonify, session, redirect
from config import get_db_connection
from werkzeug.security import check_password_hash, generate_password_hash


auth_bp = Blueprint('auth', __name__)


# --------------------------------------------------
# 1. LOGIN REQUIRED
# --------------------------------------------------

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):

        if 'user_id' not in session:
            return jsonify({
                "message": "Please login first"
            }), 401

        return f(*args, **kwargs)

    return decorated_function


# --------------------------------------------------
# 2. ROLE-BASED API ACCESS
# --------------------------------------------------

def roles_required(*allowed_roles):

    def decorator(f):

        @wraps(f)
        def decorated_function(*args, **kwargs):

            if 'user_id' not in session:
                return jsonify({
                    "message": "Please login first"
                }), 401

            if session.get('role') not in allowed_roles:
                return jsonify({
                    "message": "You do not have permission to access this feature"
                }), 403

            return f(*args, **kwargs)

        return decorated_function

    return decorator


# Admin-only API access
def admin_required(f):
    return roles_required('admin')(f)


# Admin and cashier API access
def billing_access_required(f):
    return roles_required('admin', 'cashier')(f)


# --------------------------------------------------
# 3. ROLE-BASED PAGE ACCESS
# --------------------------------------------------

def page_role_required(*allowed_roles):

    def decorator(f):

        @wraps(f)
        def decorated_function(*args, **kwargs):

            if 'user_id' not in session:
                return redirect('/login')

            role = session.get('role')

            if role not in allowed_roles:

                if role == 'admin':
                    return redirect('/dashboard')

                if role == 'cashier':
                    return redirect('/cashier')

                return redirect('/login')

            return f(*args, **kwargs)

        return decorated_function

    return decorator


# --------------------------------------------------
# 4. LOGIN API
# --------------------------------------------------

@auth_bp.route('/login', methods=['POST'])
def login():

    data = request.get_json(silent=True) or {}

    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({
            "message": "Username and password are required"
        }), 400

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT user_id, username, password, role
                FROM users
                WHERE username = %s
                """,
                (username,)
            )

            user = cursor.fetchone()

        if user and check_password_hash(user['password'], password):

            session.clear()

            session['user_id'] = user['user_id']
            session['username'] = user['username']
            session['role'] = user['role']

            redirect_url = (
                '/dashboard'
                if user['role'] == 'admin'
                else '/cashier'
            )

            return jsonify({
                "message": "Login successful",
                "username": user['username'],
                "role": user['role'],
                "redirect_url": redirect_url
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


# --------------------------------------------------
# 5. DASHBOARD API
# --------------------------------------------------

@auth_bp.route('/dashboard', methods=['GET'])
@login_required
def dashboard():

    return jsonify({
        "message": "Welcome to the dashboard!",
        "username": session['username'],
        "role": session['role']
    }), 200


# --------------------------------------------------
# 6. CREATE CASHIER ACCOUNT (ADMIN ONLY)
# --------------------------------------------------

@auth_bp.route('/cashiers', methods=['POST'])
@admin_required
def create_cashier():

    data = request.get_json(silent=True) or {}

    username = data.get('username')
    password = data.get('password')

    if not isinstance(username, str) or not username.strip():
        return jsonify({
            "message": "Cashier username is required"
        }), 400

    username = username.strip()

    if len(username) < 3 or len(username) > 50:
        return jsonify({
            "message": "Username must be between 3 and 50 characters"
        }), 400

    if not re.fullmatch(r"[A-Za-z0-9_.-]+", username):
        return jsonify({
            "message": "Username can contain letters, numbers, dots, underscores and hyphens only"
        }), 400

    if not isinstance(password, str) or len(password) < 8:
        return jsonify({
            "message": "Password must contain at least 8 characters"
        }), 400

    connection = None

    try:
        connection = get_db_connection()

        hashed_password = generate_password_hash(password)

        with connection.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO users (username, password, role)
                VALUES (%s, %s, 'cashier')
                """,
                (username, hashed_password)
            )

            cashier_id = cursor.lastrowid

        connection.commit()

        return jsonify({
            "message": "Cashier account created successfully",
            "user_id": cashier_id,
            "username": username,
            "role": "cashier"
        }), 201

    except pymysql.err.IntegrityError:

        if connection:
            connection.rollback()

        return jsonify({
            "message": "Username already exists. Choose another username."
        }), 409

    except Exception:

        if connection:
            connection.rollback()

        return jsonify({
            "message": "Could not create cashier account"
        }), 500

    finally:
        if connection:
            connection.close()


# --------------------------------------------------
# 7. LOGOUT API
# --------------------------------------------------

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():

    session.clear()

    return jsonify({
        "message": "Logout successful"
    }), 200
