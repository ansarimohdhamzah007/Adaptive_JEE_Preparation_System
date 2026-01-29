const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/studentModel');
const nodemailer = require('nodemailer');
require('dotenv').config();
const db = require('../config/db'); // Database connection

// **Register New User**
const register = (req, res) => {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
        return res.status(400).json({ msg: 'All fields are required' });
    }

    Student.findByEmail(email, (err, results) => {
        if (results.length > 0) return res.status(400).json({ msg: 'Email already registered' });

        const hashedPassword = bcrypt.hashSync(password, 10);
        Student.register(name, email, phone, hashedPassword, (err, student_id) => {
            if (err) return res.status(500).json({ msg: 'Error registering user' });

            console.log("Registered Student ID:", student_id); // Debugging

            //    Send student_id in response
            res.json({ msg: 'Registration successful', student_id });
        });
    });
};

// **Login User**
const login = (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ msg: 'Email and password are required' });

    Student.findByEmail(email, (err, results) => {
        if (err) return res.status(500).json({ msg: 'Database error' });
        if (results.length === 0) return res.status(404).json({ msg: 'User not found. Please register first.' });

        const user = results[0];
        console.log("Fetched User Data:", user); // Debugging

        if (!bcrypt.compareSync(password, user.password)) {
            return res.status(400).json({ msg: 'Incorrect password. Please try again.' });
        }

        const tokenPayload = { id: user.id, name: user.name, email: user.email, phone: user.phone };
        console.log("Token Payload:", tokenPayload); // Debugging

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '10d' });

        console.log("Sending Response:", { msg: "Login successful", token, student_id: user.id });

        //    Send student_id in response
        res.json({ msg: "Login successful", token, student_id: user.id });
    });
};

// **Send OTP for Password Reset**
const sendOTP = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: 'Email is required' });

    Student.findByEmail(email, async (err, results) => {
        if (err) return res.status(500).json({ msg: 'Database error' });
        if (results.length === 0) return res.status(404).json({ msg: 'User not found' });

        const otp = Math.floor(100000 + Math.random() * 900000);
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

        // Setup email transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Reset Password OTP - JEE Buddy',
                text: `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`
            });

            db.query("UPDATE students SET otp = ?, otp_expiry = ? WHERE email = ?", [otp, expiry, email], (err) => {
                if (err) return res.status(500).json({ msg: 'Error storing OTP' });
                res.json({ msg: 'OTP sent to email' });
            });

        } catch (error) {
            return res.status(500).json({ msg: 'Error sending OTP email' });
        }
    });
};

// **Verify OTP**
const verifyOTP = (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ msg: 'Email and OTP required' });

    db.query("SELECT otp, otp_expiry FROM students WHERE email = ?", [email], (err, results) => {
        if (err) return res.status(500).json({ msg: 'Server error' });
        if (results.length === 0) return res.status(404).json({ msg: 'User not found' });

        const user = results[0];

        if (!user.otp || user.otp_expiry < new Date()) {
            return res.status(400).json({ msg: 'OTP expired or invalid' });
        }

        if (Number(user.otp) !== Number(otp)) {
            return res.status(400).json({ msg: 'Incorrect OTP' });
        }

        res.json({ msg: 'OTP verified successfully' });
    });
};

// **Reset Password**
const resetPassword = async (req, res) => {
    const { email, newPassword, otp } = req.body;
    if (!email || !newPassword || !otp) return res.status(400).json({ msg: 'All fields are required' });

    db.query("SELECT otp, otp_expiry FROM students WHERE email = ?", [email], async (err, results) => {
        if (err) return res.status(500).json({ msg: 'Server error' });
        if (results.length === 0) return res.status(404).json({ msg: 'User not found' });

        const user = results[0];

        if (!user.otp || user.otp_expiry < new Date()) {
            return res.status(400).json({ msg: 'OTP expired or invalid' });
        }

        if (Number(user.otp) !== Number(otp)) {
            return res.status(400).json({ msg: 'Incorrect OTP' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        db.query("UPDATE students SET password = ?, otp = NULL, otp_expiry = NULL WHERE email = ?", [hashedPassword, email], (err) => {
            if (err) return res.status(500).json({ msg: 'Error updating password' });
            res.json({ msg: 'Password reset successful' });
        });
    });
};

// **Get Dashboard Details**
const getDashboardDetails = async (req, res) => {
    console.log("User data from token:", req.user); 

    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized - User not found" });
    }

    return res.status(200).json({
        name: req.user.name || "Unknown",
        email: req.user.email || "N/A",
        phone: req.user.phone || "N/A",
        id:    req.user.id
    });
};

const getStudentDetails = async (req, res) => {
    try {
        const studentId = req.user?.id; // <-- FIXED HERE
        if (!studentId) return res.status(401).json({ msg: "Unauthorized" });

        const query = 'SELECT id, name, email, phone FROM students WHERE id = ?';
        db.query(query, [studentId], (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ msg: "Server error" });
            }

            if (results.length === 0) {
                return res.status(404).json({ msg: "Student not found" });
            }

            const student = results[0];
            res.json({ id: student.id, name: student.name, email: student.email, phone: student.phone });
        });
    } catch (error) {
        console.error("Error fetching student details:", error);
        res.status(500).json({ msg: "Server error" });
    }
};


module.exports = { register, login, sendOTP, verifyOTP, resetPassword, getDashboardDetails, getStudentDetails };
