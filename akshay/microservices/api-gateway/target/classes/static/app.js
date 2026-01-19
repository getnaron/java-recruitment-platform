// API Configuration
const API_BASE_URL = 'http://localhost:8080/api';

// State Management
let currentToken = localStorage.getItem('token');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    if (currentToken) {
        validateTokenAndShowDashboard();
    }

    // Password strength checker
    const registerPassword = document.getElementById('registerPassword');
    if (registerPassword) {
        registerPassword.addEventListener('input', checkPasswordStrength);
    }
});

// Tab Switching
function switchTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabIndicator = document.getElementById('tabIndicator');

    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        tabIndicator.classList.remove('register');
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
        tabIndicator.classList.add('register');
    }

    // Clear alerts
    hideAlert('loginAlert');
    hideAlert('registerAlert');
}

// Toggle Password Visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

// Password Strength Checker
function checkPasswordStrength(e) {
    const password = e.target.value;
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');

    let strength = 0;

    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    strengthFill.className = 'strength-fill';

    if (strength <= 2) {
        strengthFill.classList.add('weak');
        strengthText.textContent = 'Weak password';
        strengthText.style.color = '#f56565';
    } else if (strength <= 4) {
        strengthFill.classList.add('medium');
        strengthText.textContent = 'Medium password';
        strengthText.style.color = '#ed8936';
    } else {
        strengthFill.classList.add('strong');
        strengthText.textContent = 'Strong password';
        strengthText.style.color = '#48bb78';
    }
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');

    // Show loading state
    loginBtn.classList.add('loading');
    hideAlert('loginAlert');

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            // Store token
            currentToken = data.token;
            localStorage.setItem('token', data.token);

            // Show success message
            showAlert('loginAlert', 'Login successful! Redirecting...', 'success');

            // Show dashboard after a short delay
            setTimeout(() => {
                showDashboard(data);
            }, 1000);
        } else {
            showAlert('loginAlert', data.message || 'Invalid email or password', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('loginAlert', 'Unable to connect to server. Please ensure the backend is running.', 'error');
    } finally {
        loginBtn.classList.remove('loading');
    }
}

// Handle Register
async function handleRegister(e) {
    e.preventDefault();

    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const firstName = document.getElementById('registerFirstName').value;
    const lastName = document.getElementById('registerLastName').value;
    const registerBtn = document.getElementById('registerBtn');

    // Show loading state
    registerBtn.classList.add('loading');
    hideAlert('registerAlert');

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, firstName, lastName }),
        });

        const data = await response.json();

        if (response.ok) {
            // Store token
            currentToken = data.token;
            localStorage.setItem('token', data.token);

            // Show success message
            showAlert('registerAlert', 'Registration successful! Welcome aboard!', 'success');

            // Show dashboard after a short delay
            setTimeout(() => {
                showDashboard(data);
            }, 1000);
        } else {
            showAlert('registerAlert', data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAlert('registerAlert', 'Unable to connect to server. Please ensure the backend is running.', 'error');
    } finally {
        registerBtn.classList.remove('loading');
    }
}

// Validate Token and Show Dashboard
async function validateTokenAndShowDashboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const userData = await response.json();
            showDashboard({
                token: currentToken,
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
            });
        } else {
            // Token is invalid, clear it
            localStorage.removeItem('token');
            currentToken = null;
        }
    } catch (error) {
        console.error('Token validation error:', error);
        localStorage.removeItem('token');
        currentToken = null;
    }
}

// Show Dashboard - Redirect to blank page
function showDashboard(userData) {
    // Store user data in localStorage
    localStorage.setItem('userData', JSON.stringify(userData));

    // Redirect to blank page
    window.location.href = 'blank.html';
}

// Get Initials
function getInitials(firstName, lastName) {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || 'U';
}

// Handle Logout
function handleLogout() {
    // Clear token
    localStorage.removeItem('token');
    currentToken = null;

    // Hide dashboard, show auth card
    const authCard = document.getElementById('authCard');
    const dashboard = document.getElementById('dashboard');

    dashboard.classList.remove('active');
    authCard.style.display = 'block';

    // Reset forms
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();

    // Switch to login tab
    switchTab('login');

    // Show success message
    showAlert('loginAlert', 'You have been logged out successfully', 'success');
}

// Copy Token
function copyToken() {
    const tokenValue = document.getElementById('tokenValue').textContent;

    navigator.clipboard.writeText(tokenValue).then(() => {
        // Show temporary success feedback
        const btnCopy = document.querySelector('.btn-copy');
        const originalHTML = btnCopy.innerHTML;

        btnCopy.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        btnCopy.style.background = '#48bb78';
        btnCopy.style.color = 'white';

        setTimeout(() => {
            btnCopy.innerHTML = originalHTML;
            btnCopy.style.background = '';
            btnCopy.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy token:', err);
    });
}

// Show Alert
function showAlert(alertId, message, type) {
    const alert = document.getElementById(alertId);
    alert.textContent = message;
    alert.className = `alert ${type} show`;
}

// Hide Alert
function hideAlert(alertId) {
    const alert = document.getElementById(alertId);
    alert.className = 'alert';
}

// Test Protected Endpoint (for demonstration)
async function testProtectedEndpoint() {
    try {
        const response = await fetch(`${API_BASE_URL}/user/test`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        console.log('Protected endpoint response:', data);
        return data;
    } catch (error) {
        console.error('Error calling protected endpoint:', error);
    }
}
