// API Configuration
const API_BASE_URL = 'http://localhost:8080/api';

// State Management
let currentToken = localStorage.getItem('token');
let currentUser = null;
let initialProfileState = {};

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
    if (e) e.preventDefault();

    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const firstName = document.getElementById('registerFirstName').value;
    const lastName = document.getElementById('registerLastName').value;
    const role = document.querySelector('input[name="registerRole"]:checked').value;
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
            body: JSON.stringify({ email, password, firstName, lastName, role }),
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
            currentUser = {
                token: currentToken,
                ...userData
            };
            showDashboard(currentUser);
        } else {
            // Token is invalid, clear it
            localStorage.removeItem('token');
            currentToken = null;
            currentUser = null;
        }
    } catch (error) {
        console.error('Token validation error:', error);
        localStorage.removeItem('token');
        currentToken = null;
        currentUser = null;
    }
}

// Show Dashboard
function showDashboard(userData) {
    const authCard = document.getElementById('authCard');
    const dashboard = document.getElementById('dashboard');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const avatarInitials = document.getElementById('avatarInitials');

    // Role elements
    const roleTitle = document.getElementById('roleTitle');
    const roleDescription = document.getElementById('roleDescription');
    const roleBadge = document.getElementById('roleBadge');
    const roleVisibleSection = document.getElementById('roleVisibleSection');

    // Update basic info
    userName.textContent = `Welcome, ${userData.firstName}!`;
    userEmail.textContent = userData.email;
    avatarInitials.textContent = getInitials(userData.firstName, userData.lastName);

    // Role-based updates
    const role = userData.role || 'CANDIDATE';
    roleBadge.textContent = role;

    const recruiterJobSection = document.getElementById('recruiterJobSection');

    if (role === 'ADMIN') {
        roleTitle.textContent = "🎉 Welcome Admin!";
        roleDescription.textContent = "You have full access to view all recruiters and candidates in the system.";
        roleVisibleSection.style.display = 'block';
        recruiterJobSection.style.display = 'none';
        fetchUsersByRole('ALL'); // Custom flag for admin
    } else if (role === 'RECRUITER') {
        roleTitle.textContent = "🎉 Welcome Recruiter!";
        roleDescription.textContent = "You can view all candidates and manage your job openings.";
        roleVisibleSection.style.display = 'none';
        recruiterJobSection.style.display = 'block';
        document.getElementById('navProfileBtn').style.display = 'flex';
        fetchUsersByRole('CANDIDATE', 'candidatesList');
        fetchJobs();
    } else {
        roleTitle.textContent = "🎉 Welcome Candidate!";
        roleDescription.textContent = "Find your next career opportunity here.";
        roleVisibleSection.style.display = 'none';
        recruiterJobSection.style.display = 'none';
        document.getElementById('candidateJobSection').style.display = 'block';
        document.getElementById('navProfileBtn').style.display = 'flex';
        // Hide profile button on click logic is handled in toggle

        fetchAvailableJobs();

        // Ensure we start on dashboard
        showDashboardView();
    }

    // Pre-populate profile in background
    populateProfileForm(userData);

    // Switch view
    authCard.style.display = 'none';
    dashboard.classList.add('active');
}

