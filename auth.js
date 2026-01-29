document.addEventListener("DOMContentLoaded", function () {
    const authBtn = document.getElementById("authBtn");
    const mockTestBtn = document.getElementById("mockTestBtn");
    const chapTestBtn = document.getElementById("chapTestBtn");
    const subTestBtn = document.getElementById("subTestBtn");
    const pyqTestBtn = document.getElementById("pyqTestBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    // Check if user is logged in
    function isLoggedIn() {
        return localStorage.getItem("token") !== null;
    }

    // Update UI based on login status
    function updateUI() {
        if (!authBtn || !logoutBtn) return;  // only require auth & logout buttons

        const logged = isLoggedIn();
        
        // Toggle auth button
        authBtn.textContent = logged ? "Dashboard" : "Login/Register";
        authBtn.href = logged ? "dashboard.html" : "login.html";

        // Show/hide logout
        logoutBtn.style.display = logged ? "inline-block" : "none";

        // Enable/disable other test buttons if present
        if (mockTestBtn) mockTestBtn.style.pointerEvents = logged ? "auto" : "none";
        if (chapTestBtn) chapTestBtn.style.pointerEvents = logged ? "auto" : "none";
        if (subTestBtn) subTestBtn.style.pointerEvents = logged ? "auto" : "none";
        if (pyqTestBtn) pyqTestBtn.style.pointerEvents = logged ? "auto" : "none";
    }

    updateUI();

    // Protect test buttons
    if (mockTestBtn) mockTestBtn.addEventListener("click", e => { if (!isLoggedIn()) { e.preventDefault(); alert("Please log in first to access the Mock Test."); }});
    if (chapTestBtn) chapTestBtn.addEventListener("click", e => { if (!isLoggedIn()) { e.preventDefault(); alert("Please log in first to access the Chapterwise Test."); }});
    if (subTestBtn) subTestBtn.addEventListener("click", e => { if (!isLoggedIn()) { e.preventDefault(); alert("Please log in first to access the Subjectwise Test."); }});
    if (pyqTestBtn) pyqTestBtn.addEventListener("click", e => { if (!isLoggedIn()) { e.preventDefault(); alert("Please log in first to access the PYQ Test."); }});

    // Logout functionality
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
            window.location.href = "login.html";
        });
    }

    // Handle Registration
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const name = document.getElementById("name").value.trim();
            const email = document.getElementById("email").value.trim();
            const phone = document.getElementById("phone").value.trim();
            const password = document.getElementById("password").value.trim();

            if (!name || !email || !phone || !password) {
                alert("All fields are required.");
                return;
            }

            try {
                const response = await fetch("http://localhost:5000/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, phone, password })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.msg || "Registration failed");
                alert("Registration successful! Please log in.");
                window.location.href = "login.html";
            } catch (error) {
                console.error("Registration error:", error);
                alert(error.message);
            }
        });
    }

    // Handle Login
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value.trim();

            if (!email || !password) {
                alert("Please enter both email and password.");
                return;
            }

            try {
                const response = await fetch("http://localhost:5000/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.msg || "Invalid credentials");
                localStorage.setItem("token", data.token);
                localStorage.setItem("userData", JSON.stringify(data.user || data));
                alert("Login successful!");
                window.location.href = "index.html";
            } catch (error) {
                console.error("Login error:", error);
                alert(error.message);
            }
        });
    }

    // Handle Forgot Password
    const forgotPasswordForm = document.getElementById("forgotPasswordForm");
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const email = document.getElementById("forgotEmail").value.trim();
            if (!email) { alert("Please enter your email."); return; }
            try {
                const response = await fetch("http://localhost:5000/api/auth/send-otp", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || "OTP request failed");
                localStorage.setItem("resetEmail", email);
                alert("OTP sent! Check your email.");
            } catch (error) {
                console.error("OTP error:", error);
                alert(error.message);
            }
        });
    }

    // Handle Reset Password
    const resetForm = document.getElementById("resetPasswordForm");
    if (resetForm) {
        resetForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const email = localStorage.getItem("resetEmail");
            const otp = document.getElementById("otp").value.trim();
            const newPassword = document.getElementById("newPassword").value.trim();
            if (!email) { alert("Email missing. Request OTP again."); return; }
            if (!otp || !newPassword) { alert("OTP and new password are required."); return; }
            try {
                const response = await fetch("http://localhost:5000/api/auth/reset-password", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, otp, newPassword })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || "Reset failed");
                alert("Password reset successful. You can now log in.");
                localStorage.removeItem("resetEmail");
                window.location.href = "login.html";
            } catch (error) {
                console.error("Reset error:", error);
                alert(error.message);
            }
        });
    }
});