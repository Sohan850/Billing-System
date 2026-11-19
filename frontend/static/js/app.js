
// =====================================
// LOGIN FORM FUNCTIONALITY
// =====================================

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

                // Redirect according to user role
                if (result.role === "admin") {
                    window.location.href = "/dashboard";
                } 
                else if (result.role === "cashier") {
                    window.location.href = "/cashier";
                } 
                else {
                    message.innerHTML =
                        '<div class="alert alert-danger">Unknown user role.</div>';
                }

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


// =====================================
// LOGOUT FUNCTIONALITY
// =====================================

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

// Store product details for Restock modal
let productCache = {};


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

        productCache = {};

        result.products.forEach(product => {
            productCache[product.product_id] = product;

            table.innerHTML += `
                <tr>
                    <td>${product.product_id}</td>
                    <td>${product.product_name}</td>
                    <td>${product.sku}</td>
                    <td>${product.cost_price}</td>
                    <td>${product.selling_price}</td>
                    <td>${product.stock_quantity}</td>
                    <td>
                        <button class="btn btn-success btn-sm me-1"
                            onclick="openRestockModal(${product.product_id})">
                            Restock
                        </button>

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


// =====================================
// ADD NEW PRODUCT
// =====================================

const productForm = document.getElementById("productForm");

if (productForm) {
    productForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const productData = {
            product_name: document.getElementById("productName").value,
            sku: document.getElementById("sku").value,
            cost_price: document.getElementById("costPrice").value,
            selling_price: document.getElementById("sellingPrice").value,
            stock_quantity: parseInt(
                document.getElementById("stockQuantity").value, 10
            )
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


// =====================================
// SEARCH PRODUCTS
// =====================================

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


// =====================================
// DISPLAY PRODUCTS
// =====================================

function displayProducts(products) {
    const table = document.getElementById("productTable");

    table.innerHTML = "";

    productCache = {};

    products.forEach(product => {
        productCache[product.product_id] = product;

        table.innerHTML += `
            <tr>
                <td>${product.product_id}</td>
                <td>${product.product_name}</td>
                <td>${product.sku}</td>
                <td>${product.cost_price}</td>
                <td>${product.selling_price}</td>
                <td>${product.stock_quantity}</td>
                <td>
                    <button class="btn btn-success btn-sm me-1"
                        onclick="openRestockModal(${product.product_id})">
                        Restock
                    </button>

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


// =====================================
// PRODUCT RESTOCK
// =====================================

// Open Restock modal
function openRestockModal(productId) {
    const product = productCache[productId];

    if (!product) {
        alert("Product details could not be found. Please reload the products.");
        return;
    }

    document.getElementById("restockProductId").value = product.product_id;

    document.getElementById("restockProductName").textContent =
        product.product_name;

    document.getElementById("currentStock").textContent =
        product.stock_quantity;

    document.getElementById("restockQuantity").value = "";

    document.getElementById("restockCostPrice").value =
        product.cost_price;

    document.getElementById("restockMessage").textContent = "";

    const modalElement = document.getElementById("restockModal");

    bootstrap.Modal.getOrCreateInstance(modalElement).show();
}


// Confirm Restock
const confirmRestockButton = document.getElementById("confirmRestock");

if (confirmRestockButton) {
    confirmRestockButton.addEventListener("click", async function() {

        const productId =
            document.getElementById("restockProductId").value;

        const quantity =
            Number(document.getElementById("restockQuantity").value);

        const costPrice =
            Number(document.getElementById("restockCostPrice").value);

        const message =
            document.getElementById("restockMessage");


        // Validate quantity
        if (!Number.isInteger(quantity) || quantity <= 0) {
            message.innerHTML =
                '<div class="alert alert-danger">Enter a valid whole-number quantity greater than zero.</div>';
            return;
        }


        // Validate cost price
        if (!Number.isFinite(costPrice) || costPrice < 0) {
            message.innerHTML =
                '<div class="alert alert-danger">Enter a valid cost price (zero or greater).</div>';
            return;
        }


        confirmRestockButton.disabled = true;
        confirmRestockButton.textContent = "Processing...";

        try {
            const response = await fetch(
                `/api/products/restock/${productId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "same-origin",
                    body: JSON.stringify({
                        quantity: quantity,
                        cost_price: costPrice
                    })
                }
            );

            const result = await response.json();

            if (response.ok) {

                message.innerHTML = `
                    <div class="alert alert-success">
                        ${result.message || "Stock restocked successfully."}
                        <br>
                        New stock: ${result.new_stock}
                        <br>
                        Total cost: ₹${result.total_cost}
                    </div>
                `;

                await loadProducts();

                const modalElement =
                    document.getElementById("restockModal");

                bootstrap.Modal.getOrCreateInstance(modalElement).hide();

            } else {
                message.innerHTML = `
                    <div class="alert alert-danger">
                        ${result.message || "Could not restock this product."}
                    </div>
                `;
            }

        } catch (error) {
            message.innerHTML =
                '<div class="alert alert-danger">Could not connect to server.</div>';

        } finally {
            confirmRestockButton.disabled = false;
            confirmRestockButton.textContent = "Confirm Restock";
        }
    });
}


// =====================================
// DELETE PRODUCT
// =====================================

async function deleteProduct(productId) {

    if (!confirm("Are you sure you want to delete this product?")) {
        return;
    }

    try {
        const response = await fetch(
            `/api/products/delete/${productId}`,
            {
                method: "DELETE"
            }
        );

        const result = await response.json();

        alert(result.message);

        if (response.ok) {
            loadProducts();
        }

    } catch (error) {
        alert("Could not connect to server.");
    }
}


// Automatically load products when page opens
if (document.getElementById("productTable")) {
    loadProducts();
}


// =====================================
// BILLING MANAGEMENT
// =====================================

let billItems = [];
let availableProducts = [];


// Load products into dropdown
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


// =====================================
// ADD PRODUCT TO BILL
// =====================================

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


// =====================================
// DISPLAY BILL ITEMS
// =====================================

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


// =====================================
// REMOVE PRODUCT FROM BILL
// =====================================

function removeBillItem(index) {
    billItems.splice(index, 1);
    displayBillItems();
}


// =====================================
// PURCHASE REWARD COUPONS
// =====================================

// Load the selected customer's available coupons.
async function loadCustomerCoupons() {

    const customerId = document.getElementById("customerId").value.trim();
    const couponSelect = document.getElementById("couponCode");
    const message = document.getElementById("couponMessage");

    if (!customerId || !Number.isInteger(Number(customerId)) || Number(customerId) <= 0) {
        message.textContent = "Enter a valid customer ID first.";
        couponSelect.innerHTML = '<option value="">Do not apply a coupon</option>';
        return;
    }

    message.textContent = "Loading available coupons...";
    couponSelect.disabled = true;

    try {
        const response = await fetch(
            `/api/billing/coupons/${encodeURIComponent(customerId)}`,
            {
                method: "GET",
                credentials: "same-origin"
            }
        );

        const result = await response.json();

        couponSelect.innerHTML = '<option value="">Do not apply a coupon</option>';

        if (!response.ok) {
            message.textContent = result.message || "Could not load coupons.";
            return;
        }

        if (!result.coupons || result.coupons.length === 0) {
            message.textContent = "This customer has no available reward coupons.";
            return;
        }

        result.coupons.forEach(coupon => {
            const option = document.createElement("option");
            option.value = coupon.coupon_code;
            option.textContent =
                `${coupon.coupon_code} - ₹${coupon.discount_amount} off (₹${coupon.threshold_amount} spending milestone)`;
            couponSelect.appendChild(option);
        });

        message.textContent =
            `${result.coupons.length} available reward coupon(s) found.`;

    } catch (error) {
        message.textContent = "Could not connect to the server.";
    } finally {
        couponSelect.disabled = false;
    }
}


// Clear previously loaded coupons whenever the customer ID changes.
const billingCustomerInput = document.getElementById("customerId");

if (billingCustomerInput) {
    billingCustomerInput.addEventListener("input", function() {
        const couponSelect = document.getElementById("couponCode");
        const couponMessage = document.getElementById("couponMessage");

        if (couponSelect) {
            couponSelect.innerHTML =
                '<option value="">Do not apply a coupon</option>';
        }

        if (couponMessage) {
            couponMessage.textContent =
                "Customer ID changed. Load coupons again.";
        }
    });
}


// =====================================
// GENERATE BILL
// =====================================

async function createBill() {

    if (billItems.length === 0) {
        alert("Please add at least one product.");
        return;
    }

    const customerValue =
        document.getElementById("customerId").value.trim();

    const selectedCoupon =
        document.getElementById("couponCode").value;

    const billData = {
        customer_id: customerValue === ""
            ? null
            : Number(customerValue),

        coupon_code: selectedCoupon || null,

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

            const newlyIssuedRewards = (result.new_reward_coupons || []).map(coupon => `
                <li>${coupon.coupon_code} - ₹${coupon.discount_amount} coupon (₹${coupon.threshold_amount} spending milestone)</li>
            `).join("");

            message.innerHTML = `
                <div class="alert alert-success">
                    <strong>Bill created successfully!</strong><br>
                    Sale ID: ${result.sale_id}<br>
                    Subtotal: ₹${result.subtotal_amount}<br>
                    Membership: ${result.membership_type || "None"}<br>
                    Membership discount: ₹${result.membership_discount}<br>
                    Coupon discount: ₹${result.coupon_discount}<br>
                    Total discount: ₹${result.discount_amount}<br>
                    <strong>Final amount: ₹${result.total_amount}</strong>
                    ${result.redeemed_coupon ? `<br>Coupon redeemed: ${result.redeemed_coupon}` : ""}
                    ${newlyIssuedRewards ? `<hr><strong>New reward coupon(s) issued:</strong><ul class="mb-0">${newlyIssuedRewards}</ul>` : ""}
                </div>
            `;

            billItems = [];

            displayBillItems();

            document.getElementById("customerId").value = "";
            document.getElementById("couponCode").innerHTML =
                '<option value="">Do not apply a coupon</option>';
            document.getElementById("couponMessage").textContent =
                "₹200 reward at ₹5,000 spending and ₹500 reward at ₹10,000 spending.";

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


// =====================================
// CUSTOMER MANAGEMENT
// =====================================

// Store customer details for editing
let customerCache = {};


// Load all customers
async function loadCustomers() {
    const table = document.getElementById("customerTable");

    if (!table) return;

    try {
        const response = await fetch("/api/customers/all");
        const result = await response.json();

        if (!response.ok) {
            document.getElementById("customerTableMessage").textContent =
                result.message;
            return;
        }

        displayCustomers(result.customers);

    } catch (error) {
        document.getElementById("customerTableMessage").textContent =
            "Could not load customers.";
    }
}


// Add new customer
const customerForm = document.getElementById("customerForm");

if (customerForm) {
    customerForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const customerData = {
            customer_name: document.getElementById("customerName").value.trim(),
            phone: document.getElementById("customerPhone").value.trim(),
            email: document.getElementById("customerEmail").value.trim()
        };

        try {
            const response = await fetch("/api/customers/add", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(customerData)
            });

            const result = await response.json();

            const message = document.getElementById("customerMessage");

            if (response.ok) {
                message.innerHTML =
                    `<div class="alert alert-success">${result.message}</div>`;

                customerForm.reset();
                loadCustomers();

            } else {
                message.innerHTML =
                    `<div class="alert alert-danger">${result.message}</div>`;
            }

        } catch (error) {
            document.getElementById("customerMessage").textContent =
                "Could not connect to server.";
        }
    });
}


// Display customers in table
function displayCustomers(customers) {
    const table = document.getElementById("customerTable");

    table.innerHTML = "";

    // Store customer details
    customerCache = {};

    customers.forEach(customer => {
        customerCache[customer.customer_id] = customer;

        table.innerHTML += `
            <tr>
                <td>${customer.customer_id}</td>
                <td>${customer.customer_name}</td>
                <td>${customer.phone || "-"}</td>
                <td>${customer.email || "-"}</td>
                <td>
                    <button class="btn btn-warning btn-sm me-1"
                        onclick="editCustomer(${customer.customer_id})">
                        Edit
                    </button>

                    <button class="btn btn-danger btn-sm"
                        onclick="deleteCustomer(${customer.customer_id})">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });

    document.getElementById("customerTableMessage").textContent =
        customers.length === 0 ? "No customers found." : "";
}


// Search customers
async function searchCustomers() {
    const keyword =
        document.getElementById("customerSearch").value;

    try {
        const response = await fetch(
            `/api/customers/search?keyword=${encodeURIComponent(keyword)}`
        );

        const result = await response.json();

        if (!response.ok) {
            document.getElementById("customerTableMessage").textContent =
                result.message;
            return;
        }

        displayCustomers(result.customers);

    } catch (error) {
        document.getElementById("customerTableMessage").textContent =
            "Could not search customers.";
    }
}


// Open Edit Customer modal
function editCustomer(customerId) {
    const customer = customerCache[customerId];

    if (!customer) {
        alert("Customer details not found.");
        return;
    }

    document.getElementById("editCustomerId").value =
        customer.customer_id;

    document.getElementById("editCustomerName").value =
        customer.customer_name;

    document.getElementById("editCustomerPhone").value =
        customer.phone || "";

    document.getElementById("editCustomerEmail").value =
        customer.email || "";

    document.getElementById("editCustomerMessage").innerHTML = "";

    const modalElement =
        document.getElementById("editCustomerModal");

    bootstrap.Modal.getOrCreateInstance(modalElement).show();
}


// Update customer details
async function updateCustomer() {
    const customerId =
        document.getElementById("editCustomerId").value;

    const customerData = {
        customer_name:
            document.getElementById("editCustomerName").value.trim(),

        phone:
            document.getElementById("editCustomerPhone").value.trim(),

        email:
            document.getElementById("editCustomerEmail").value.trim()
    };

    const message =
        document.getElementById("editCustomerMessage");

    if (!customerData.customer_name) {
        message.innerHTML =
            '<div class="alert alert-danger">Customer name is required.</div>';
        return;
    }

    try {
        const response = await fetch(
            `/api/customers/update/${customerId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(customerData)
            }
        );

        const result = await response.json();

        if (response.ok) {
            message.innerHTML =
                `<div class="alert alert-success">${result.message}</div>`;

            await loadCustomers();

            setTimeout(() => {
                bootstrap.Modal.getOrCreateInstance(
                    document.getElementById("editCustomerModal")
                ).hide();
            }, 700);

        } else {
            message.innerHTML =
                `<div class="alert alert-danger">${result.message}</div>`;
        }

    } catch (error) {
        message.innerHTML =
            '<div class="alert alert-danger">Could not connect to server.</div>';
    }
}


// Delete customer
async function deleteCustomer(customerId) {
    if (!confirm("Are you sure you want to delete this customer?")) {
        return;
    }

    try {
        const response = await fetch(
            `/api/customers/delete/${customerId}`,
            {
                method: "DELETE"
            }
        );

        const result = await response.json();

        alert(result.message);

        if (response.ok) {
            loadCustomers();
        }

    } catch (error) {
        alert("Could not connect to server.");
    }
}


// Automatically load customers when page opens
if (document.getElementById("customerTable")) {
    loadCustomers();
}


// =====================================
// PURCHASE MANAGEMENT
// =====================================

async function loadPurchases() {
    const table = document.getElementById("purchaseTable");

    // Run this function only on the Purchases page
    if (!table) return;

    const message = document.getElementById("purchaseMessage");

    try {
        const response = await fetch("/api/purchases/all");
        const result = await response.json();

        if (!response.ok) {
            message.textContent =
                result.message || "Could not load purchases.";
            return;
        }

        table.innerHTML = "";

        result.purchases.forEach(purchase => {
            table.innerHTML += `
                <tr>
                    <td>${purchase.purchase_id}</td>
                    <td>${purchase.product_name}</td>
                    <td>${purchase.sku}</td>
                    <td>${purchase.quantity}</td>
                    <td>₹${Number(purchase.cost_price).toFixed(2)}</td>
                    <td>₹${Number(purchase.total_cost).toFixed(2)}</td>
                    <td>${purchase.username}</td>
                    <td>${purchase.purchase_date}</td>
                </tr>
            `;
        });

        message.textContent =
            result.purchases.length === 0
                ? "No purchase records found."
                : "";

    } catch (error) {
        message.textContent = "Could not connect to server.";
    }
}

// Load purchases when the Purchases page opens
if (document.getElementById("purchaseTable")) {
    loadPurchases();
}



// =====================================
// MEMBERSHIP MANAGEMENT
// =====================================

// Load all membership records
async function loadMemberships() {
    const table = document.getElementById("membershipTable");

    if (!table) return;

    const message = document.getElementById("membershipTableMessage");

    try {
        const response = await fetch("/api/members/all");
        const result = await response.json();

        if (!response.ok) {
            message.textContent = result.message || "Could not load memberships.";
            return;
        }

        table.innerHTML = "";

        result.memberships.forEach(member => {
            table.innerHTML += `
                <tr>
                    <td>${member.membership_id}</td>
                    <td>${member.customer_id}</td>
                    <td>${member.membership_type}</td>
                    <td>${member.start_date}</td>
                    <td>${member.end_date || "-"}</td>
                    <td>${member.status}</td>

                    <td>
                        <button class="btn btn-warning btn-sm me-1"
                            onclick="editMembership(${member.membership_id})">
                            Edit
                        </button>

                        <button class="btn btn-danger btn-sm"
                            onclick="deleteMembership(${member.membership_id})">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        });

        message.textContent =
            result.memberships.length === 0
                ? "No membership records found."
                : "";

    } catch (error) {
        message.textContent = "Could not connect to server.";
    }
}


// Register a new membership
const membershipForm = document.getElementById("membershipForm");

if (membershipForm) {
    membershipForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const membershipData = {
            customer_id: Number(
                document.getElementById("membershipCustomerId").value
            ),
            membership_type:
                document.getElementById("membershipType").value,
            start_date:
                document.getElementById("membershipStartDate").value,
            end_date:
                document.getElementById("membershipEndDate").value || null
        };

        try {
            const response = await fetch("/api/members/add", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(membershipData)
            });

            const result = await response.json();

            const message = document.getElementById("membershipMessage");

            if (response.ok) {
                message.innerHTML = `
                    <div class="alert alert-success">
                        ${result.message}
                    </div>
                `;

                membershipForm.reset();
                await loadMemberships();

            } else {
                message.innerHTML = `
                    <div class="alert alert-danger">
                        ${result.message}
                    </div>
                `;
            }

        } catch (error) {
            document.getElementById("membershipMessage").textContent =
                "Could not connect to server.";
        }
    });
}


