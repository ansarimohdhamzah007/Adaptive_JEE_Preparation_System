const db = require('../config/db');

class Student {
    // Register a new student
    static register(name, email, phone, hashedPassword, callback) {
        const sql = 'INSERT INTO students (name, email, phone, password) VALUES (?, ?, ?, ?)';
        db.query(sql, [name, email, phone, hashedPassword], callback);
    }

    // Find student by email
    static findByEmail(email, callback) {
        const sql = 'SELECT * FROM students WHERE email = ?';
        db.query(sql, [email], callback);
    }

    // Find student by phone
    static findByPhone(phone, callback) {
        const sql = 'SELECT * FROM students WHERE phone = ?';
        db.query(sql, [phone], callback);
    }

    // Find student by ID
    static findById(id, callback) {
        const sql = 'SELECT * FROM students WHERE id = ?';
        db.query(sql, [id], callback);
    }

    // Update password (for forgot password feature)
    static updatePassword(email, newHashedPassword, callback) {
        const sql = 'UPDATE students SET password = ? WHERE email = ?';
        db.query(sql, [newHashedPassword, email], callback);
    }

    // Delete a student (optional)
    static deleteByEmail(email, callback) {
        const sql = 'DELETE FROM students WHERE email = ?';
        db.query(sql, [email], callback);
    }
    
}

module.exports = Student;
