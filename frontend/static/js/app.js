
// Login form functionality
const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        const message = document.getElementById("loginMessage");

        try {

            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const result = await response.json();

            if (response.ok) {

                message.innerHTML =
                    '<div class="alert alert-success">Login successful!</div>';

                window.location.href = "/dashboard";

            } else {

                message.innerHTML =
                    `<div class="alert alert-danger">${result.message}</div>`;

            }

        } catch (error) {

            message.innerHTML =
                '<div class="alert alert-danger">Could not connect to server.</div>';

        }

    });

}

// Logout functionality
async function logout() {

    try {

        const response = await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "same-origin"
        });

        if (response.ok) {
            window.location.href = "/login";
        } else {
            alert("Could not logout. Please try again.");
        }

    } catch (error) {
        alert("Could not connect to server.");
    }

}

// =====================================
// PRODUCT MANAGEMENT
// =====================================

// Load all products
async function loadProducts() {

    const table = document.getElementById("productTable");

    if (!table) return;

    try {

        const response = await fetch("/api/products/all");
        const result = await response.json();

        table.innerHTML = "";

        if (!response.ok) {
            document.getElementById("tableMessage").textContent = result.message;
            return;
        }

        result.products.forEach(product => {

            table.innerHTML += `
                <tr>
                    <td>${product.product_id}</td>
                    <td>${product.product_name}</td>
                    <td>${product.sku}</td>
                    <td>${product.cost_price}</td>
                    <td>${product.selling_price}</td>
                    <td>${product.stock_quantity}</td>
                    <td>
                        <button class="btn btn-danger btn-sm"
                            onclick="deleteProduct(${product.product_id})">
                            Delete
                        </button>
                    </td>
                </tr>
            `;

        });

        document.getElementById("tableMessage").textContent =
            result.products.length === 0 ? "No products found." : "";

    } catch (error) {

        document.getElementById("tableMessage").textContent =
            "Could not load products.";

    }

}


// Add new product
const productForm = document.getElementById("productForm");

if (productForm) {

    productForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const productData = {
            product_name: document.getElementById("productName").value,
            sku: document.getElementById("sku").value,
            cost_price: document.getElementById("costPrice").value,
            selling_price: document.getElementById("sellingPrice").value,
            stock_quantity: parseInt(document.getElementById("stockQuantity").value, 10)
        };

        try {

            const response = await fetch("/api/products/add", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(productData)
            });

            const result = await response.json();

            const message = document.getElementById("productMessage");

            if (response.ok) {

                message.innerHTML =
                    `<div class="alert alert-success">${result.message}</div>`;

                productForm.reset();

                loadProducts();

            } else {

                message.innerHTML =
                    `<div class="alert alert-danger">${result.message}</div>`;

            }

        } catch (error) {

            document.getElementById("productMessage").textContent =
                "Could not connect to server.";

        }

    });

}


// Search products
async function searchProducts() {

    const keyword = document.getElementById("searchKeyword").value;

    try {

        const response = await fetch(
            `/api/products/search?keyword=${encodeURIComponent(keyword)}`
        );

        const result = await response.json();

        if (!response.ok) {
            document.getElementById("tableMessage").textContent = result.message;
            return;
        }

        displayProducts(result.products);

    } catch (error) {

        document.getElementById("tableMessage").textContent =
            "Could not search products.";

    }

}


// Display products in table
function displayProducts(products) {

    const table = document.getElementById("productTable");

    table.innerHTML = "";

    products.forEach(product => {

        table.innerHTML += `
            <tr>
                <td>${product.product_id}</td>
                <td>${product.product_name}</td>
                <td>${product.sku}</td>
                <td>${product.cost_price}</td>
                <td>${product.selling_price}</td>
                <td>${product.stock_quantity}</td>
                <td>
                    <button class="btn btn-danger btn-sm"
                        onclick="deleteProduct(${product.product_id})">
                        Delete
                    </button>
                </td>
            </tr>
        `;

    });

    document.getElementById("tableMessage").textContent =
        products.length === 0 ? "No products found." : "";

}


// Delete product
async function deleteProduct(productId) {

    if (!confirm("Are you sure you want to delete this product?")) {
        return;
    }

    try {

        const response = await fetch(`/api/products/delete/${productId}`, {
            method: "DELETE"
        });

        const result = await response.json();

        alert(result.message);

        if (response.ok) {
            loadProducts();
        }

    } catch (error) {

        alert("Could not connect to server.");

    }

}


