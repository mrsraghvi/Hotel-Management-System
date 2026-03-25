// ============================================================
// routes/adminRoutes.js
// ============================================================
const express = require('express');
const router = express.Router();
const { getDashboardStats, getAllUsers, toggleUserStatus } = require('../controllers/adminController');
const { adminOnly } = require('../middleware/auth');

router.get('/dashboard', adminOnly, getDashboardStats);
router.get('/users', adminOnly, getAllUsers);
router.put('/users/:id/toggle', adminOnly, toggleUserStatus);

module.exports = router;
