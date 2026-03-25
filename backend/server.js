// ============================================================
// server.js - Main Express Server Entry Point
// Hotel Management System Backend
// Tech: Node.js + Express + MySQL + JWT
// ============================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================

// CORS - Allow frontend to communicate with backend
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// ============================================================
// ROUTES
// ============================================================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// ============================================================
// ROOT ROUTE - Serve the frontend
// ============================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============================================================
// API Health Check
// ============================================================
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Hotel Management System API is running!',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// ============================================================
// 404 Handler - Route not found
// ============================================================
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

// ============================================================
// Global Error Handler
// ============================================================
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.stack);
    res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║   🏨  HOTEL MANAGEMENT SYSTEM API       ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║   🚀 Server running on port: ${PORT}       ║`);
    console.log(`║   🌐 URL: http://localhost:${PORT}          ║`);
    console.log(`║   📊 Health: http://localhost:${PORT}/api/health ║`);
    console.log('╚════════════════════════════════════════╝');
    console.log('');
});

module.exports = app;
