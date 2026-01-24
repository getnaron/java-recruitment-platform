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
            // Only clear token if explicitly unauthorized
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                currentToken = null;
                currentUser = null;
                // Optional: redirect to login or show message
            } else {
                console.warn('Server error during validation, but keeping token:', response.status);
                // Keep token but maybe show offline message? 
                // For now, let's try to show dashboard anyway if we have cached user data? 
                // Actually, if we can't fetch profile, we can't show dashboard correctly (roles etc).
                // But we shouldn't logout on 500.
                alert('Server seems to be having issues. Please try again later.');
            }
        }
    } catch (error) {
        console.error('Token validation error (Network?):', error);
        // Do NOT clear token on network error
        alert('Network error. Please check if backend is running.');
    }
}

async function refreshUserDataOnly() {
    try {
        console.log('REFRESH_DEBUG: Starting silent refresh...');
        const response = await fetch(`${API_BASE_URL}/user/profile?t=${Date.now()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            cache: 'no-store'
        });

        if (response.ok) {
            const userData = await response.json();
            console.log('REFRESH_DEBUG: User data received:', JSON.stringify(userData));
            currentUser = {
                token: currentToken,
                ...userData
            };
            // Update header info if it changed
            if (document.getElementById('userName')) document.getElementById('userName').textContent = `Welcome, ${userData.firstName}!`;
            if (document.getElementById('userEmail')) document.getElementById('userEmail').textContent = userData.email;
            if (document.getElementById('avatarInitials')) document.getElementById('avatarInitials').textContent = getInitials(userData.firstName, userData.lastName);

            // Re-populate form with normalized data from server (optional, but good for sync)
            populateProfileForm(currentUser);
        } else {
            console.error('REFRESH_DEBUG: Server returned error:', response.status);
        }
    } catch (error) {
        console.error('REFRESH_DEBUG: Silent refresh failed:', error);
    }
}

// Show Dashboard
function showDashboard(userData) {
    currentUser = userData;
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
        roleDescription.textContent = "Manage your job openings and discover top talent.";
        roleVisibleSection.style.display = 'none';
        recruiterJobSection.style.display = 'block';
        document.getElementById('navProfileBtn').style.display = 'flex';
        document.getElementById('navApplicationsBtn').style.display = 'none';
        document.getElementById('navCandidatesBtn').style.display = 'flex';

        fetchApplications();
        fetchJobs();
    } else {
        roleTitle.textContent = "🎉 Welcome Candidate!";
        roleDescription.textContent = "Find your next career opportunity here.";
        roleVisibleSection.style.display = 'none';
        recruiterJobSection.style.display = 'none';
        document.getElementById('candidateJobSection').style.display = 'block';
        document.getElementById('navProfileBtn').style.display = 'flex';
        document.getElementById('navApplicationsBtn').style.display = 'flex';

        fetchAvailableJobs();
        fetchMyApplications();

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

    const isModalContainer = containerId === 'candidatesList';
    const loadingText = isModalContainer ? '<div style="text-align: center; padding: 100px; grid-column: 1 / -1;"><div class="loader-spinner" style="margin: 0 auto 20px;"></div><p style="color: var(--text-light); font-size: 18px;">Surfacing top talent...</p></div>' : '<p class="text-secondary" style="font-size: 14px;">Loading users...</p>';

    usersList.innerHTML = loadingText;

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
                const emptyText = isModalContainer ? '<div style="text-align: center; color: var(--text-light); padding: 80px 40px; background: #fff; border-radius: 12px; border: 2px dashed #e2e8f0; grid-column: 1 / -1; width: 100%;"><span style="font-size: 48px; display: block; margin-bottom: 20px;">👥</span><h4 style="color: #1e293b; font-weight: 700;">No candidates yet</h4><p style="font-size: 14px; color: #64748b;">The talent pool is currently empty.</p></div>' : '<p class="text-secondary" style="font-size: 14px;">No users found.</p>';
                usersList.innerHTML = emptyText;
                return;
            }

            usersList.innerHTML = users.map(user => {
                if (isModalContainer) {
                    return `
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; transition: all 0.3s ease; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);" class="app-card-hover">
                            <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 16px;">
                                <div style="width: 48px; height: 48px; border-radius: 12px; background: var(--primary-color); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 18px;">
                                    ${getInitials(user.firstName, user.lastName)}
                                </div>
                                <div>
                                    <h5 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0;">${user.firstName} ${user.lastName}</h5>
                                    <p style="font-size: 12px; color: #64748b; margin: 0;">${user.email}</p>
                                </div>
                            </div>
                            <div style="background: #f8fafc; border-radius: 10px; padding: 12px; margin-bottom: 16px;">
                                <div style="font-size: 12px; color: #64748b;">Specialization</div>
                                <div style="font-size: 13px; color: #1e293b; font-weight: 700;">${user.role}</div>
                            </div>
                            <button class="btn btn-primary btn-sm" onclick="viewCandidateProfile('${user.email}')" style="width: 100%; border-radius: 8px;">View Full Profile</button>
                        </div>
                    `;
                }

                return `
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
                `;
            }).join('');
        } else {
            usersList.innerHTML = '<p class="text-error" style="font-size: 14px;">Failed to load users.</p>';
        }
    } catch (error) {
        console.error('Fetch users error:', error);
        usersList.innerHTML = '<p class="text-error" style="font-size: 14px;">Connection error.</p>';
    }
}

async function fetchApplications() {
    const listEl = document.getElementById('applicationsList');
    if (!listEl) return;

    try {
        const response = await fetch(`${API_BASE_URL}/job/applications/my-jobs`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const apps = await response.json();
            if (apps.length === 0) {
                listEl.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px;">No applications received yet.</p>';
                return;
            }

            // Fetch jobs to get titles
            const jobsResponse = await fetch(`${API_BASE_URL}/job/all`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            const allJobs = jobsResponse.ok ? await jobsResponse.json() : [];
            const jobMap = {};
            allJobs.forEach(j => jobMap[j.id] = j.title);

            listEl.innerHTML = apps.map(app => `
                <div class="user-item">
                    <div class="user-item-info">
                        <h5><span style="color: var(--primary-color);">${app.candidateEmail}</span> applied for <strong>${jobMap[app.jobId] || 'Unknown Position'}</strong></h5>
                        <p style="font-size: 12px; color: var(--text-light);">Applied on: ${new Date(app.appliedAt).toLocaleDateString()} at ${new Date(app.appliedAt).toLocaleTimeString()}</p>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <button class="btn btn-secondary btn-sm" onclick="viewApplicationResumeAsBlob('${app.id}')" style="padding: 4px 12px; font-size: 11px;">View Resume</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Fetch applications error:', error);
    }
}

