// ============================================================
// js/api.js - Central API communication layer
// All fetch calls to the backend go through this file
// ============================================================

const API_BASE = 'http://localhost:5000/api';

// ============================================================
// AUTH TOKEN HELPERS
// ============================================================
const getToken = () => localStorage.getItem('hms_token');
const getUser  = () => JSON.parse(localStorage.getItem('hms_user') || 'null');
const setAuth  = (token, user) => {
    localStorage.setItem('hms_token', token);
    localStorage.setItem('hms_user', JSON.stringify(user));
};
const clearAuth = () => {
    localStorage.removeItem('hms_token');
    localStorage.removeItem('hms_user');
};
const isLoggedIn   = () => !!getToken();
const isAdmin      = () => { const u = getUser(); return u && u.role === 'admin'; };
const isCustomer   = () => { const u = getUser(); return u && u.role === 'customer'; };

// ============================================================
// CORE FETCH WRAPPER
// ============================================================
async function apiRequest(endpoint, method = 'GET', body = null, auth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth || getToken()) headers['Authorization'] = `Bearer ${getToken()}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
        const res  = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await res.json();

        // Auto logout if token expired
        if (res.status === 403 && data.message && data.message.includes('expired')) {
            clearAuth();
            showToast('Session expired. Please login again.', 'error');
            setTimeout(() => window.location.href = '/pages/login.html', 1500);
        }
        return { ok: res.ok, status: res.status, data };
    } catch (err) {
        console.error('API Error:', err);
        return { ok: false, status: 0, data: { success: false, message: 'Network error. Is the server running?' } };
    }
}

// ============================================================
// AUTH APIS
// ============================================================
const AuthAPI = {
    register: (body)   => apiRequest('/auth/register', 'POST', body),
    login:    (body)   => apiRequest('/auth/login', 'POST', body),
    profile:  ()       => apiRequest('/auth/profile', 'GET', null, true),
    updateProfile: (b) => apiRequest('/auth/profile', 'PUT', b, true),
    changePassword:(b) => apiRequest('/auth/change-password', 'PUT', b, true),
};

// ============================================================
// ROOM APIS
// ============================================================
const RoomAPI = {
    getAll:      (params = '') => apiRequest(`/rooms?${params}`),
    getAvailable:(params = '') => apiRequest(`/rooms/available?${params}`),
    getById:     (id)          => apiRequest(`/rooms/${id}`),
    getTypes:    ()            => apiRequest('/rooms/types'),
    create:      (body)        => apiRequest('/rooms', 'POST', body, true),
    update:      (id, body)    => apiRequest(`/rooms/${id}`, 'PUT', body, true),
    delete:      (id)          => apiRequest(`/rooms/${id}`, 'DELETE', null, true),
};

// ============================================================
// BOOKING APIS
// ============================================================
const BookingAPI = {
    create:       (body)   => apiRequest('/bookings', 'POST', body, true),
    getMyBookings:()       => apiRequest('/bookings/my', 'GET', null, true),
    getById:      (id)     => apiRequest(`/bookings/${id}`, 'GET', null, true),
    modify:       (id, b)  => apiRequest(`/bookings/${id}`, 'PUT', b, true),
    cancel:       (id, b)  => apiRequest(`/bookings/${id}/cancel`, 'POST', b, true),
    getAll:       (params) => apiRequest(`/bookings?${params || ''}`, 'GET', null, true),
    updateStatus: (id, b)  => apiRequest(`/bookings/${id}/status`, 'PUT', b, true),
};

// ============================================================
// PAYMENT APIS
// ============================================================
const PaymentAPI = {
    process:    (body) => apiRequest('/payments', 'POST', body, true),
    getInvoice: (bid)  => apiRequest(`/payments/invoice/${bid}`, 'GET', null, true),
    getAll:     ()     => apiRequest('/payments', 'GET', null, true),
    getReport:  (p)    => apiRequest(`/payments/report?${p || ''}`, 'GET', null, true),
};

// ============================================================
// ADMIN APIS
// ============================================================
const AdminAPI = {
    dashboard:       () => apiRequest('/admin/dashboard', 'GET', null, true),
    getUsers:        () => apiRequest('/admin/users', 'GET', null, true),
    toggleUser:      (id) => apiRequest(`/admin/users/${id}/toggle`, 'PUT', null, true),
};

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================================
// LOADING OVERLAY
// ============================================================
function showLoading(msg = 'Loading...') {
    let el = document.getElementById('loading-overlay');
    if (!el) {
        el = document.createElement('div');
        el.id = 'loading-overlay';
        el.className = 'loading-overlay';
        el.innerHTML = `<div class="spinner"></div><p style="font-family:var(--font-body);color:#555">${msg}</p>`;
        document.body.appendChild(el);
    } else {
        el.style.display = 'flex';
    }
}

function hideLoading() {
    const el = document.getElementById('loading-overlay');
    if (el) el.style.display = 'none';
}

// ============================================================
// FORMAT HELPERS
// ============================================================
const formatCurrency = (amt) =>
    '₹' + parseFloat(amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const formatDateTime = (d) =>
    d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

const getStatusBadge = (status) => {
    const map = {
        pending:     'badge-warning',
        confirmed:   'badge-info',
        checked_in:  'badge-success',
        checked_out: 'badge-secondary',
        cancelled:   'badge-danger',
        available:   'badge-success',
        occupied:    'badge-danger',
        reserved:    'badge-warning',
        maintenance: 'badge-warning',
        completed:   'badge-success',
        failed:      'badge-danger',
        refunded:    'badge-info',
    };
    return `<span class="badge ${map[status] || 'badge-secondary'}">${status ? status.replace('_',' ') : '-'}</span>`;
};

// ============================================================
// GUARD: Redirect if not logged in
// ============================================================
function requireAuth(redirectTo = '/pages/login.html') {
    if (!isLoggedIn()) {
        showToast('Please login to continue.', 'warning');
        setTimeout(() => window.location.href = redirectTo, 800);
        return false;
    }
    return true;
}

function requireAdmin(redirectTo = '/pages/login.html') {
    if (!isLoggedIn() || !isAdmin()) {
        showToast('Admin access required.', 'error');
        setTimeout(() => window.location.href = redirectTo, 800);
        return false;
    }
    return true;
}

// ============================================================
// RENDER NAVBAR based on login state
// ============================================================
function renderNavbar() {
    const navAuth = document.getElementById('nav-auth');
    if (!navAuth) return;

    if (isLoggedIn()) {
        const user = getUser();
        const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
        if (isAdmin()) {
            navAuth.innerHTML = `
                <div class="nav-user">
                    <div class="nav-user-avatar">${initial}</div>
                    <span class="nav-user-name">${user.name}</span>
                </div>
                <a href="/pages/admin/dashboard.html" class="btn-nav btn-nav-fill">Admin Panel</a>
                <button class="btn-nav btn-nav-outline" onclick="logout()">Logout</button>`;
        } else {
            navAuth.innerHTML = `
                <div class="nav-user">
                    <div class="nav-user-avatar">${initial}</div>
                    <span class="nav-user-name">${user.name}</span>
                </div>
                <a href="/pages/customer/bookings.html" class="btn-nav btn-nav-outline">My Bookings</a>
                <button class="btn-nav btn-nav-outline" onclick="logout()">Logout</button>`;
        }
    } else {
        navAuth.innerHTML = `
            <a href="/pages/login.html" class="btn-nav btn-nav-outline">Login</a>
            <a href="/pages/register.html" class="btn-nav btn-nav-fill">Register</a>`;
    }
}

function logout() {
    clearAuth();
    showToast('Logged out successfully.', 'success');
    setTimeout(() => window.location.href = '/index.html', 800);
}

// Run on every page
document.addEventListener('DOMContentLoaded', renderNavbar);
