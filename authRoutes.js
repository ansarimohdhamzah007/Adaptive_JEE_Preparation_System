const express = require('express');
const {
    register,
    login,
    sendOTP,
    verifyOTP,
    resetPassword,
    getDashboardDetails,
    getStudentDetails //    Make sure this is included
} = require('../controllers/authController'); // Import controllers properly
const { authenticateUser } = require("../middleware/authMiddleware"); //    Correct Import

const router = express.Router();

// Authentication Routes
router.post('/register', register);
router.post('/login', login);
router.get('/dashboard', authenticateUser, getDashboardDetails);
router.get("/student-details", authenticateUser, getStudentDetails); //    Fixed Import

// Forgot Password - OTP Flow
router.post('/send-otp', sendOTP); // Send OTP to Email
router.post('/verify-otp', verifyOTP); // Verify OTP
router.post('/reset-password', resetPassword);
router.get("/get-session", (req, res) => {
    if (!req.session || !req.session.student_id || !req.session.test_number) {
        return res.status(400).json({ error: "Session data missing" });
    }
    res.json({ student_id: req.session.student_id, test_number: req.session.test_number });
});
module.exports = router;