// Load memberships when the page opens
if (document.getElementById("membershipTable")) {
    loadMemberships();
}


// =====================================
// EDIT MEMBERSHIP
// =====================================

async function editMembership(membershipId) {

    // Get the selected membership from the API
    try {
        const response = await fetch("/api/members/all");
        const result = await response.json();

        if (!response.ok) {
            alert(result.message || "Could not load membership details.");
            return;
        }

        const member = result.memberships.find(
            item => item.membership_id === membershipId
        );

        if (!member) {
            alert("Membership not found.");
            return;
        }

        // Fill the modal with existing membership details
        document.getElementById("editMembershipId").value =
            member.membership_id;

        document.getElementById("editMembershipType").value =
            member.membership_type;

        document.getElementById("editMembershipStartDate").value =
            String(member.start_date).substring(0, 10);

        document.getElementById("editMembershipEndDate").value =
            member.end_date
                ? String(member.end_date).substring(0, 10)
                : "";

        document.getElementById("editMembershipStatus").value =
            member.status;

        document.getElementById("editMembershipMessage").textContent = "";

        // Open Bootstrap modal
        const modal = new bootstrap.Modal(
            document.getElementById("editMembershipModal")
        );

        modal.show();

    } catch (error) {
        alert("Could not connect to server.");
    }
}

