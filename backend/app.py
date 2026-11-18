
import os

from flask import Flask, render_template, redirect, url_for, session
from dotenv import load_dotenv

from auth import page_role_required
from products import products_bp
from auth import auth_bp
from purchases import purchases_bp
from customers import customers_bp
from members import members_bp
from billing import billing_bp
from reports import reports_bp


# Load environment variables
load_dotenv()


# Create Flask application
app = Flask(
    __name__,
    template_folder='../frontend/templates',
    static_folder='../frontend/static'
)


# Configure secret key
app.secret_key = os.getenv("SECRET_KEY")


# --------------------------------------------------
# REGISTER BLUEPRINTS
# --------------------------------------------------

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(products_bp, url_prefix='/api/products')
app.register_blueprint(purchases_bp, url_prefix='/api/purchases')
app.register_blueprint(customers_bp, url_prefix='/api/customers')
app.register_blueprint(members_bp, url_prefix='/api/members')
app.register_blueprint(billing_bp, url_prefix='/api/billing')
app.register_blueprint(reports_bp, url_prefix='/api/reports')


# --------------------------------------------------
# HOME PAGE
# --------------------------------------------------

@app.route('/')
def home():

    if session.get('role') == 'admin':
        return redirect('/dashboard')

    if session.get('role') == 'cashier':
        return redirect('/cashier')

    return redirect(url_for('login_page'))


# --------------------------------------------------
# LOGIN PAGE
# --------------------------------------------------

@app.route('/login')
def login_page():
    return render_template('login.html')


# --------------------------------------------------
# ADMIN PORTAL
# --------------------------------------------------

@app.route('/dashboard')
@page_role_required('admin')
def dashboard_page():
    return render_template('dashboard.html')


@app.route('/products')
@page_role_required('admin')
def products_page():
    return render_template('products.html')


@app.route('/billing')
@page_role_required('admin')
def billing_page():
    return render_template('billing.html')


@app.route('/customers')
@page_role_required('admin')
def customers_page():
    return render_template('customers.html')


@app.route('/purchases')
@page_role_required('admin')
def purchases_page():
    return render_template('purchases.html')


@app.route('/memberships')
@page_role_required('admin')
def memberships_page():
    return render_template('memberships.html')


@app.route('/reports')
@page_role_required('admin')
def reports_page():
    return render_template('reports.html')


# --------------------------------------------------
# CASHIER PORTAL
# --------------------------------------------------

@app.route('/cashier')
@page_role_required('cashier')
def cashier_page():
    return render_template('cashier.html')


# --------------------------------------------------
# RUN APPLICATION
# --------------------------------------------------

if __name__ == '__main__':
    app.run(debug=True)