// Automatically load products when the page opens
if (document.getElementById("productTable")) {
    loadProducts();
}

// =====================================
// BILLING MANAGEMENT
// =====================================

let billItems = [];
let availableProducts = [];

// Load products into the dropdown
async function loadBillingProducts() {

    const select = document.getElementById("productSelect");

    if (!select) return;

    try {

        const response = await fetch("/api/products/all");
        const result = await response.json();

        if (!response.ok) {
            document.getElementById("billMessage").textContent = result.message;
            return;
        }

        availableProducts = result.products;

        select.innerHTML = '<option value="">Select Product</option>';

        availableProducts.forEach(product => {

            select.innerHTML += `
                <option value="${product.product_id}">
                    ${product.product_name} - ₹${product.selling_price}
                    (Stock: ${product.stock_quantity})
                </option>
            `;

        });

    } catch (error) {

        document.getElementById("billMessage").textContent =
            "Could not load products.";

    }

}


// Add product to bill
function addBillItem() {

    const productId = parseInt(
        document.getElementById("productSelect").value, 10
    );

    const quantity = parseInt(
        document.getElementById("billQuantity").value, 10
    );

    const product = availableProducts.find(
        p => p.product_id === productId
    );

    if (!product || !Number.isInteger(quantity) || quantity <= 0) {
        alert("Please select a product and enter a valid quantity.");
        return;
    }

    if (quantity > product.stock_quantity) {
        alert("Requested quantity exceeds available stock.");
        return;
    }

    const existingItem = billItems.find(
        item => item.product_id === productId
    );

    const totalQuantity = existingItem
        ? existingItem.quantity + quantity
        : quantity;

    if (totalQuantity > product.stock_quantity) {
        alert("Total quantity exceeds available stock.");
        return;
    }

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        billItems.push({
            product_id: productId,
            product_name: product.product_name,
            quantity: quantity,
            unit_price: Number(product.selling_price)
        });
    }

    document.getElementById("billQuantity").value = 1;
    document.getElementById("productSelect").value = "";

    displayBillItems();

}


// Display bill items
function displayBillItems() {

    const table = document.getElementById("billTable");

    if (!table) return;

    table.innerHTML = "";

    let total = 0;

    billItems.forEach((item, index) => {

        const subtotal = item.quantity * item.unit_price;

        total += subtotal;

        table.innerHTML += `
            <tr>
                <td>${item.product_name}</td>
                <td>${item.quantity}</td>
                <td>₹${item.unit_price.toFixed(2)}</td>
                <td>₹${subtotal.toFixed(2)}</td>
                <td>
                    <button class="btn btn-danger btn-sm"
                        onclick="removeBillItem(${index})">
                        Remove
                    </button>
                </td>
            </tr>
        `;

    });

    document.getElementById("billTotal").textContent =
        total.toFixed(2);

}


// Remove product from bill
function removeBillItem(index) {

    billItems.splice(index, 1);

    displayBillItems();

}


// Generate bill
async function createBill() {

    if (billItems.length === 0) {
        alert("Please add at least one product.");
        return;
    }

    const customerValue =
        document.getElementById("customerId").value.trim();

    const billData = {
        customer_id: customerValue === ""
            ? null
            : Number(customerValue),

        items: billItems.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity
        }))
    };

    if (
        billData.customer_id !== null &&
        (!Number.isInteger(billData.customer_id) ||
         billData.customer_id <= 0)
    ) {
        alert("Please enter a valid customer ID.");
        return;
    }

    try {

        const response = await fetch("/api/billing/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(billData)
        });

        const result = await response.json();

        const message = document.getElementById("billMessage");

        if (response.ok) {

            message.innerHTML = `
                <div class="alert alert-success">
                    Bill created successfully!<br>
                    Sale ID: ${result.sale_id}<br>
                    Total: ₹${result.total_amount}
                </div>
            `;

            billItems = [];

            displayBillItems();

            document.getElementById("customerId").value = "";

            await loadBillingProducts();

        } else {

            message.innerHTML = `
                <div class="alert alert-danger">
                    ${result.message}
                </div>
            `;

        }

    } catch (error) {

        document.getElementById("billMessage").textContent =
            "Could not connect to server.";

    }

}


// Load products when Billing page opens
if (document.getElementById("productSelect")) {
    loadBillingProducts();
}
