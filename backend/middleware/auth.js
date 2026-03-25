// ============================================================
// middleware/auth.js
// JWT Authentication & Authorization Middleware
// ============================================================

const jwt = require('jsonwebtoken');
require('dotenv').config();

// ----- Verify JWT Token -----
const verifyToken = (req, res, next) => {
    // Get token from Authorization header: "Bearer <token>"
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.'
        });
    }

    try {
        // Verify and decode the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach user info to request
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token. Please login again.'
        });
    }
};

// ----- Admin Only Middleware -----
const adminOnly = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }
        next();
    });
};

// ----- Customer Only Middleware -----
const customerOnly = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.role !== 'customer') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Customer account required.'
            });
        }
        next();
    });
};

module.exports = { verifyToken, adminOnly, customerOnly };
