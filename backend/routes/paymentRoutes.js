// ============================================================
// routes/paymentRoutes.js
// ============================================================
const express = require('express');
const router = express.Router();
const { processPayment, getInvoice, getAllPayments, getRevenueReport } = require('../controllers/paymentController');
const { verifyToken, adminOnly } = require('../middleware/auth');

router.post('/', verifyToken, processPayment);
router.get('/invoice/:bookingId', verifyToken, getInvoice);
router.get('/', adminOnly, getAllPayments);
router.get('/report', adminOnly, getRevenueReport);

module.exports = router;

// ============================================================
// routes/adminRoutes.js  (save this section separately)
// ============================================================
