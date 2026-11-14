
import os
from flask import Flask, render_template, redirect, url_for
from auth import login_required
from dotenv import load_dotenv
from products import products_bp
from auth import auth_bp
from purchases import purchases_bp
from customers import customers_bp
from members import members_bp
from billing import billing_bp
from reports import reports_bp

# Load environment variables from .env
load_dotenv()

# Create Flask application
app = Flask(
    __name__,
    template_folder='../frontend/templates',
    static_folder='../frontend/static'
)

# Configure secret key for sessions
app.secret_key = os.getenv("SECRET_KEY")

# Register authentication Blueprint
app.register_blueprint(
    auth_bp,
    url_prefix='/api/auth'
)
app.register_blueprint(products_bp, url_prefix='/api/products')

app.register_blueprint(purchases_bp, url_prefix='/api/purchases')

app.register_blueprint(customers_bp, url_prefix='/api/customers')

app.register_blueprint(members_bp, url_prefix='/api/members')

app.register_blueprint(billing_bp, url_prefix='/api/billing')

app.register_blueprint(reports_bp, url_prefix='/api/reports')

# Home page
@app.route('/')
def home():
    return redirect(url_for('login_page'))


# Login page
@app.route('/login')
def login_page():
    return render_template('login.html')


# Dashboard page
@app.route('/dashboard')
@login_required
def dashboard_page():
    return render_template('dashboard.html')

@app.route('/products')
@login_required
def products_page():
    return render_template('products.html')

@app.route('/billing')
@login_required
def billing_page():
    return render_template('billing.html')

@app.route('/customers')
@login_required
def customers_page():
    return render_template('customers.html')

@app.route('/purchases')
@login_required
def purchases_page():
    return render_template('purchases.html')

@app.route('/memberships')
@login_required
def memberships_page():
    return render_template('memberships.html')

@app.route('/reports')
@login_required
def reports_page():
    return render_template('reports.html')

# Run Flask application
if __name__ == '__main__':
    app.run(debug=True)

