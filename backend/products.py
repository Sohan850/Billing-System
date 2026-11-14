import pymysql
from config import get_db_connection
from auth import login_required
from decimal import Decimal, InvalidOperation
from flask import Blueprint, request, jsonify, session

# Create Product Blueprint
products_bp = Blueprint('products', __name__)


# Add Product API
@products_bp.route('/add', methods=['POST'])
@login_required
def add_product():

    data = request.get_json(silent=True) or {}

    product_name = data.get('product_name')
    sku = data.get('sku')
    cost_price = data.get('cost_price')
    selling_price = data.get('selling_price')
    stock_quantity = data.get('stock_quantity')

    # Validate required fields
    if not product_name or not sku or cost_price is None or selling_price is None or stock_quantity is None:
        return jsonify({
            "message": "All product fields are required"
        }), 400

    product_name = product_name.strip() if isinstance(product_name, str) else ""
    sku = sku.strip() if isinstance(sku, str) else ""

    if not product_name or not sku:
        return jsonify({"message": "Product name and SKU cannot be empty"}), 400

    # Validate prices
    try:
        cost_price = Decimal(str(cost_price))
        selling_price = Decimal(str(selling_price))

        if not cost_price.is_finite() or not selling_price.is_finite():
            raise InvalidOperation

        if cost_price < 0 or selling_price < 0:
            return jsonify({"message": "Prices cannot be negative"}), 400

    except (InvalidOperation, ValueError):
        return jsonify({"message": "Enter valid product prices"}), 400

    # Validate stock quantity
    if isinstance(stock_quantity, bool) or not isinstance(stock_quantity, int) or stock_quantity < 0:
        return jsonify({
            "message": "Stock quantity must be a non-negative integer"
        }), 400

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO products
                (product_name, sku, cost_price, selling_price, stock_quantity)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    product_name,
                    sku,
                    cost_price,
                    selling_price,
                    stock_quantity
                )
            )

            product_id = cursor.lastrowid

        connection.commit()

        return jsonify({
            "message": "Product added successfully",
            "product_id": product_id,
            "product_name": product_name
        }), 201

    except pymysql.err.IntegrityError:
        if connection:
            connection.rollback()

        return jsonify({
            "message": "SKU already exists. Please use a different SKU."
        }), 409

    except Exception:
        if connection:
            connection.rollback()

        return jsonify({
            "message": "Could not add product"
        }), 500

    finally:
        if connection:
            connection.close()

