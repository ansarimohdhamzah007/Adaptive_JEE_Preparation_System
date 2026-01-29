require('dotenv').config();
const express = require("express");
const fs = require("fs");
const cors = require("cors");
const csv = require("csv-parser");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/authRoutes");
const mockTestRoutes = require("./routes/mockTestRoutes");
const analyticsRouter = require('./routes/analytics');
const db = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Check Database Connection
db.query("SELECT 1", (err, results) => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("✅ Database connected successfully.");
    }
});

// ✅ Allow specific frontend origins
const allowedOrigins = ["http://127.0.0.1:5500", "http://localhost:3000"];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));

// ✅ Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/mock", mockTestRoutes); //  Mock Test API mounted here
app.use('/api/analytics', analyticsRouter);

// ✅ Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
