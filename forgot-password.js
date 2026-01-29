const backendUrl = 'http://localhost:5000/api/auth';

function sendOTP() {
    const email = document.getElementById('email').value;
    if (!email) {
        alert('Please enter a valid email');
        return;
    }

    fetch(`${backendUrl}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error('Failed to send OTP');
        }
        return res.json();
    })
    .then(data => {
        console.log(data); // Log response for debugging
        alert(data.msg);
        document.getElementById('otpSection').style.display = 'block'; // Show OTP section
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error sending OTP. Please try again.');
    });
}

function verifyOTP() {
    const email = document.getElementById('email').value;
    const otp = document.getElementById('otp').value;

    if (!otp || otp.length !== 6) { // Assuming OTP length is 6
        alert('Please enter a valid OTP');
        return;
    }

    fetch(`${backendUrl}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error('Failed to verify OTP');
        }
        return res.json();
    })
    .then(data => {
        console.log(data); // Log response for debugging
        alert(data.msg);
        document.getElementById('passwordSection').style.display = 'block'; // Show password reset section
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error verifying OTP. Please try again.');
    });
}

function resetPassword() {
    const email = document.getElementById('email').value;
    const newPassword = document.getElementById('newPassword').value;
    const otp = document.getElementById('otp').value;

    if (!newPassword || newPassword.length < 6) {
        alert('Please enter a valid password (at least 6 characters)');
        return;
    }

    if (!otp || otp.length !== 6) {
        alert('Please enter a valid OTP');
        return;
    }

    fetch(`${backendUrl}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword, otp })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error('Failed to reset password');
        }
        return res.json();
    })
    .then(data => {
        console.log(data); // Log response for debugging
        alert(data.msg);
        window.location.href = "login.html"; 
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error resetting password. Please try again.');
    });
}
