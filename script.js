// ===== CREDITCARE API =====
const API = "http://localhost:8081/api";

let adminAuth = null;

// ===== COMMON FUNCTIONS =====
const $ = (id) => document.getElementById(id);

function showMessage(id, message, isError = false) {
    const element = $(id);
    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? "#c62828" : "#16804a";
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function money(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "N/A";

    return number.toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    });
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, options);
    const text = await response.text();

    let data = null;

    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
    }

    if (!response.ok) {
        throw new Error(
            typeof data === "string" && data
                ? data
                : `Request failed: HTTP ${response.status}`
        );
    }

    return data;
}

// ===== NOTIFICATIONS =====
const NOTIFICATION_KEY = "creditcareNotifications";

function getNotifications() {
    try {
        const value = JSON.parse(
            localStorage.getItem(NOTIFICATION_KEY) || "[]"
        );

        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function addNotification(message) {
    const notifications = getNotifications();

    notifications.unshift({
        message: message,
        time: new Date().toLocaleString()
    });

    localStorage.setItem(
        NOTIFICATION_KEY,
        JSON.stringify(notifications.slice(0, 50))
    );

    renderNotifications();
}

function renderNotifications() {
    const output = $("notificationList");
    if (!output) return;

    const notifications = getNotifications();

    if (notifications.length === 0) {
        output.textContent = "No notifications. You're all caught up!";
        return;
    }

    output.innerHTML = `
        <ul>
            ${notifications.map(item => `
                <li>
                    ${escapeHTML(item.message)}
                    <small>${escapeHTML(item.time)}</small>
                </li>
            `).join("")}
        </ul>
    `;
}

$("resetNotificationsButton")?.addEventListener("click", () => {
    localStorage.removeItem(NOTIFICATION_KEY);
    renderNotifications();
});

// ===== CUSTOMER REGISTRATION =====
$("customerForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const customer = {
        fullName: $("fullName").value.trim(),
        email: $("email").value.trim(),
        phone: $("phone").value.trim()
    };

    if (!customer.fullName || !customer.email || !customer.phone) {
        showMessage("message", "Please complete all fields.", true);
        return;
    }

    try {
        const result = await apiRequest(`${API}/customers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(customer)
        });

        showMessage(
            "message",
            `Registration successful! Your customer ID is ${result.id}.`
        );

        addNotification(
            `Customer registration completed. Customer ID: ${result.id}.`
        );

        $("customerForm").reset();
    } catch (error) {
        showMessage("message", error.message, true);
    }
});

// ===== LOAN APPLICATION SUBMISSION =====
$("applicationForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const customerId = $("customerId")?.value?.trim();
    const requestedAmount = Number($("requestedAmount")?.value);
    const annualIncome = Number($("annualIncome")?.value);
    const purpose = $("purpose")?.value?.trim();

    if (!customerId || !requestedAmount || !annualIncome || !purpose) {
        showMessage("applicationMessage", "Please fill in all application fields.", true);
        return;
    }

    try {
        const result = await apiRequest(`${API}/applications?customerId=${encodeURIComponent(customerId)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                requestedAmount,
                annualIncome,
                purpose
            })
        });

        showMessage(
            "applicationMessage",
            `Application submitted successfully! Application ID: ${result.id}. Status: ${result.status}`
        );

        addNotification(
            `Loan application #${result.id} submitted for Customer #${customerId}. Status: ${result.status}`
        );

        $("applicationForm").reset();
    } catch (error) {
        showMessage("applicationMessage", error.message, true);
    }
});

// ===== CUSTOMER LOGIN PLACEHOLDER =====
// A secure customer login endpoint must be added to the backend.
// Never treat an email-only check as authentication.
$("customerLoginForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    showMessage(
        "loginMessage",
        "Customer login is not enabled yet. Secure backend authentication is required.",
        true
    );
});