// Fetch users based on role
async function fetchUsersByRole(target, containerId = 'usersList') {
    const usersList = document.getElementById(containerId);
    if (!usersList) return;

    usersList.innerHTML = '<p class="text-secondary" style="font-size: 14px;">Loading users...</p>';

    let endpoint = '/user/candidates';
    if (target === 'ALL') endpoint = '/user/all';
    else if (target === 'RECRUITER') endpoint = '/user/recruiters';

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (response.ok) {
            const users = await response.json();
            if (users.length === 0) {
                usersList.innerHTML = '<p class="text-secondary" style="font-size: 14px;">No users found.</p>';
                return;
            }

            usersList.innerHTML = users.map(user => `
                <div class="user-item">
                    <div class="user-item-info">
                        <h5>${user.firstName} ${user.lastName}</h5>
                        <p>${user.email}</p>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <span class="badge">${user.role}</span>
                        ${user.role === 'CANDIDATE' ?
                    `<button class="btn btn-secondary btn-sm" onclick="viewCandidateProfile('${user.email}')" style="padding: 4px 12px; font-size: 12px;">View Profile</button>`
                    : ''}
                    </div>
                </div>
            `).join('');
        } else {
            usersList.innerHTML = '<p class="text-error" style="font-size: 14px;">Failed to load users.</p>';
        }
    } catch (error) {
        console.error('Fetch users error:', error);
        usersList.innerHTML = '<p class="text-error" style="font-size: 14px;">Connection error.</p>';
    }
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

    // Hide role specific sections
    document.getElementById('recruiterJobSection').style.display = 'none';
    document.getElementById('candidateJobSection').style.display = 'none';
    document.getElementById('roleVisibleSection').style.display = 'none';

    // Reset forms
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();

    // Switch to login tab
    switchTab('login');

    showAlert('loginAlert', 'You have been logged out successfully', 'success');
}

// Profile Management
function populateProfileForm(userData) {
    document.getElementById('profileFirstName').value = userData.firstName || '';
    document.getElementById('profileLastName').value = userData.lastName || '';

    // Country code might default to +1 if empty
    document.getElementById('profileCountryCode').value = userData.countryCode || '+1';
    document.getElementById('profileMobileNumber').value = userData.mobileNumber || '';

    document.getElementById('profileCompany').value = userData.currentCompany || '';
    document.getElementById('profileExperienceYears').value = userData.experienceYears || '';
    document.getElementById('profileEducation').value = userData.education || '';
    document.getElementById('profileSkills').value = userData.skills || '';
    document.getElementById('profilePastExperience').value = userData.pastExperience || '';

    const resumeLink = document.getElementById('currentResumeLink');
    if (userData.resumeUrl) {
        resumeLink.innerHTML = `Current Resume: <a href="${API_BASE_URL}/auth/profile/resume/${userData.resumeUrl}" target="_blank">Download</a>`;
    } else {
        resumeLink.textContent = '';
    }

    // Toggle Candidate Specific Fields based on Role
    const candidateFields = document.getElementById('candidateSpecificFields');
    if (userData.role === 'RECRUITER') {
        candidateFields.style.display = 'none';
    } else {
        candidateFields.style.display = 'block';
    }

    // Capture initial state for change detection
    captureInitialProfileState();

    // Attach event listeners for dirty checking
    attachProfileChangeListeners();

    // Disable save button initially
    document.getElementById('saveProfileBtn').disabled = true;
}

function captureInitialProfileState() {
    initialProfileState = {
        firstName: document.getElementById('profileFirstName').value,
        lastName: document.getElementById('profileLastName').value,
        countryCode: document.getElementById('profileCountryCode').value,
        mobileNumber: document.getElementById('profileMobileNumber').value,
        currentCompany: document.getElementById('profileCompany').value,
        experienceYears: document.getElementById('profileExperienceYears').value,
        education: document.getElementById('profileEducation').value,
        skills: document.getElementById('profileSkills').value,
        pastExperience: document.getElementById('profilePastExperience').value
    };
}

function attachProfileChangeListeners() {
    const inputs = document.querySelectorAll('#profileView input, #profileView select, #profileView textarea');
    inputs.forEach(input => {
        input.addEventListener('input', checkProfileChanges);
        input.addEventListener('change', checkProfileChanges); // For file input and select
    });
}

