
// --- 12. Premium & Payment Functions ---
async function showCandidatesModal() {
    // Admin always gets access
    if (currentUser.role === 'ADMIN') {
        document.getElementById('candidatesModal').style.display = 'flex';
        fetchUsersByRole('CANDIDATE', 'candidatesList');
        return;
    }

    // Check if recruiter is premium (use existing currentUser data)
    console.log('Checking premium status for user:', currentUser.email);
    console.log('currentUser.isPremium:', currentUser.isPremium);
    console.log('currentUser.premium:', currentUser.premium);

    // Normalize premium field
    const isPremium = currentUser.isPremium || currentUser.premium || false;
    console.log('Normalized isPremium:', isPremium);

    // Recruiters must be premium
    if (isPremium) {
        console.log('User is premium, opening candidates modal');
        document.getElementById('candidatesModal').style.display = 'flex';
        fetchUsersByRole('CANDIDATE', 'candidatesList');
        return;
    }

    console.log('User is NOT premium, checking for pending request');
    // If not premium, check if there's a pending request
    await checkPendingPremiumRequest();
}

async function checkPendingPremiumRequest() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile/premium-request-status`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.hasPendingRequest) {
                // Show pending status instead of upgrade modal
                showPendingRequestStatus();
            } else {
                // Show Upgrade Modal
                document.getElementById('premiumModal').style.display = 'flex';
            }
        } else {
            // If endpoint doesn't exist or error, show upgrade modal
            document.getElementById('premiumModal').style.display = 'flex';
        }
    } catch (e) {
        console.error(e);
        // Show upgrade modal on error
        document.getElementById('premiumModal').style.display = 'flex';
    }
}

function showPendingRequestStatus() {
    alert("⏳ Premium Request Pending\n\nYour premium upgrade request has been submitted and is awaiting admin approval.\n\nYou will be notified once your request is reviewed.");
}

function handleMockPayment() {
    const btn = document.getElementById('upgradeBtn');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<div class="loader-spinner" style="width: 20px; height: 20px; border-width: 2px;"></div> Submitting Request...';

    // Create premium request
    setTimeout(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/profile/premium-request`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });

            if (response.ok) {
                // Show Success Visuals
                btn.innerHTML = '✓ Request Submitted!';
                btn.style.background = '#22c55e';

                setTimeout(() => {
                    document.getElementById('premiumModal').style.display = 'none';
                    alert("✅ Premium request submitted successfully!\n\nYour request is now in the queue. An admin will review and approve it shortly.");

                    // Don't reset button - keep it showing submitted
                    btn.innerHTML = '⏳ Submitted for Approval';
                    btn.style.background = '#f59e0b';
                    btn.disabled = true;
                }, 2000);

            } else {
                const errorText = await response.text();
                alert("Request failed: " + errorText);
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        } catch (e) {
            console.error(e);
            alert("Connection error. Please try again.");
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }, 1500);
}
