// backend/config/db.js
const mysql = require('mysql');
const { promisify } = require('util');
require('dotenv').config();

const db = mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error('Database Connection Failed:', err.message);
        return;
    }
    console.log('MySQL Database Connected Successfully');
});

// 🚀 Promisify query so we can use async/await
db.query = promisify(db.query);

module.exports = db;