async function viewApplicationResumeAsBlob(applicationId) {
    try {
        const response = await fetch(`${API_BASE_URL}/job/application/resume/${applicationId}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const newWindow = window.open(blobUrl, '_blank');
        if (!newWindow) {
            alert('Popup blocked! Please allow popups.');
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
        console.error('Error viewing resume:', error);
        alert('Could not open resume for viewing: ' + error.message);
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
    document.getElementById('navApplicationsBtn').style.display = 'none';
    document.getElementById('navProfileBtn').style.display = 'none';

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
        console.log('Displaying resume link for:', userData.resumeUrl);
        const safeUrl = encodeURIComponent(userData.resumeUrl);
        resumeLink.innerHTML = `
            <div style="background: rgba(var(--primary-rgb), 0.1); padding: 8px 12px; border-radius: 6px; margin-top: 8px; border: 1px solid rgba(var(--primary-rgb), 0.2); display: flex; align-items: center; justify-content: space-between;">
                <span style="font-weight: 500; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">📄 ${userData.resumeUrl}</span>
                <div style="display: flex; gap: 8px;">
                    <a href="javascript:void(0)" onclick="viewResumeAsBlob('${safeUrl}')" class="btn btn-secondary btn-sm" style="width: auto; padding: 4px 10px; font-size: 11px;">View</a>
                    <a href="javascript:void(0)" onclick="downloadResumeFile('${safeUrl}')" class="btn btn-primary btn-sm" style="width: auto; padding: 4px 10px; font-size: 11px;">Download</a>
                    <a href="javascript:void(0)" onclick="handleDeleteResume()" class="btn btn-secondary btn-sm" style="width: auto; padding: 4px 10px; font-size: 11px; background: #fee2e2; color: #dc2626; border-color: #fecaca;">Delete</a>
                </div>
            </div>
        `;
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

    // Force enable save button
    document.getElementById('saveProfileBtn').disabled = false;

    // Capture initial state for change detection
    captureInitialProfileState();

    // Attach event listeners for dirty checking
    attachProfileChangeListeners();

    // DO NOT disable save button initially - keep it active as requested
    document.getElementById('saveProfileBtn').disabled = false;

    // Attach event listeners for dirty checking using delegation
    const profileView = document.getElementById('profileView');

    // Actually, let's just attach distinct listeners to the inputs again but make sure we cover everything
    const inputs = profileView.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.removeEventListener('input', checkProfileChanges);
        input.removeEventListener('change', checkProfileChanges);
        input.removeEventListener('keyup', checkProfileChanges);

        input.addEventListener('input', checkProfileChanges);
        input.addEventListener('change', checkProfileChanges);
        input.addEventListener('keyup', checkProfileChanges);
    });

    // Disable save button initially
    // document.getElementById('saveProfileBtn').disabled = true; // DISABLED LOGIC REMOVED
}

function captureInitialProfileState() {
    initialProfileState = {
        firstName: document.getElementById('profileFirstName').value || '',
        lastName: document.getElementById('profileLastName').value || '',
        countryCode: document.getElementById('profileCountryCode').value || '',
        mobileNumber: document.getElementById('profileMobileNumber').value || '',
        currentCompany: document.getElementById('profileCompany').value || '',
        experienceYears: document.getElementById('profileExperienceYears').value || '',
        education: document.getElementById('profileEducation').value || '',
        skills: document.getElementById('profileSkills').value || '',
        pastExperience: document.getElementById('profilePastExperience').value || ''
    };
}

// Deprecated: attachProfileChangeListeners is replaced by inline logic in populateProfileForm or global init
function attachProfileChangeListeners() {
    // Kept empty to prevent errors if called elsewhere
}

function checkProfileChanges() {
    const currentState = {
        firstName: document.getElementById('profileFirstName').value || '',
        lastName: document.getElementById('profileLastName').value || '',
        countryCode: document.getElementById('profileCountryCode').value || '',
        mobileNumber: document.getElementById('profileMobileNumber').value || '',
        currentCompany: document.getElementById('profileCompany').value || '',
        experienceYears: document.getElementById('profileExperienceYears').value || '',
        education: document.getElementById('profileEducation').value || '',
        skills: document.getElementById('profileSkills').value || '',
        pastExperience: document.getElementById('profilePastExperience').value || ''
    };

    // Check if file is selected (file input value is not empty)
    const resumeFile = document.getElementById('profileResume').files[0];
    const isFileSelected = !!resumeFile;

    const hasChanged = !areObjectsEqual(currentState, initialProfileState) || isFileSelected;

    const saveBtn = document.getElementById('saveProfileBtn');
    // saveBtn.disabled = !hasChanged; // REMOVED DISABLING LOGIC
    saveBtn.disabled = false; // Always enable

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
        const basicUserData = await updateResponse.json();

        // Merge basic info update
        currentUser = { ...currentUser, ...basicUserData };

        // 2. Upload resume if selected
        const resumeFile = document.getElementById('profileResume').files[0];
        if (resumeFile) {
            console.log('Uploading resume:', resumeFile.name);
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

            const resumeUserData = await uploadResponse.json();
            // Merge resume update
            currentUser = { ...currentUser, ...resumeUserData };
            console.log('Resume upload complete. New URL:', currentUser.resumeUrl);
        }

        // Always force a full refresh from server to ensure perfect sync
        await refreshUserDataOnly();

        // Show success status
        const statusEl = document.getElementById('profileSaveStatus');
        if (statusEl) {
            statusEl.innerText = 'Profile Updated Successfully!';
            statusEl.style.opacity = '1';
            setTimeout(() => {
                statusEl.style.opacity = '0';
            }, 3000);
        }

        // Reset file input display but link should be updated by refreshUserDataOnly -> populateProfileForm
        document.getElementById('profileResume').value = '';
        captureInitialProfileState();

    } catch (error) {
        console.error('Profile update error:', error);
        alert('Error updating profile: ' + error.message);
    } finally {
        btn.classList.remove('loading');
    }
}

async function viewResumeAsBlob(safeUrl) {
    const resumeUrl = decodeURIComponent(safeUrl);
    console.log('Attempting to view resume as blob:', resumeUrl);
    if (!resumeUrl) return;
    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile/resume/${safeUrl}?view=true`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
        const blob = await response.blob();
        console.log('Blob received, size:', blob.size, 'type:', blob.type);
        const blobUrl = URL.createObjectURL(blob);
        const newWindow = window.open(blobUrl, '_blank');
        if (!newWindow) {
            alert('Popup blocked! Please allow popups to view the resume.');
        }
        // Revoke after a delay to allow the window to load
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
        console.error('Error viewing resume:', error);
        alert('Could not open resume for viewing: ' + error.message);
    }
}

async function downloadResumeFile(safeUrl) {
    const resumeUrl = decodeURIComponent(safeUrl);
    if (!resumeUrl) return;
    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile/resume/${safeUrl}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = resumeUrl;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            a.remove();
        }, 100);
    } catch (error) {
        console.error('Download error:', error);
        alert('Failed to download resume: ' + error.message);
    }
}

