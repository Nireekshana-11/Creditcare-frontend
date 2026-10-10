const API = "http://localhost:8081/api";
const CUSTOMER_API = `${API}/customers`;
const APPLICATION_API = `${API}/applications`;

let adminAuthorization = "";

// HTML helpers
function byId(id) {
    return document.getElementById(id);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function showMessage(message, isError = false) {
    const element = byId("message");
    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? "red" : "green";
}

function showAdminMessage(message, isError = false) {
    const element = byId("adminMessage");
    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? "red" : "green";
}

async function requestError(response) {
    const details = await response.text();
    return `${response.status} ${response.statusText}: ${details}`;
}

// Register customer
byId("customerForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const customer = {
        fullName: byId("fullName").value.trim(),
        email: byId("email").value.trim(),
        phone: byId("phone").value.trim()
    };

    try {
        const response = await fetch(CUSTOMER_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(customer)
        });

        if (!response.ok) throw new Error(await requestError(response));

        const saved = await response.json();
        showMessage(`Customer registered! Customer ID: ${saved.id}`);
        byId("customerForm").reset();
    } catch (error) {
        showMessage(error.message, true);
    }
});

// Submit credit application
byId("applicationForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const customerId = byId("customerId").value;

    const application = {
        requestedAmount: Number(byId("requestedAmount").value),
        annualIncome: Number(byId("annualIncome").value),
        purpose: byId("purpose").value
    };

    try {
        const response = await fetch(
            `${APPLICATION_API}?customerId=${encodeURIComponent(customerId)}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(application)
            }
        );

        if (!response.ok) throw new Error(await requestError(response));

        const saved = await response.json();
        showMessage(`Application submitted! Application ID: ${saved.id}`);
        byId("applicationForm").reset();
    } catch (error) {
        showMessage(error.message, true);
    }
});

// Display customer table
function renderCustomers(customers) {
    if (!customers.length) return "<p>No customers found.</p>";

    return `
        <table>
            <thead>
                <tr>
                    <th>ID</th><th>Name</th><th>Email</th><th>Phone</th>
                </tr>
            </thead>
            <tbody>
                ${customers.map(c => `
                    <tr>
                        <td>${escapeHTML(c.id)}</td>
                        <td>${escapeHTML(c.fullName)}</td>
                        <td>${escapeHTML(c.email)}</td>
                        <td>${escapeHTML(c.phone)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>`;
}

// Display application table, with optional admin actions
function renderApplications(applications, showActions = false) {
    if (!applications.length) {
        return "<p>No applications found.</p>";
    }

    return `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Email</th>
                    <th>Amount</th>
                    <th>Annual Income</th>
                    <th>Purpose</th>
                    <th>Status</th>
                    ${showActions ? "<th>Admin Actions</th>" : ""}
                </tr>
            </thead>
            <tbody>
                ${applications.map(app => {
                    const pending =
                        String(app.status).toUpperCase() === "PENDING";

                    return `
                        <tr>
                            <td>${escapeHTML(app.id)}</td>
                            <td>${escapeHTML(app.customer?.fullName)}</td>
                            <td>${escapeHTML(app.customer?.email)}</td>
                            <td>₹${escapeHTML(app.requestedAmount)}</td>
                            <td>₹${escapeHTML(app.annualIncome)}</td>
                            <td>${escapeHTML(app.purpose)}</td>
                            <td>
                                <span class="status ${escapeHTML(
                                    String(app.status).toLowerCase()
                                )}">
                                    ${escapeHTML(app.status)}
                                </span>
                            </td>
                            ${showActions ? `
                                <td class="admin-actions">
                                    ${pending ? `
                                        <button
                                            type="button"
                                            class="approve-btn"
                                            data-id="${Number(app.id)}"
                                            data-status="APPROVED">
                                            Approve
                                        </button>

                                        <button
                                            type="button"
                                            class="reject-btn"
                                            data-id="${Number(app.id)}"
                                            data-status="REJECTED">
                                            Reject
                                        </button>
                                    ` : `<strong>Already ${escapeHTML(app.status)}</strong>`}
                                </td>
                            ` : ""}
                        </tr>`;
                }).join("")}
            </tbody>
        </table>`;
}

// Load customers
async function loadCustomers() {
    byId("customersOutput").textContent = "Loading customers...";

    try {
        const response = await fetch(CUSTOMER_API);
        if (!response.ok) throw new Error(await requestError(response));

        const customers = await response.json();
        byId("customersOutput").innerHTML = renderCustomers(customers);
    } catch (error) {
        byId("customersOutput").textContent = error.message;
    }
}

// Load all applications
async function loadApplications() {
    byId("applicationsOutput").textContent = "Loading applications...";

    try {
        const response = await fetch(APPLICATION_API);
        if (!response.ok) throw new Error(await requestError(response));

        const applications = await response.json();
        byId("applicationsOutput").innerHTML =
            renderApplications(applications, false);
    } catch (error) {
        byId("applicationsOutput").textContent = error.message;
    }
}

// Admin: load applications
async function loadAdminApplications() {
    const output = byId("adminApplicationsOutput");
    output.innerHTML = "<p>Loading applications...</p>";

    showAdminMessage("");

    try {
        const response = await fetch(APPLICATION_API, {
            headers: {
                "Authorization": adminAuthorization
            }
        });

        if (!response.ok) throw new Error(await requestError(response));

        const applications = await response.json();

        output.innerHTML = renderApplications(applications, true);

        showAdminMessage(
            `Loaded ${applications.length} application(s). Pending applications have action buttons.`
        );
    } catch (error) {
        output.textContent = "";
        showAdminMessage(
            `Could not load applications: ${error.message}`,
            true
        );
    }
}

// Admin login form
byId("adminLoginForm").addEventListener("submit", async event => {
    event.preventDefault();

    const username = byId("adminUsername").value.trim();
    const password = byId("adminPassword").value;

    adminAuthorization = "Basic " + btoa(`${username}:${password}`);

    await loadAdminApplications();
});

// Handle Approve/Reject clicks
byId("adminApplicationsOutput").addEventListener("click", async event => {
    const button = event.target.closest("button[data-status]");
    if (!button) return;

    const id = button.dataset.id;
    const status = button.dataset.status;

    const action = status === "APPROVED" ? "approve" : "reject";

    if (!confirm(`Are you sure you want to ${action} application ${id}?`)) {
        return;
    }

    button.disabled = true;
    showAdminMessage(`Updating application ${id}...`);

    try {
        const response = await fetch(
            `${APPLICATION_API}/${id}/status?status=${status}`,
            {
                method: "PATCH",
                headers: {
                    "Authorization": adminAuthorization
                }
            }
        );

        if (!response.ok) throw new Error(await requestError(response));

        showAdminMessage(`Application ${id} successfully marked ${status}.`);

        // Reload table so updated status is shown
        await loadAdminApplications();
    } catch (error) {
        button.disabled = false;
        showAdminMessage(
            `Update failed: ${error.message}. Check your admin credentials and backend security settings.`,
            true
        );
    }
});

// View Records buttons
byId("loadCustomersButton").addEventListener("click", loadCustomers);
byId("loadApplicationsButton").addEventListener("click", loadApplications);