function checkProfileChanges() {
    const currentState = {
        firstName: document.getElementById('profileFirstName').value,
        lastName: document.getElementById('profileLastName').value,
        countryCode: document.getElementById('profileCountryCode').value,
        mobileNumber: document.getElementById('profileMobileNumber').value,
        currentCompany: document.getElementById('profileCompany').value,
        experienceYears: document.getElementById('profileExperienceYears').value,
        education: document.getElementById('profileEducation').value,
        skills: document.getElementById('profileSkills').value,
        pastExperience: document.getElementById('profilePastExperience').value
    };

    // Check if file is selected (file input value is not empty)
    const resumeFile = document.getElementById('profileResume').files[0];
    const isFileSelected = !!resumeFile;

    const hasChanged = !areObjectsEqual(currentState, initialProfileState) || isFileSelected;

    const saveBtn = document.getElementById('saveProfileBtn');
    saveBtn.disabled = !hasChanged;

    // Debug
    // console.log('Checking changes:', { hasChanged, currentState, initialProfileState });
}

function areObjectsEqual(obj1, obj2) {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (let key of keys1) {
        let val1 = obj1[key] || ''; // Treat null/undefined as empty string
        let val2 = obj2[key] || '';
        if (val1 !== val2) return false;
    }
    return true;
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.classList.add('loading');

    try {
        // 1. Update basic info
        // 1. Update basic info
        const profileData = {
            firstName: document.getElementById('profileFirstName').value,
            lastName: document.getElementById('profileLastName').value,
            countryCode: document.getElementById('profileCountryCode').value,
            mobileNumber: document.getElementById('profileMobileNumber').value,
            currentCompany: document.getElementById('profileCompany').value
        };

        // Add candidate specific fields only if candidate
        if (currentUser && currentUser.role !== 'RECRUITER') {
            profileData.experienceYears = document.getElementById('profileExperienceYears').value;
            profileData.education = document.getElementById('profileEducation').value;
            profileData.skills = document.getElementById('profileSkills').value;
            profileData.pastExperience = document.getElementById('profilePastExperience').value;
        }

        const updateResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileData)
        });

        if (!updateResponse.ok) throw new Error('Failed to update profile data');

        // 2. Upload resume if selected
        const resumeFile = document.getElementById('profileResume').files[0];
        if (resumeFile) {
            const formData = new FormData();
            formData.append('file', resumeFile);

            const uploadResponse = await fetch(`${API_BASE_URL}/auth/profile/resume`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                },
                body: formData
            });



            if (!uploadResponse.ok) throw new Error('Failed to upload resume');
        }

        // Show success status without popup
        const statusEl = document.getElementById('profileSaveStatus');
        statusEl.style.opacity = '1';

        // Update initial state to new current state
        captureInitialProfileState();
        document.getElementById('profileResume').value = ''; // clear file input
        document.getElementById('saveProfileBtn').disabled = true;

        setTimeout(() => {
            statusEl.style.opacity = '0';
        }, 3000);

        // Quietly refresh dashboard data
        validateTokenAndShowDashboard();

    } catch (error) {
        console.error('Profile update error:', error);
        alert('Error updating profile: ' + error.message);
    } finally {
        btn.classList.remove('loading');
    }
}

async function viewCandidateProfile(email) {
    try {
        // Fetch specific user details
        // We can use the internal endpoint proxied via User Service or just assume we have access if Recruiter
        // Since we don't have a direct "get user by email" public endpoint for recruiters, we might need to rely on the list data
        // BUT list data might be shallow if we implemented pagination (not yet). 
        // Let's us the list fetch again or filter from memory? 
        // Better: user-service 'internal/user/{email}' is for microservices.
        // Let's add a public (but secured) endpoint in UserController to get candidate details: /api/user/candidate/{email}
        // OR filtering the full list client side is easier given current size.

        // Let's just re-fetch the candidate list or filter if we can.
        // Since we don't have a "get single user" endpoint exposed to frontend, 
        // I will implement a quick one-off fetch to the list endpoint and filter (inefficient but works for now)
        // OR better: Just use the list API.

        // Wait, I can just use the `fetchUsersByRole` logic but for one? No.
        // Let's USE the /user/candidates endpoint and find the user.

        const response = await fetch(`${API_BASE_URL}/user/candidates`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const candidates = await response.json();
            const candidate = candidates.find(u => u.email === email);

            if (candidate) {
                document.getElementById('viewCandidateName').textContent = `${candidate.firstName} ${candidate.lastName}`;
                document.getElementById('viewCandidateEmail').textContent = candidate.email;
                document.getElementById('viewCandidateCompany').textContent = candidate.currentCompany || 'N/A';
                document.getElementById('viewCandidateExperience').textContent = candidate.experienceYears || '0';
                document.getElementById('viewCandidateEducation').textContent = candidate.education || 'N/A';
                document.getElementById('viewCandidateSkills').textContent = candidate.skills || 'N/A';
                document.getElementById('viewCandidatePastExp').textContent = candidate.pastExperience || 'No details provided.';

                // Show resume warning
                document.getElementById('viewCandidateResumeSection').style.display = 'block';

                document.getElementById('candidateDetailsModal').style.display = 'flex';
            }
        }

    } catch (error) {
        console.error('Error fetching candidate details:', error);
        alert('Could not load candidate details.');
    }
}