async function handleDeleteResume() {
    if (!confirm('Are you sure you want to delete your resume? This cannot be undone.')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile/resume`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (!response.ok) throw new Error('Failed to delete resume');

        // Update user state and UI
        const updatedUser = await response.json();
        currentUser = { ...currentUser, ...updatedUser };
        populateProfileForm(currentUser);

        // Show status
        const statusEl = document.getElementById('profileSaveStatus');
        if (statusEl) {
            statusEl.innerText = 'Resume deleted successfully!';
            statusEl.style.opacity = '1';
            setTimeout(() => statusEl.style.opacity = '0', 3000);
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete resume: ' + error.message);
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

                // Restrict resume section for Recruiters
                const resumeSection = document.getElementById('viewCandidateResumeSection');
                if (candidate.resumeUrl) {
                    resumeSection.style.display = 'block';
                    resumeSection.style.background = '#fafafa';
                    resumeSection.style.color = 'var(--text-light)';
                    resumeSection.style.border = '1px dashed var(--border-color)';
                    resumeSection.innerHTML = `
                        <div style="display: flex; align-items: center; justify-content: center; padding: 10px; font-style: italic;">
                            <span>Resume details are hidden from recruiters in this view.</span>
                        </div>
                    `;
                } else {
                    resumeSection.style.display = 'none';
                }

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

// Helper to handle all ID formats (Mongo, JSON, etc)
function normalizeId(obj) {
    if (!obj) return "";
    if (typeof obj === 'string') return obj.trim();
    if (obj.$oid) return obj.$oid;
    if (obj.id) return normalizeId(obj.id);
    if (obj._id) return normalizeId(obj._id);
    return obj.toString().trim();
}

async function fetchAvailableJobs() {
    const listEl = document.getElementById('availableJobsList');
    if (!listEl) return;

    try {
        console.log("REFRESH: Fetching available jobs from backend...");

        const response = await fetch(`${API_BASE_URL}/job/available`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const availableJobs = await response.json();
            console.log("DEBUG: Available jobs from server:", availableJobs.length);

            // Update badge
            const badge = document.getElementById('jobCountBadge');
            if (badge) {
                badge.textContent = `${availableJobs.length} Active`;
            }

            if (availableJobs.length === 0) {
                listEl.innerHTML = `
                    <div style="text-align: center; color: var(--text-light); padding: 60px 40px; background: #f8fafc; border-radius: 16px; border: 2px dashed #e2e8f0; margin-top: 10px;">
                        <div style="font-size: 40px; margin-bottom: 16px;">🔍</div>
                        <p style="font-size: 16px; font-weight: 600; color: #1e293b;">No New Jobs Found</p>
                        <p style="font-size: 14px; margin-top: 4px;">You've applied to all current openings or there are no new posts.</p>
                        <button class="btn btn-secondary btn-sm" onclick="fetchAvailableJobs()" style="margin-top: 20px; width: auto; padding: 8px 20px;">Refresh List</button>
                    </div>`;
                return;
            }

            listEl.innerHTML = availableJobs.map(renderJobItem).join('');
        } else {
            console.error("DEBUG: Failed to fetch available jobs, status:", response.status);
            listEl.innerHTML = '<p class="text-error">Unable to load jobs. Please try logging in again.</p>';
        }
    } catch (error) {
        console.error('Fetch jobs error:', error);
        listEl.innerHTML = '<p class="text-error">Connection error occurred while checking for jobs.</p>';
    }
}

async function fetchMyApplications() {
    const listEl = document.getElementById('myApplicationsList');
    if (!listEl) return;

    try {
        console.log("DEBUG: Refreshing application tracker...");
        const response = await fetch(`${API_BASE_URL}/job/applications/my-applications`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const apps = await response.json();

            if (apps.length === 0) {
                listEl.innerHTML = `
                    <div style="text-align: center; color: var(--text-light); padding: 80px 40px; background: #fff; border-radius: 12px; border: 2px dashed #e2e8f0; margin: 20px;">
                        <span style="font-size: 48px; display: block; margin-bottom: 20px;">📂</span>
                        <h4 style="color: #1e293b; font-weight: 700; margin-bottom: 8px;">No active applications</h4>
                        <p style="font-size: 14px; color: #64748b;">Applied jobs will appear here for tracking.</p>
                        <button class="btn btn-primary btn-sm" onclick="closeMyApplicationsModal()" style="margin-top: 24px; width: auto; padding: 10px 24px;">Browse Available Jobs</button>
                    </div>`;
                return;
            }

            // Parallel fetch for job details to map titles
            const allJobsResponse = await fetch(`${API_BASE_URL}/job/all`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            const allJobs = allJobsResponse.ok ? await allJobsResponse.json() : [];
            const jobMap = {};
            allJobs.forEach(j => jobMap[normalizeId(j)] = j);

            // Sort by applied date (newest first)
            apps.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

            listEl.innerHTML = apps.map(app => {
                const jobId = normalizeId(app.jobId);
                const job = jobMap[jobId] || { title: 'Position Archive', companyName: 'Company' };

                // Consistency: Normalize "APPLIED" to "SUBMITTED" for display
                let rawStatus = (app.status || 'SUBMITTED').toUpperCase();
                const status = (rawStatus === 'APPLIED') ? 'SUBMITTED' : rawStatus;

                // Dynamic Status Styling
                let statusConfig = {
                    color: '#3498db',
                    bg: 'rgba(52, 152, 219, 0.08)',
                    border: 'rgba(52, 152, 219, 0.25)',
                    icon: '📝',
                    desc: 'Application received'
                };

                if (status === 'REVIEWING' || status === 'REVIEWED') {
                    statusConfig = { color: '#f39c12', bg: 'rgba(243, 156, 18, 0.08)', border: 'rgba(243, 156, 18, 0.25)', icon: '👀', desc: 'Recruiter is reviewing' };
                } else if (status === 'REJECTED') {
                    statusConfig = { color: '#e74c3c', bg: 'rgba(231, 76, 60, 0.08)', border: 'rgba(231, 76, 60, 0.25)', icon: '🛑', desc: 'Not selected this time' };
                } else if (status === 'SELECTED' || status === 'ACCEPTED') {
                    statusConfig = { color: '#27ae60', bg: 'rgba(39, 174, 96, 0.08)', border: 'rgba(39, 174, 96, 0.25)', icon: '🎉', desc: 'Congratulations!' };
                }

                return `
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 20px; transition: all 0.3s ease; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01);" class="app-card-hover">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <h5 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0;">${job.title}</h5>
                                    <span style="font-size: 10px; padding: 2px 8px; background: #f1f5f9; color: #64748b; border-radius: 100px; font-weight: 700;">ID: ${jobId.substring(0, 8)}</span>
                                </div>
                                <p style="font-size: 14px; font-weight: 600; color: var(--primary-color); margin: 0; display: flex; align-items: center; gap: 6px;">
                                    <span>🏢 ${job.companyName}</span>
                                </p>
                            </div>
                            <div style="text-align: right;">
                                <div style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: ${statusConfig.bg}; border: 1px solid ${statusConfig.border}; border-radius: 10px;">
                                    <span style="font-size: 12px;">${statusConfig.icon}</span>
                                    <span style="font-size: 12px; font-weight: 800; color: ${statusConfig.color}; letter-spacing: 0.02em;">${status}</span>
                                </div>
                                <div style="margin-top: 6px; font-size: 11px; color: #94a3b8; font-weight: 500;">Applied ${new Date(app.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            </div>
                        </div>

                        <div style="background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #f1f5f9;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <div style="width: 36px; height: 36px; background: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); color: #ef4444;">
                                        <svg style="width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div style="font-size: 12px; color: #64748b; font-weight: 500;">Submitted Resume</div>
                                        <div style="font-size: 13px; color: #1e293b; font-weight: 700;">${app.resumeUrl || 'Standard_Resume.pdf'}</div>
                                    </div>
                                </div>
                                <div style="height: 4px; width: 100px; background: #e2e8f0; border-radius: 10px; overflow: hidden; margin-left: 20px;">
                                    <div style="height: 100%; width: ${status === 'SUBMITTED' ? '25%' : (status.includes('REVIEW') ? '60%' : '100%')}; background: ${statusConfig.color}; border-radius: 10px;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Fetch applications error:', error);
        listEl.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--error-color);">Unable to sync with application servers.</div>';
    }
}