// =====================================
// UPDATE MEMBERSHIP
// =====================================

async function updateMembership() {

    const membershipId =
        document.getElementById("editMembershipId").value;

    const membershipData = {
        membership_type:
            document.getElementById("editMembershipType").value,

        start_date:
            document.getElementById("editMembershipStartDate").value,

        end_date:
            document.getElementById("editMembershipEndDate").value || null,

        status:
            document.getElementById("editMembershipStatus").value
    };

    const message =
        document.getElementById("editMembershipMessage");

    try {
        const response = await fetch(
            `/api/members/update/${membershipId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(membershipData)
            }
        );

        const result = await response.json();

        if (response.ok) {

            message.innerHTML = `
                <div class="alert alert-success">
                    ${result.message}
                </div>
            `;

            await loadMemberships();

            setTimeout(() => {
                const modalElement =
                    document.getElementById("editMembershipModal");

                bootstrap.Modal.getInstance(modalElement).hide();
            }, 1000);

        } else {
            message.innerHTML = `
                <div class="alert alert-danger">
                    ${result.message}
                </div>
            `;
        }

    } catch (error) {
        message.textContent = "Could not connect to server.";
    }
}

// =====================================
// DELETE MEMBERSHIP
// =====================================

async function deleteMembership(membershipId) {

    // Ask for confirmation before deleting
    if (!confirm("Are you sure you want to delete this membership?")) {
        return;
    }

    try {
        const response = await fetch(
            `/api/members/delete/${membershipId}`,
            {
                method: "DELETE"
            }
        );

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            await loadMemberships();
        } else {
            alert(result.message || "Could not delete membership.");
        }

    } catch (error) {
        alert("Could not connect to server.");
    }
}



// =====================================
// DAILY SALES REPORT
// =====================================

async function loadDailyReport() {

    const selectedDate =
        document.getElementById("dailyReportDate").value;

    const resultDiv =
        document.getElementById("dailyReportResult");

    if (!selectedDate) {
        resultDiv.innerHTML =
            '<div class="alert alert-warning">Please select a date.</div>';
        return;
    }

    try {

        const response = await fetch(
            `/api/reports/daily?date=${encodeURIComponent(selectedDate)}`
        );

        const result = await response.json();

        if (!response.ok) {
            resultDiv.innerHTML =
                `<div class="alert alert-danger">${result.message}</div>`;
            return;
        }

        let rows = "";

        let totalProductSales = 0;

        result.products.forEach(product => {

            const salesPrice = Number(product.total_sales_price);
            const productCost = Number(product.total_cost);
            const profit = Number(product.total_profit);

            totalProductSales += salesPrice;

            const profitClass = profit >= 0
                ? "text-success"
                : "text-danger";

            rows += `
                <tr>
                    <td>${product.product_name}</td>
                    <td>${product.sku}</td>
                    <td>${product.total_quantity_sold}</td>
                    <td>₹${salesPrice.toFixed(2)}</td>
                    <td>₹${productCost.toFixed(2)}</td>
                    <td class="${profitClass}">
                        <strong>₹${profit.toFixed(2)}</strong>
                    </td>
                </tr>
            `;
        });

        const totalRevenue = Number(result.total_revenue);
        const totalCost = Number(result.total_cost);
        const totalProfit = Number(result.total_profit);

        const overallProfitClass = totalProfit >= 0
            ? "text-success"
            : "text-danger";

        resultDiv.innerHTML = `

            <h6 class="mt-3">
                Report Date: ${result.date}
            </h6>

            <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3 mb-4">

                <div class="col">
                    <div class="alert alert-info mb-0">
                        Total Bills:
                        <strong>${result.total_bills}</strong>
                    </div>
                </div>

                <div class="col">
                    <div class="alert alert-success mb-0">
                        Total Revenue:
                        <strong>₹${totalRevenue.toFixed(2)}</strong>
                    </div>
                </div>

                <div class="col">
                    <div class="alert alert-primary mb-0">
                        Total Product Sales:
                        <strong>₹${totalProductSales.toFixed(2)}</strong>
                    </div>
                </div>

                <div class="col">
                    <div class="alert alert-warning mb-0">
                        Total Cost:
                        <strong>₹${totalCost.toFixed(2)}</strong>
                    </div>
                </div>

                <div class="col">
                    <div class="alert alert-light border mb-0">
                        Estimated Profit:
                        <strong class="${overallProfitClass}">
                            ₹${totalProfit.toFixed(2)}
                        </strong>
                    </div>
                </div>

            </div>

            <h6>Products Sold and Profit Details</h6>

            <div class="table-responsive">

                <table class="table table-bordered table-striped">

                    <thead>
                        <tr>
                            <th>Product Name</th>
                            <th>SKU</th>
                            <th>Quantity Sold</th>
                            <th>Total Sales Price</th>
                            <th>Total Cost</th>
                            <th>Estimated Profit</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${rows || `
                            <tr>
                                <td colspan="6" class="text-center">
                                    No products sold on this date.
                                </td>
                            </tr>
                        `}

                    </tbody>

                </table>

            </div>

            <small class="text-muted">
                Profit is estimated using the current product cost price
                and includes allocated membership and coupon discounts.
            </small>
        `;

    } catch (error) {

        resultDiv.innerHTML =
            '<div class="alert alert-danger">Could not connect to server.</div>';

    }
}



// =====================================
// MONTHLY SALES REPORT
// =====================================

async function loadMonthlyReport() {

    const selectedMonth =
        document.getElementById("monthlyReportDate").value;

    const resultDiv =
        document.getElementById("monthlyReportResult");

    if (!selectedMonth) {
        resultDiv.innerHTML =
            '<div class="alert alert-warning">Please select a month.</div>';
        return;
    }

    try {

        const response = await fetch(
            `/api/reports/monthly?month=${encodeURIComponent(selectedMonth)}`
        );

        const result = await response.json();

        if (!response.ok) {
            resultDiv.innerHTML =
                `<div class="alert alert-danger">${result.message}</div>`;
            return;
        }

        let rows = "";

        let totalProductSales = 0;

        result.products.forEach(product => {

            const salesPrice = Number(product.total_sales_price);
            const productCost = Number(product.total_cost);
            const profit = Number(product.total_profit);

            totalProductSales += salesPrice;

            const profitClass = profit >= 0
                ? "text-success"
                : "text-danger";

            rows += `
                <tr>
                    <td>${product.product_name}</td>
                    <td>${product.sku}</td>
                    <td>${product.total_quantity_sold}</td>
                    <td>₹${salesPrice.toFixed(2)}</td>
                    <td>₹${productCost.toFixed(2)}</td>
                    <td class="${profitClass}">
                        <strong>₹${profit.toFixed(2)}</strong>
                    </td>
                </tr>
            `;
        });

        const totalRevenue = Number(result.total_revenue);
        const totalCost = Number(result.total_cost);
        const totalProfit = Number(result.total_profit);

        const overallProfitClass = totalProfit >= 0
            ? "text-success"
            : "text-danger";

        resultDiv.innerHTML = `

            <h6 class="mt-3">
                Report Month: ${result.month}
            </h6>

            <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3 mb-4">

                <div class="col">
                    <div class="alert alert-info mb-0">
                        Total Bills:
                        <strong>${result.total_bills}</strong>
                    </div>
                </div>

                <div class="col">
                    <div class="alert alert-success mb-0">
                        Total Revenue:
                        <strong>₹${totalRevenue.toFixed(2)}</strong>
                    </div>
                </div>

                <div class="col">
                    <div class="alert alert-primary mb-0">
                        Total Product Sales:
                        <strong>₹${totalProductSales.toFixed(2)}</strong>
                    </div>
                </div>

                <div class="col">
                    <div class="alert alert-warning mb-0">
                        Total Cost:
                        <strong>₹${totalCost.toFixed(2)}</strong>
                    </div>
                </div>

                <div class="col">
                    <div class="alert alert-light border mb-0">
                        Estimated Profit:
                        <strong class="${overallProfitClass}">
                            ₹${totalProfit.toFixed(2)}
                        </strong>
                    </div>
                </div>

            </div>

            <h6>Monthly Products Sold and Profit Details</h6>

            <div class="table-responsive">

                <table class="table table-bordered table-striped">

                    <thead>
                        <tr>
                            <th>Product Name</th>
                            <th>SKU</th>
                            <th>Quantity Sold</th>
                            <th>Total Sales Price</th>
                            <th>Total Cost</th>
                            <th>Estimated Profit</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${rows || `
                            <tr>
                                <td colspan="6" class="text-center">
                                    No products sold during this month.
                                </td>
                            </tr>
                        `}

                    </tbody>

                </table>

            </div>

            <small class="text-muted">
                Profit is estimated using the current product cost price
                and includes allocated membership and coupon discounts.
            </small>

        `;

    } catch (error) {

        resultDiv.innerHTML =
            '<div class="alert alert-danger">Could not connect to server.</div>';

    }
}


// =====================================
// TOP-SELLING PRODUCTS REPORT
// =====================================

async function loadTopProducts() {

    const limit = document.getElementById("topProductLimit").value;
    const resultDiv = document.getElementById("topProductsResult");

    if (!limit || Number(limit) < 1 || Number(limit) > 100 ||
        !Number.isInteger(Number(limit))) {

        resultDiv.innerHTML =
            '<div class="alert alert-warning">Enter a number between 1 and 100.</div>';
        return;
    }

    try {

        const response = await fetch(
            `/api/reports/top-products?limit=${encodeURIComponent(limit)}`
        );

        const result = await response.json();

        if (!response.ok) {
            resultDiv.innerHTML =
                `<div class="alert alert-danger">${result.message}</div>`;
            return;
        }

        let rows = "";

        result.products.forEach((product, index) => {

            rows += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${product.product_name}</td>
                    <td>${product.sku}</td>
                    <td>${product.total_quantity_sold}</td>
                    <td>₹${product.total_revenue}</td>
                </tr>
            `;

        });

        resultDiv.innerHTML = `
            <h6 class="mt-3">Top ${limit} Selling Products</h6>

            <div class="table-responsive">
                <table class="table table-bordered table-striped">

                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Product Name</th>
                            <th>SKU</th>
                            <th>Quantity Sold</th>
                            <th>Total Revenue</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${rows || '<tr><td colspan="5" class="text-center">No sales found.</td></tr>'}
                    </tbody>

                </table>
            </div>
        `;

    } catch (error) {

        resultDiv.innerHTML =
            '<div class="alert alert-danger">Could not connect to server.</div>';

    }
}
// =====================================
// ADMIN: CREATE CASHIER ACCOUNT
// =====================================

