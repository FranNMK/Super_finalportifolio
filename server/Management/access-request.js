// ============================================
// ACCESS REQUEST PAGE JAVASCRIPT
// ============================================

const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : '';

// DOM Elements
const accessRequestForm = document.getElementById("accessRequestForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const reasonInput = document.getElementById("reason");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");
const loadingSpinner = document.getElementById("loadingSpinner");

// ============================================
// SHOW/HIDE MESSAGES
// ============================================

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
    successMessage.style.display = "none";
    loadingSpinner.style.display = "none";
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorMessage.style.display = "none";
    }, 5000);
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = "block";
    errorMessage.style.display = "none";
    loadingSpinner.style.display = "none";
}

function showLoading() {
    loadingSpinner.style.display = "block";
    errorMessage.style.display = "none";
    successMessage.style.display = "none";
}

function hideLoading() {
    loadingSpinner.style.display = "none";
}

// ============================================
// ACCESS REQUEST HANDLER
// ============================================

accessRequestForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const reason = reasonInput.value.trim();
    
    // Validation
    if (!name || !email || !reason) {
        showError("Please fill in all fields.");
        return;
    }
    
    if (!email.includes("@")) {
        showError("Please enter a valid email address.");
        return;
    }
    
    if (name.length < 3) {
        showError("Name must be at least 3 characters.");
        return;
    }
    
    if (reason.length < 10) {
        showError("Please provide a detailed reason (at least 10 characters).");
        return;
    }
    
    try {
        showLoading();
        
        // Send access request
        const response = await fetch(`${API_BASE_URL}/api/auth/request-access`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name, email, reason }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showError(data.error || "Failed to submit request. Please try again.");
            return;
        }
        
        // Success!
        showSuccess("✅ Request submitted successfully! We'll review it soon.");
        
        // Reset form
        accessRequestForm.reset();
        
        // Redirect after 3 seconds
        setTimeout(() => {
            window.location.href = "/";
        }, 3000);
        
    } catch (error) {
        console.error("Access request error:", error);
        showError("Network error. Please check your connection and try again.");
    }
});

// ============================================
// TEXTAREA AUTO-RESIZE
// ============================================

reasonInput.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 200) + "px";
});