# View All Products API
@products_bp.route('/all', methods=['GET'])
@login_required
def get_all_products():

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT product_id, product_name, sku,
                       cost_price, selling_price, stock_quantity,
                       created_at
                FROM products
                ORDER BY product_id DESC
                """
            )

            products = cursor.fetchall()

        return jsonify({
            "message": "Products retrieved successfully",
            "products": products
        }), 200

    except Exception:
        return jsonify({
            "message": "Could not retrieve products"
        }), 500

    finally:
        if connection:
            connection.close()

# Search Product API
@products_bp.route('/search', methods=['GET'])
@login_required
def search_product():

    keyword = request.args.get('keyword', '').strip()

    if not keyword:
        return jsonify({
            "message": "Please enter a product name or SKU"
        }), 400

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            search_value = f"%{keyword}%"

            cursor.execute(
                """
                SELECT product_id, product_name, sku,
                       cost_price, selling_price, stock_quantity
                FROM products
                WHERE product_name LIKE %s OR sku LIKE %s
                ORDER BY product_id DESC
                """,
                (search_value, search_value)
            )

            products = cursor.fetchall()

        return jsonify({
            "message": "Search completed successfully",
            "products": products
        }), 200

    except Exception:
        return jsonify({
            "message": "Could not search products"
        }), 500

    finally:
        if connection:
            connection.close()

# Update Product API
@products_bp.route('/update/<int:product_id>', methods=['PUT'])
@login_required
def update_product(product_id):

    data = request.get_json(silent=True) or {}

    product_name = data.get('product_name')
    sku = data.get('sku')
    cost_price = data.get('cost_price')
    selling_price = data.get('selling_price')

    # Validate required fields
    if (not isinstance(product_name, str) or
        not isinstance(sku, str) or
        cost_price is None or
        selling_price is None):

        return jsonify({
            "message": "Product name, SKU, cost price and selling price are required"
        }), 400

    product_name = product_name.strip()
    sku = sku.strip()

    if not product_name or not sku:
        return jsonify({
            "message": "Product name and SKU cannot be empty"
        }), 400

    # Validate prices
    try:
        cost_price = Decimal(str(cost_price))
        selling_price = Decimal(str(selling_price))

        if not cost_price.is_finite() or not selling_price.is_finite():
            raise InvalidOperation

        if cost_price < 0 or selling_price < 0:
            return jsonify({
                "message": "Prices cannot be negative"
            }), 400

    except (InvalidOperation, ValueError, TypeError):
        return jsonify({
            "message": "Enter valid product prices"
        }), 400

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            # Check whether product exists
            cursor.execute(
                "SELECT product_id FROM products WHERE product_id = %s",
                (product_id,)
            )

            if not cursor.fetchone():
                return jsonify({
                    "message": "Product not found"
                }), 404

            # Update product details without changing stock
            cursor.execute("""
                UPDATE products
                SET product_name = %s,
                    sku = %s,
                    cost_price = %s,
                    selling_price = %s
                WHERE product_id = %s
            """, (
                product_name,
                sku,
                cost_price,
                selling_price,
                product_id
            ))

        connection.commit()

        return jsonify({
            "message": "Product updated successfully",
            "product_id": product_id
        }), 200

    except pymysql.err.IntegrityError:
        if connection:
            connection.rollback()

        return jsonify({
            "message": "SKU already exists. Please use a different SKU."
        }), 409

    except Exception:
        if connection:
            connection.rollback()

        return jsonify({
            "message": "Could not update product"
        }), 500

    finally:
        if connection:
            connection.close()


# Delete Product API
@products_bp.route('/delete/<int:product_id>', methods=['DELETE'])
@login_required
def delete_product(product_id):

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            # Check whether the product exists
            cursor.execute(
                "SELECT product_id FROM products WHERE product_id = %s",
                (product_id,)
            )

            product = cursor.fetchone()

            if not product:
                return jsonify({
                    "message": "Product not found"
                }), 404

            # Check whether the product is used in sales
            cursor.execute(
                "SELECT sale_item_id FROM sale_items WHERE product_id = %s LIMIT 1",
                (product_id,)
            )

            sale_item = cursor.fetchone()

            # Check whether the product is used in purchases
            cursor.execute(
                "SELECT purchase_id FROM purchases WHERE product_id = %s LIMIT 1",
                (product_id,)
            )

            purchase = cursor.fetchone()

            if sale_item or purchase:
                return jsonify({
                    "message": "Cannot delete this product because it has transaction records"
                }), 409

            # Delete the product
            cursor.execute(
                "DELETE FROM products WHERE product_id = %s",
                (product_id,)
            )

        connection.commit()

        return jsonify({
            "message": "Product deleted successfully",
            "product_id": product_id
        }), 200

    except Exception:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass

        return jsonify({
            "message": "Could not delete product"
        }), 500

    finally:
        if connection:
            connection.close()

# Restock Product API
@products_bp.route('/restock/<int:product_id>', methods=['POST'])
@login_required
def restock_product(product_id):

    data = request.get_json(silent=True) or {}

    quantity = data.get('quantity')
    cost_price = data.get('cost_price')

    # Validate quantity
    if isinstance(quantity, bool) or not isinstance(quantity, int) or quantity <= 0:
        return jsonify({
            "message": "Quantity must be a positive integer"
        }), 400

    # Validate cost price
    try:
        cost_price = Decimal(str(cost_price))

        if not cost_price.is_finite() or cost_price < 0:
            raise InvalidOperation

    except (InvalidOperation, ValueError, TypeError):
        return jsonify({
            "message": "Enter a valid purchase cost price"
        }), 400

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:

            # Check whether product exists and lock its record
            cursor.execute(
                """
                SELECT product_id, stock_quantity
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
                    "message": "Product not found"
                }), 404

            previous_stock = product['stock_quantity']
            new_stock = previous_stock + quantity

            total_cost = cost_price * quantity

            # Update product stock and latest cost price
            cursor.execute(
                """
                UPDATE products
                SET stock_quantity = %s,
                    cost_price = %s
                WHERE product_id = %s
                """,
                (new_stock, cost_price, product_id)
            )

            # Record the purchase
            cursor.execute(
                """
                INSERT INTO purchases
                (product_id, user_id, quantity, cost_price, total_cost)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    product_id,
                    session['user_id'],
                    quantity,
                    cost_price,
                    total_cost
                )
            )

            purchase_id = cursor.lastrowid

        connection.commit()

        return jsonify({
            "message": "Product restocked successfully",
            "purchase_id": purchase_id,
            "previous_stock": previous_stock,
            "quantity_added": quantity,
            "new_stock": new_stock,
            "total_cost": str(total_cost)
        }), 200

    except Exception:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass

        return jsonify({
            "message": "Could not restock product"
        }), 500

    finally:
        if connection:
            connection.close()