// ===== LOAN ELIGIBILITY CHECKER =====
$("eligibilityForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const age = Number($("age").value);
    const income = Number($("income").value);
    const amount = Number($("loanAmount").value);
    const years = Number($("loanYears").value);

    const result = $("eligibilityResult");

    if (
        !Number.isFinite(age) ||
        !Number.isFinite(income) ||
        !Number.isFinite(amount) ||
        !Number.isFinite(years) ||
        age < 18 || age > 100 ||
        income < 0 ||
        amount <= 0 ||
        years < 1 || years > 30
    ) {
        result.textContent = "Please enter valid details in every field.";
        return;
    }

    // Illustrative rules for a student project only.
    const reasons = [];

    if (age < 21 || age > 60) {
        reasons.push("The demonstration age range is 21–60 years.");
    }

    if (income < 180000) {
        reasons.push("The demonstration minimum annual income is ₹1,80,000.");
    }

    if (amount > income * 5) {
        reasons.push("The requested amount exceeds five times annual income.");
    }

    const reasonHTML = reasons.length
        ? `<ul>${reasons.map(reason =>
            `<li>${escapeHTML(reason)}</li>`
        ).join("")}</ul>`
        : "<p>Your details meet the basic demonstration rules.</p>";

    result.innerHTML = `
        <h3>${reasons.length
            ? "Demo Criteria Not Met"
            : "Preliminary Criteria Met"}</h3>

        ${reasonHTML}

        <p><strong>Age:</strong> ${age}</p>
        <p><strong>Annual income:</strong> ${money(income)}</p>
        <p><strong>Requested amount:</strong> ${money(amount)}</p>
        <p><strong>Repayment period:</strong> ${years} years</p>

        <p class="notice">
            This is only an illustrative estimate, not an actual loan
            approval or rejection. Lender criteria, credit history,
            existing debts, interest rates, and verification can change
            the decision.
        </p>
    `;
});

// ===== APPLICATION DATA =====
async function loadApplications() {
    const applications = await apiRequest(`${API}/applications`);

    if (!Array.isArray(applications)) {
        throw new Error("Unexpected application data from the server.");
    }

    return applications;
}

function applicationCard(app, includeActions = false) {
    const customer = app.customer || {};

    const customerId =
        customer.id ?? app.customerId ?? "Not available";

    const status = String(app.status || "UNKNOWN").toUpperCase();

    let actions = "";

    if (includeActions && status === "PENDING") {
        actions = `
            <button type="button"
                data-action="status"
                data-id="${escapeHTML(app.id)}"
                data-status="APPROVED">
                Approve
            </button>

            <button type="button"
                class="secondary-button"
                data-action="status"
                data-id="${escapeHTML(app.id)}"
                data-status="REJECTED">
                Reject
            </button>
        `;
    }

    return `
        <article class="application-card">
            <h3>Application #${escapeHTML(app.id)}</h3>

            <p><strong>Customer ID:</strong>
                ${escapeHTML(customerId)}</p>

            <p><strong>Customer name:</strong>
                ${escapeHTML(customer.fullName ?? "Not available")}</p>

            <p><strong>Email:</strong>
                ${escapeHTML(customer.email ?? "Not available")}</p>

            <p><strong>Phone:</strong>
                ${escapeHTML(customer.phone ?? "Not available")}</p>

            <p><strong>Requested amount:</strong>
                ${money(app.requestedAmount)}</p>

            <p><strong>Annual income:</strong>
                ${money(app.annualIncome)}</p>

            <p><strong>Purpose:</strong>
                ${escapeHTML(app.purpose ?? "Not specified")}</p>

            <p><strong>Status:</strong>
                <span class="status-badge">${escapeHTML(status)}</span>
            </p>

            ${actions}
        </article>
    `;
}

function renderApplications(applications, outputId, includeActions = false) {
    const output = $(outputId);
    if (!output) return;

    if (!applications.length) {
        output.textContent = "No matching applications found.";
        return;
    }

    output.innerHTML = applications
        .map(app => applicationCard(app, includeActions))
        .join("");
}

