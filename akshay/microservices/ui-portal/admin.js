// Admin Panel Functions

function showNotifications() {
    document.getElementById('adminPanelModal').style.display = 'flex';
    loadPremiumRequests();
}

function showAdminPanel() {
    document.getElementById('adminPanelModal').style.display = 'flex';
    loadPremiumRequests();
    loadAllUsersForAdmin();
}

function closeAdminPanel() {
    document.getElementById('adminPanelModal').style.display = 'none';
}

async function loadPremiumRequests() {
    const container = document.getElementById('premiumRequestsList');
    container.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loader-spinner"></div><p style="margin-top: 16px; color: #64748b;">Loading requests...</p></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/premium-requests`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const requests = await response.json();

            if (requests.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 60px; color: #94a3b8;"><span style="font-size: 48px; display: block; margin-bottom: 16px;">📭</span><p>No pending premium requests</p></div>';
                return;
            }

            container.innerHTML = requests.map(req => `
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <h4 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0;">${req.userName}</h4>
                            <p style="font-size: 14px; color: #64748b; margin: 0 0 4px 0;">${req.userEmail}</p>
                            <p style="font-size: 12px; color: #94a3b8; margin: 0;">Requested: ${new Date(req.requestedAt).toLocaleString()}</p>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="approvePremiumRequest('${req.id}')" class="btn btn-sm" style="background: #22c55e; color: white; border: none; padding: 8px 16px;">
                                ✓ Approve
                            </button>
                            <button onclick="rejectPremiumRequest('${req.id}')" class="btn btn-sm" style="background: #ef4444; color: white; border: none; padding: 8px 16px;">
                                ✗ Reject
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;">Failed to load requests</div>';
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;">Connection error</div>';
    }
}

async function updateNotificationCount() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/premium-requests`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const requests = await response.json();
            const count = requests.length;
            const badge = document.getElementById('notificationBadge');

            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (e) {
        console.error('Failed to load notification count:', e);
    }
}

async function approvePremiumRequest(requestId) {
    if (!confirm('Approve this premium request?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/premium-requests/${requestId}/approve`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            alert('✅ Premium request approved! The user now has premium access.');
            loadPremiumRequests();
            updateNotificationCount();
            // Refresh admin dashboard if the function exists
            if (typeof loadAdminDashboard === 'function') {
                loadAdminDashboard();
            }
        } else {
            alert('Failed to approve request');
        }
    } catch (e) {
        console.error(e);
        alert('Connection error');
    }
}

async function rejectPremiumRequest(requestId) {
    if (!confirm('Reject this premium request?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/premium-requests/${requestId}/reject`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            alert('Request rejected');
            loadPremiumRequests();
        } else {
            alert('Failed to reject request');
        }
    } catch (e) {
        console.error(e);
        alert('Connection error');
    }
}

async function loadAllUsersForAdmin() {
    const container = document.getElementById('adminUsersList');
    container.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loader-spinner"></div><p style="margin-top: 16px; color: #64748b;">Loading users...</p></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/users`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const users = await response.json();

            container.innerHTML = users.map(user => `
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                <h4 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0;">${user.firstName} ${user.lastName}</h4>
                                <span class="badge" style="font-size: 11px;">${user.role}</span>
                                ${user.isPremium ? '<span class="badge" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border: none; font-size: 10px;">PREMIUM</span>' : ''}
                                ${user.isLocked ? '<span class="badge" style="background: #ef4444; color: white; border: none; font-size: 10px;">🔒 LOCKED</span>' : ''}
                            </div>
                            <p style="font-size: 14px; color: #64748b; margin: 0;">${user.email}</p>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            ${user.role !== 'ADMIN' ? `
                                <button onclick="toggleUserPremium('${user.email}', ${!user.isPremium})" class="btn btn-sm" style="background: ${user.isPremium ? '#94a3b8' : '#f59e0b'}; color: white; border: none; padding: 8px 12px; font-size: 12px;">
                                    ${user.isPremium ? 'Remove Premium' : 'Make Premium'}
                                </button>
                                <button onclick="toggleUserLock('${user.email}')" class="btn btn-sm" style="background: ${user.isLocked ? '#22c55e' : '#ef4444'}; color: white; border: none; padding: 8px 12px; font-size: 12px;">
                                    ${user.isLocked ? '🔓 Unlock' : '🔒 Lock'}
                                </button>
                            ` : '<span style="color: #94a3b8; font-size: 12px;">Admin Account</span>'}
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;">Failed to load users</div>';
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;">Connection error</div>';
    }
}

async function toggleUserLock(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/users/${encodeURIComponent(email)}/toggle-lock`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const user = await response.json();
            alert(user.isLocked ? '🔒 User account locked' : '🔓 User account unlocked');
            loadAllUsersForAdmin();
            // Refresh admin dashboard sections if the function exists
            if (typeof loadAdminDashboard === 'function') {
                loadAdminDashboard();
            }
        } else {
            alert('Failed to toggle lock status');
        }
    } catch (e) {
        console.error(e);
        alert('Connection error');
    }
}

async function toggleUserPremium(email, isPremium) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/users/${encodeURIComponent(email)}/premium?isPremium=${isPremium}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            alert(isPremium ? '✅ User upgraded to premium' : 'Premium status removed');
            loadAllUsersForAdmin();
        } else {
            alert('Failed to update premium status');
        }
    } catch (e) {
        console.error(e);
        alert('Connection error');
    }
}
