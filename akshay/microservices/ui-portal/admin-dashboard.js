// Admin Dashboard Functions

function toggleAdminSection(section) {
    const sectionEl = document.getElementById(`${section}Section`);
    const chevron = document.getElementById(`${section}Chevron`);

    if (sectionEl.style.display === 'none') {
        sectionEl.style.display = 'block';
        chevron.style.transform = 'rotate(180deg)';
    } else {
        sectionEl.style.display = 'none';
        chevron.style.transform = 'rotate(0deg)';
    }
}

async function loadAdminDashboard() {
    await loadUsersByRole('CANDIDATE', 'adminCandidatesList');
    await loadUsersByRole('RECRUITER', 'recruitersList');
    await loadPremiumUsers();
    await loadLockedUsers();
}

async function loadUsersByRole(role, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loader-spinner"></div></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/users`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const allUsers = await response.json();
            // Filter users by role and exclude premium users (they go to premium section)
            // Also exclude locked users (they go to locked section)
            // Check both 'premium' and 'isPremium' fields for compatibility
            const users = allUsers.filter(u => {
                const isPremium = u.premium || u.isPremium || false;
                const isLocked = u.locked || u.isLocked || false;
                return u.role === role && !isPremium && !isLocked;
            });

            console.log(`${role} users (non-premium):`, users.length);

            // Update count badge
            const countBadge = document.getElementById(`${role.toLowerCase()}sCount`);
            if (countBadge) {
                countBadge.textContent = users.length;
            }

            if (users.length === 0) {
                container.innerHTML = `<div style="text-align: center; padding: 40px; color: #94a3b8;">No ${role.toLowerCase()}s found</div>`;
                return;
            }

            container.innerHTML = users.map(user => `
                <div class="user-card">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <h4 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0;">${user.firstName} ${user.lastName}</h4>
                        </div>
                        <p style="font-size: 14px; color: #64748b; margin: 0;">${user.email}</p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="grantPremium('${user.email}')" class="btn btn-sm" style="background: #f59e0b; color: white; border: none; padding: 8px 12px; font-size: 12px;">⭐ Make Premium</button>
                        <button onclick="toggleUserLock('${user.email}')" class="btn btn-sm" style="background: #ef4444; color: white; border: none; padding: 8px 12px; font-size: 12px;">🔒 Lock</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;">Failed to load users</div>';
    }
}

async function loadPremiumUsers() {
    const container = document.getElementById('premiumUsersList');
    container.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loader-spinner"></div></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/users`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const allUsers = await response.json();
            // Filter premium users (check both 'premium' and 'isPremium' fields)
            const premiumUsers = allUsers.filter(u => {
                const isPremium = u.premium || u.isPremium || false;
                return isPremium && u.role !== 'ADMIN';
            });

            console.log('Premium users:', premiumUsers.length);

            // Update count badge
            const countBadge = document.getElementById('premiumCount');
            if (countBadge) {
                countBadge.textContent = premiumUsers.length;
            }

            if (premiumUsers.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">No premium users yet</div>';
                return;
            }

            container.innerHTML = premiumUsers.map(user => `
                <div class="user-card">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <h4 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0;">${user.firstName} ${user.lastName}</h4>
                            <span class="badge" style="font-size: 11px;">${user.role}</span>
                            ${user.isLocked ? '<span class="badge" style="background: #ef4444; color: white; border: none; font-size: 10px;">🔒 LOCKED</span>' : ''}
                        </div>
                        <p style="font-size: 14px; color: #64748b; margin: 0;">${user.email}</p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="revokePremium('${user.email}')" class="btn btn-sm" style="background: #94a3b8; color: white; border: none; padding: 8px 12px; font-size: 12px;">
                            Revoke Premium
                        </button>
                        <button onclick="toggleUserLock('${user.email}')" class="btn btn-sm" style="background: ${user.isLocked ? '#22c55e' : '#ef4444'}; color: white; border: none; padding: 8px 12px; font-size: 12px;">
                            ${user.isLocked ? '🔓 Unlock' : '🔒 Lock'}
                        </button>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;">Failed to load premium users</div>';
    }
}

async function grantPremium(email) {
    if (!confirm(`Grant premium access to ${email}?`)) return;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/users/${encodeURIComponent(email)}/premium?isPremium=true`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            alert('✅ Premium access granted!');
            loadAdminDashboard();
        } else {
            alert('Failed to grant premium access');
        }
    } catch (e) {
        console.error(e);
        alert('Connection error');
    }
}

async function revokePremium(email) {
    if (!confirm(`Revoke premium access from ${email}?`)) return;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/users/${encodeURIComponent(email)}/premium?isPremium=false`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            alert('Premium access revoked');
            loadAdminDashboard();
        } else {
            alert('Failed to revoke premium access');
        }
    } catch (e) {
        console.error(e);
        alert('Connection error');
    }
}

async function loadLockedUsers() {
    const container = document.getElementById('lockedUsersList');
    container.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loader-spinner"></div></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/users`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const allUsers = await response.json();
            console.log('All users from API:', allUsers.length);
            console.log('Sample user:', allUsers[0]);

            // Filter locked users (check both 'locked' and 'isLocked' fields)
            const lockedUsers = allUsers.filter(u => {
                const isLocked = u.locked || u.isLocked || false;
                if (isLocked) {
                    console.log('Found locked user:', u.email, 'locked:', u.locked, 'isLocked:', u.isLocked);
                }
                return isLocked;
            });

            console.log('Locked users found:', lockedUsers.length);

            // Update count badge
            const countBadge = document.getElementById('lockedCount');
            if (countBadge) {
                countBadge.textContent = lockedUsers.length;
            }

            if (lockedUsers.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">No locked accounts</div>';
                return;
            }

            container.innerHTML = lockedUsers.map(user => {
                const isPremium = user.premium || user.isPremium || false;
                return `
                <div class="user-card">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <h4 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0;">${user.firstName} ${user.lastName}</h4>
                            <span class="badge" style="font-size: 11px;">${user.role}</span>
                            ${isPremium ? '<span class="badge" style="background: #f59e0b; color: white; border: none; font-size: 10px;">⭐ PREMIUM</span>' : ''}
                            <span class="badge" style="background: #ef4444; color: white; border: none; font-size: 10px;">🔒 LOCKED</span>
                        </div>
                        <p style="font-size: 14px; color: #64748b; margin: 0;">${user.email}</p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="toggleUserLock('${user.email}')" class="btn btn-sm" style="background: #22c55e; color: white; border: none; padding: 8px 12px; font-size: 12px; width: 100%; margin-top: 8px;">
                            🔓 Unlock Account
                        </button>
                    </div>
                </div>
            `}).join('');
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;">Failed to load locked users</div>';
    }
}