function renderJobItem(job) {
    const isCandidate = currentUser && currentUser.role === 'CANDIDATE';
    const jobId = normalizeId(job);
    return `
        <div class="user-item" style="flex-direction: column; align-items: flex-start; gap: 8px;">
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                <h5 style="font-size: 16px; font-weight: 700;">${job.title}</h5>
                <span class="badge" style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color);">${job.companyName || 'Private'}</span>
            </div>
            <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.5;">${job.description}</p>
            <div style="display: flex; gap: 16px; font-size: 12px; color: var(--text-light); margin-top: 4px; width: 100%; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 16px;">
                    <span style="display: flex; align-items: center; gap: 4px;">💼 ${job.requirements}</span>
                    ${job.salary ? `<span style="display: flex; align-items: center; gap: 4px;">💰 $${job.salary.toLocaleString()}</span>` : ''}
                </div>
                ${isCandidate ? `<button class="btn btn-primary btn-sm" style="width: auto; padding: 4px 12px;" onclick="viewJobDetails('${jobId}')">View Details & Apply</button>` : ''}
            </div>
        </div>
    `;
}

let selectedJobId = null;

async function viewJobDetails(jobId) {
    selectedJobId = jobId;
    try {
        const response = await fetch(`${API_BASE_URL}/job/all`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (response.ok) {
            const jobs = await response.json();
            const job = jobs.find(j => j.id === jobId);
            if (job) {
                document.getElementById('viewJobTitle').textContent = job.title;
                document.getElementById('viewJobCompany').textContent = job.companyName || 'Private';
                document.getElementById('viewJobRequirements').textContent = job.requirements;
                document.getElementById('viewJobSalary').textContent = job.salary ? `$${job.salary.toLocaleString()}` : 'N/A';
                document.getElementById('viewJobDescription').textContent = job.description;

                // Resume Option
                const profileResumeName = currentUser.resumeUrl || 'None';
                document.getElementById('applyProfileResumeName').textContent = profileResumeName;

                // Reset form
                document.querySelector('input[name="applyResumeSource"][value="profile"]').checked = true;
                toggleApplyResumeInput();
                document.getElementById('applyStatus').textContent = '';
                document.getElementById('applyBtn').disabled = false;

                document.getElementById('jobDetailsModal').style.display = 'flex';
            }
        }
    } catch (error) {
        console.error('Error fetching job details:', error);
    }
}

function closeJobModal() {
    document.getElementById('jobDetailsModal').style.display = 'none';
    selectedJobId = null;
}

function toggleApplyResumeInput() {
    const source = document.querySelector('input[name="applyResumeSource"]:checked').value;
    const container = document.getElementById('newApplyResumeContainer');
    container.style.display = source === 'new' ? 'block' : 'none';
}

async function handleApplyJob() {
    const btn = document.getElementById('applyBtn');
    const statusEl = document.getElementById('applyStatus');
    const source = document.querySelector('input[name="applyResumeSource"]:checked').value;

    const formData = new FormData();
    formData.append('jobId', selectedJobId);

    if (source === 'new') {
        const fileInput = document.getElementById('applyNewResume');
        if (fileInput.files.length === 0) {
            alert('Please select a resume file to upload.');
            return;
        }
        formData.append('file', fileInput.files[0]);
    } else {
        if (!currentUser.resumeUrl) {
            alert('You do not have a resume in your profile. Please upload one or select "Upload a new resume".');
            return;
        }
        formData.append('resumeName', currentUser.resumeUrl);
    }

    btn.disabled = true;
    statusEl.innerHTML = '<span style="color: var(--primary-color);">Submitting application...</span>';

    try {
        const response = await fetch(`${API_BASE_URL}/job/apply`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            },
            body: formData
        });

        if (response.ok) {
            statusEl.innerHTML = '<span style="color: var(--success-color);">Application submitted successfully!</span>';

            // Critical: Wait small delay to ensure DB persistence and then fully refresh UI state
            setTimeout(async () => {
                await fetchAvailableJobs();
                await fetchMyApplications();
                closeJobModal();
            }, 1500);
        } else {
            const error = await response.text();
            statusEl.innerHTML = `<span style="color: var(--error-color);">${error}</span>`;
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Apply error:', error);
        statusEl.innerHTML = '<span style="color: var(--error-color);">An error occurred. Please try again.</span>';
        btn.disabled = false;
    }
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

function showMyApplicationsModal() {
    document.getElementById('myApplicationsModal').style.display = 'flex';
    fetchMyApplications(); // Refresh on open
}

function closeMyApplicationsModal() {
    document.getElementById('myApplicationsModal').style.display = 'none';
}

function showCandidatesModal() {
    const modal = document.getElementById('candidatesModal');
    modal.style.display = 'flex';
    fetchUsersByRole('CANDIDATE', 'candidatesList');
}

function closeCandidatesModal() {
    document.getElementById('candidatesModal').style.display = 'none';
}
