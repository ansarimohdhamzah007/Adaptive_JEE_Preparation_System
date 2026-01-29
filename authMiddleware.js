const jwt = require("jsonwebtoken");

function authenticateUser(req, res, next) {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        console.error("No token provided");
        return res.status(401).json({ msg: "No token, authorization denied" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Log the decoded token to check if name, email, and phone exist
        console.log("Decoded Token:", decoded);

        req.user = decoded; // Attach decoded token data
        next();
    } catch (err) {
        console.error("Token verification failed:", err.message);
        return res.status(401).json({ msg: "Token is not valid" });
    }
}


module.exports = { authenticateUser };
