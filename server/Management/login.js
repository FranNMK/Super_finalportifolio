// ============================================
// LOGIN PAGE JAVASCRIPT
// ============================================

const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : '';

// DOM Elements
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePasswordBtn = document.getElementById("togglePassword");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");
const loadingSpinner = document.getElementById("loadingSpinner");
const forgotPasswordLink = document.getElementById("forgotPasswordLink");

// ============================================
// PASSWORD VISIBILITY TOGGLE
// ============================================

togglePasswordBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);
    
    // Toggle icon
    const icon = togglePasswordBtn.querySelector("i");
    icon.classList.toggle("fa-eye");
    icon.classList.toggle("fa-eye-slash");
});

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
// LOGIN HANDLER
// ============================================

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    // Validation
    if (!email || !password) {
        showError("Please enter both email and password.");
        return;
    }
    
    if (!email.includes("@")) {
        showError("Please enter a valid email address.");
        return;
    }
    
    if (password.length < 8) {
        showError("Password must be at least 8 characters.");
        return;
    }
    
    try {
        showLoading();
        
        // Send login request
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showError(data.error || "Login failed. Please try again.");
            return;
        }
        
        // Success! Store token
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        showSuccess("✅ Login successful! Redirecting...");

        // Redirect to admin panel after 1.5 seconds
        setTimeout(() => {
            window.location.href = "/Management/manage.html";
        }, 1500);
        
    } catch (error) {
        console.error("Login error:", error);
        showError("Network error. Please check your connection and try again.");
    }
});

// ============================================
// FORGOT PASSWORD HANDLER
// ============================================

forgotPasswordLink.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = prompt("Enter your admin email address to get a reset link:");
    if (!email) return;

    if (!email.includes("@")) {
        showError("Please enter a valid email address.");
        return;
    }

    showLoading();

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        const data = await res.json();
        hideLoading();

        if (data.resetUrl) {
            // Show the link in a copyable prompt — no email service needed
            const copied = prompt(
                "✅ Reset link generated!\n\nCopy this URL and open it in your browser:\n\n" + data.resetUrl + "\n\n(Click OK to dismiss)",
                data.resetUrl
            );
            showSuccess("Reset link is ready. Copy it from the prompt above.");
        } else {
            showSuccess(data.message || "If that email exists, a reset link was generated.");
        }
    } catch (err) {
        hideLoading();
        showError("Network error. Please check your connection.");
    }
});

// ============================================
// CHECK IF ALREADY LOGGED IN
// ============================================

async function checkIfLoggedIn() {
    const token = localStorage.getItem("authToken");
    
    if (token) {
        try {
            // Verify if the token is actually valid with the backend
            const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token })
            });
            
            if (response.ok) {
                window.location.href = "/Management/manage.html";
            } else {
                // Token is invalid, clear it
                localStorage.removeItem("authToken" );
            }
        } catch (error) {
            console.error("Auth check failed:", error);
        }
    }
}


// Run check on page load
checkIfLoggedIn();

// ============================================
// AUTO-FILL FOR TESTING (Remove in production)
// ============================================

// Uncomment these lines for local testing only
// emailInput.value = "admin@example.com";
// passwordInput.value = "SecurePassword123";
