
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
// GENERATE BILL
// =====================================

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

    const selectedDate = document.getElementById("dailyReportDate").value;
    const resultDiv = document.getElementById("dailyReportResult");

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

        result.sales.forEach(sale => {

            rows += `
                <tr>
                    <td>${sale.sale_id}</td>
                    <td>${sale.customer_name || "Walk-in Customer"}</td>
                    <td>₹${sale.total_amount}</td>
                    <td>${new Date(sale.sale_date).toLocaleString()}</td>
                </tr>
            `;

        });

        resultDiv.innerHTML = `
            <h6 class="mt-3">Report Date: ${result.date}</h6>

            <div class="row mb-3">
                <div class="col-md-6">
                    <div class="alert alert-info">
                        Total Bills: <strong>${result.total_bills}</strong>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="alert alert-success">
                        Total Revenue: <strong>₹${result.total_revenue}</strong>
                    </div>
                </div>
            </div>

            <h6>Sales Details</h6>

            <div class="table-responsive">
                <table class="table table-bordered table-striped">
                    <thead>
                        <tr>
                            <th>Sale ID</th>
                            <th>Customer</th>
                            <th>Amount</th>
                            <th>Date & Time</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${rows || '<tr><td colspan="4" class="text-center">No sales found.</td></tr>'}
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
// MONTHLY SALES REPORT
// =====================================

async function loadMonthlyReport() {

    const selectedMonth = document.getElementById("monthlyReportDate").value;
    const resultDiv = document.getElementById("monthlyReportResult");

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

        result.sales.forEach(sale => {

            rows += `
                <tr>
                    <td>${sale.sale_id}</td>
                    <td>${sale.customer_name || "Walk-in Customer"}</td>
                    <td>₹${sale.total_amount}</td>
                    <td>${new Date(sale.sale_date).toLocaleString()}</td>
                </tr>
            `;

        });

        resultDiv.innerHTML = `
            <h6 class="mt-3">Report Month: ${result.month}</h6>

            <div class="row mb-3">

                <div class="col-md-6">
                    <div class="alert alert-info">
                        Total Bills: <strong>${result.total_bills}</strong>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="alert alert-success">
                        Total Revenue: <strong>₹${result.total_revenue}</strong>
                    </div>
                </div>

            </div>

            <h6>Sales Details</h6>

            <div class="table-responsive">
                <table class="table table-bordered table-striped">

                    <thead>
                        <tr>
                            <th>Sale ID</th>
                            <th>Customer</th>
                            <th>Amount</th>
                            <th>Date & Time</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${rows || '<tr><td colspan="4" class="text-center">No sales found.</td></tr>'}
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