const cashierForm = document.getElementById("cashierForm");

if (cashierForm) {

    cashierForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const username = document
            .getElementById("cashierUsername").value.trim();

        const password = document
            .getElementById("cashierPassword").value;

        const message = document
            .getElementById("cashierMessage");

        const submitButton = cashierForm.querySelector(
            'button[type="submit"]'
        );

        // Validate username
        if (username.length < 3 || username.length > 50) {
            message.textContent =
                "Username must be between 3 and 50 characters.";
            message.className = "mt-3 alert alert-danger";
            return;
        }

        // Validate password
        if (password.length < 8) {
            message.textContent =
                "Password must contain at least 8 characters.";
            message.className = "mt-3 alert alert-danger";
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Creating...";

        try {

            const response = await fetch("/api/auth/cashiers", {
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

                message.textContent =
                    result.message + " Username: " + result.username;

                message.className = "mt-3 alert alert-success";

                cashierForm.reset();

            } else {

                message.textContent =
                    result.message || "Could not create cashier account.";

                message.className = "mt-3 alert alert-danger";
            }

        } catch (error) {

            message.textContent =
                "Could not connect to server.";

            message.className = "mt-3 alert alert-danger";

        } finally {

            submitButton.disabled = false;
            submitButton.textContent = "Create Cashier";
        }
    });
}