// ===== SEARCH AND FILTER =====
async function searchApplications() {
    const output = $("searchResults");
    output.textContent = "Loading applications...";

    try {
        const applications = await loadApplications();
        const query = $("applicationSearch").value.trim().toLowerCase();
        const selectedStatus = $("statusFilter").value.toUpperCase();

        const filtered = applications.filter(app => {
            const customer = app.customer || {};

            const details = [
                app.id,
                customer.id,
                customer.fullName,
                customer.email,
                customer.phone,
                app.purpose,
                app.status,
                app.requestedAmount,
                app.annualIncome
            ].join(" ").toLowerCase();

            const matchesQuery = details.includes(query);
            const matchesStatus =
                !selectedStatus ||
                String(app.status || "").toUpperCase() === selectedStatus;

            return matchesQuery && matchesStatus;
        });

        renderApplications(filtered, "searchResults");
    } catch (error) {
        output.textContent = `Unable to search: ${error.message}`;
    }
}

$("searchButton")?.addEventListener("click", searchApplications);

$("applicationSearch")?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        searchApplications();
    }
});

$("statusFilter")?.addEventListener("change", searchApplications);

// ===== ADMIN REPORTS =====
$("loadReportsButton")?.addEventListener("click", async () => {
    showMessage("reportMessage", "Loading report...");

    try {
        const applications = await loadApplications();

        const countStatus = status => applications.filter(
            app => String(app.status || "").toUpperCase() === status
        ).length;

        $("totalApplications").textContent = applications.length;
        $("pendingApplications").textContent = countStatus("PENDING");
        $("approvedApplications").textContent = countStatus("APPROVED");
        $("rejectedApplications").textContent = countStatus("REJECTED");

        showMessage("reportMessage", "Report updated successfully.");
    } catch (error) {
        showMessage("reportMessage", error.message, true);
    }
});

// ===== ADMIN APPLICATION MANAGEMENT =====
$("adminLoginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = $("adminUsername").value.trim();
    const password = $("adminPassword").value;

    // Basic authentication is used by the existing Spring Security setup.
    // HTTPS is required to protect credentials in transit outside localhost.
    adminAuth = "Basic " + btoa(`${username}:${password}`);

    try {
        // The current backend may allow GET without authentication.
        // This request loads the application list; PATCH is the protected action.
        const applications = await apiRequest(`${API}/applications`, {
            headers: { Authorization: adminAuth }
        });

        renderApplications(
            applications,
            "adminApplicationsOutput",
            true
        );

        showMessage(
            "adminMessage",
            "Applications loaded. Status updates require admin authorization."
        );
    } catch (error) {
        adminAuth = null;
        showMessage("adminMessage", error.message, true);
    }
});

$("adminApplicationsOutput")?.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action='status']");
    if (!button) return;

    if (!adminAuth) {
        showMessage("adminMessage", "Please log in as admin first.", true);
        return;
    }

    const id = button.dataset.id;
    const status = button.dataset.status;

    if (!confirm(`Are you sure you want to ${status.toLowerCase()} application #${id}?`)) {
        return;
    }

    try {
        await apiRequest(
            `${API}/applications/${encodeURIComponent(id)}/status?status=${encodeURIComponent(status)}`,
            {
                method: "PATCH",
                headers: {
                    Authorization: adminAuth
                }
            }
        );

        showMessage(
            "adminMessage",
            `Application #${id} status updated to ${status}.`
        );

        addNotification(
            `Application #${id} status changed to ${status}.`
        );

        const applications = await loadApplications();

        renderApplications(
            applications,
            "adminApplicationsOutput",
            true
        );
    } catch (error) {
        showMessage(
            "adminMessage",
            `Unable to update application: ${error.message}`,
            true
        );
    }
});

// ===== INITIAL PAGE SETUP =====
renderNotifications();