function closeCandidateModal() {
    document.getElementById('candidateDetailsModal').style.display = 'none';
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

// Job Management Functions
function showJobForm() {
    document.getElementById('jobFormContainer').style.display = 'block';
}

function hideJobForm() {
    document.getElementById('jobFormContainer').style.display = 'none';
}

async function handleCreateJob(e) {
    if (e) e.preventDefault();

    const jobData = {
        title: document.getElementById('jobTitle').value,
        requirements: document.getElementById('jobRequirements').value,
        companyName: document.getElementById('jobCompany').value,
        description: document.getElementById('jobDescription').value,
        salary: parseFloat(document.getElementById('jobSalary').value) || null
    };

    try {
        const response = await fetch(`${API_BASE_URL}/job/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(jobData),
        });

        if (response.ok) {
            hideJobForm();
            fetchJobs();
            // Reset form
            e.target.reset();
        } else {
            console.error('Failed to create job');
            alert('Failed to create job opening. Please try again.');
        }
    } catch (error) {
        console.error('Create job error:', error);
    }
}

async function fetchJobs() {
    const jobsList = document.getElementById('jobsList');
    try {
        const response = await fetch(`${API_BASE_URL}/job/my-jobs`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const jobs = await response.json();
            if (jobs.length === 0) {
                jobsList.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px;">No jobs posted yet.</p>';
                return;
            }
            jobsList.innerHTML = jobs.map(renderJobItem).join('');
        }
    } catch (error) {
        console.error('Fetch jobs error:', error);
    }
}

async function fetchAvailableJobs() {
    const jobsList = document.getElementById('availableJobsList');
    try {
        const response = await fetch(`${API_BASE_URL}/job/all`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const jobs = await response.json();
            if (jobs.length === 0) {
                jobsList.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px;">No available jobs at the moment.</p>';
                return;
            }
            jobsList.innerHTML = jobs.map(renderJobItem).join('');
        }
    } catch (error) {
        console.error('Fetch jobs error:', error);
    }
}

function renderJobItem(job) {
    return `
        <div class="user-item" style="flex-direction: column; align-items: flex-start; gap: 8px;">
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                <h5 style="font-size: 16px; font-weight: 700;">${job.title}</h5>
                <span class="badge" style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color);">${job.companyName || 'Private'}</span>
            </div>
            <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.5;">${job.description}</p>
            <div style="display: flex; gap: 16px; font-size: 12px; color: var(--text-light); margin-top: 4px;">
                <span style="display: flex; align-items: center; gap: 4px;">💼 ${job.requirements}</span>
                ${job.salary ? `<span style="display: flex; align-items: center; gap: 4px;">💰 $${job.salary.toLocaleString()}</span>` : ''}
            </div>
        </div>
    `;
}



function showProfileView() {
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('profileView').style.display = 'block';

    // Optional: Auto-refresh profile data when entering view
    // validateTokenAndShowDashboard(); // Might be overkill/loop
}

function showDashboardView() {
    document.getElementById('profileView').style.display = 'none';
    document.getElementById('dashboardView').style.display = 'block';
}

// Override the old scroll function to just switch views
function scrollToProfile() {
    showProfileView();
}