// =====================================
// SALES BOOK MANAGEMENT
// =====================================

// Escape database values before displaying them in HTML.
function escapeSalesBookHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


// Load sales between selected dates
async function loadSalesBook() {

    const fromDate =
        document.getElementById("salesBookFromDate").value;

    const toDate =
        document.getElementById("salesBookToDate").value;

    const table =
        document.getElementById("salesBookTable");

    const message =
        document.getElementById("salesBookMessage");

    const detailsPanel =
        document.getElementById("salesBookDetailsPanel");

    if (!fromDate || !toDate) {
        message.innerHTML =
            '<div class="alert alert-warning">Please select both dates.</div>';
        return;
    }

    if (fromDate > toDate) {
        message.innerHTML =
            '<div class="alert alert-warning">From Date cannot be after To Date.</div>';
        return;
    }

    message.textContent = "Loading sales...";

    table.innerHTML = `
        <tr>
            <td colspan="5" class="text-center">Loading sales...</td>
        </tr>
    `;

    detailsPanel.style.display = "none";

    try {

        const response = await fetch(
            `/api/billing/book?from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`,
            {
                credentials: "same-origin"
            }
        );

        const result = await response.json();

        if (!response.ok) {
            message.innerHTML = `
                <div class="alert alert-danger">
                    ${escapeSalesBookHTML(result.message)}
                </div>
            `;
            table.innerHTML = "";
            return;
        }

        // Calculate the combined final bill amount.
        const totalAmount = result.sales.reduce(
            (total, sale) => total + Number(sale.total_amount),
            0
        );

        document.getElementById("salesBookTotalBills").textContent =
            result.total_bills;

        document.getElementById("salesBookTotalAmount").textContent =
            "₹" + totalAmount.toFixed(2);

        table.innerHTML = "";

        if (result.sales.length === 0) {

            table.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        No sales found for the selected date range.
                    </td>
                </tr>
            `;

        } else {

            result.sales.forEach(sale => {

                const row = document.createElement("tr");
                row.className = "sales-book-row";
                row.style.cursor = "pointer";
                row.tabIndex = 0;
                row.setAttribute("role", "button");
                row.setAttribute(
                    "aria-label",
                    `View bill ${sale.sale_id}`
                );

                row.innerHTML = `
                    <td>#${escapeSalesBookHTML(sale.sale_id)}</td>

                    <td>
                        ${escapeSalesBookHTML(
                            sale.customer_name || "Walk-in Customer"
                        )}
                    </td>

                    <td>
                        <strong>
                            ₹${Number(sale.total_amount).toFixed(2)}
                        </strong>
                    </td>

                    <td>
                        ${escapeSalesBookHTML(sale.sale_date)}
                    </td>

                    <td>
                        <button class="btn btn-sm btn-outline-primary"
                                type="button">
                            View Bill
                        </button>
                    </td>
                `;

                row.addEventListener("click", function() {
                    openSalesBookBill(sale.sale_id, row);
                });

                row.addEventListener("keydown", function(event) {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openSalesBookBill(sale.sale_id, row);
                    }
                });

                table.appendChild(row);
            });
        }

        message.innerHTML = `
            <div class="alert alert-success">
                Sales loaded successfully.
                Showing ${result.total_bills} bill(s).
            </div>
        `;

    } catch (error) {

        message.innerHTML = `
            <div class="alert alert-danger">
                Could not connect to the server.
            </div>
        `;
    }
}


// =====================================
// VIEW SELECTED BILL DETAILS
// =====================================

async function openSalesBookBill(saleId, selectedRow) {

    const detailsPanel =
        document.getElementById("salesBookDetailsPanel");

    const itemsTable =
        document.getElementById("salesBookItemsTable");

    const detailsMessage =
        document.getElementById("salesBookDetailsMessage");

    // Highlight the selected bill.
    document.querySelectorAll(".sales-book-row").forEach(row => {
        row.classList.remove("table-primary");
    });

    if (selectedRow) {
        selectedRow.classList.add("table-primary");
    }

    detailsPanel.style.display = "block";

    document.getElementById("detailSaleId").textContent =
        "#" + saleId;

    document.getElementById("detailCustomerName").textContent =
        "Loading...";

    document.getElementById("detailBillAmount").textContent =
        "Loading...";

    itemsTable.innerHTML = `
        <tr>
            <td colspan="5" class="text-center">
                Loading bill details...
            </td>
        </tr>
    `;

    detailsMessage.textContent = "";

    try {

        const response = await fetch(
            `/api/billing/${saleId}`,
            {
                credentials: "same-origin"
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Could not retrieve bill details."
            );
        }

        const bill = result.bill;

        document.getElementById("detailSaleId").textContent =
            "#" + bill.sale_id;

        document.getElementById("detailCustomerName").textContent =
            bill.customer_name || "Walk-in Customer";

        document.getElementById("detailBillAmount").textContent =
            "₹" + Number(bill.total_amount).toFixed(2);

        itemsTable.innerHTML = "";

        if (!bill.items || bill.items.length === 0) {

            itemsTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        No products found in this bill.
                    </td>
                </tr>
            `;

        } else {

            bill.items.forEach(item => {

                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>
                        ${escapeSalesBookHTML(item.product_name)}
                    </td>

                    <td>
                        ${escapeSalesBookHTML(item.sku)}
                    </td>

                    <td>
                        ${item.quantity}
                    </td>

                    <td>
                        ₹${Number(item.unit_price).toFixed(2)}
                    </td>

                    <td>
                        ₹${Number(item.subtotal).toFixed(2)}
                    </td>
                `;

                itemsTable.appendChild(row);
            });
        }

        detailsMessage.innerHTML = `
            <div class="alert alert-success mt-3">
                Bill details loaded successfully.
            </div>
        `;

        detailsPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {

        itemsTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    Could not load bill details.
                </td>
            </tr>
        `;

        detailsMessage.innerHTML = `
            <div class="alert alert-danger">
                ${escapeSalesBookHTML(error.message)}
            </div>
        `;
    }
}
