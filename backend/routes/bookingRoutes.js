// ============================================================
// routes/bookingRoutes.js
// ============================================================
const express = require('express');
const router = express.Router();
const {
    createBooking, getMyBookings, getBookingById, modifyBooking,
    cancelBooking, getAllBookings, updateBookingStatus
} = require('../controllers/bookingController');
const { verifyToken, adminOnly } = require('../middleware/auth');

router.post('/', verifyToken, createBooking);
router.get('/my', verifyToken, getMyBookings);
router.get('/', adminOnly, getAllBookings);
router.get('/:id', verifyToken, getBookingById);
router.put('/:id', verifyToken, modifyBooking);
router.put('/:id/status', adminOnly, updateBookingStatus);
router.post('/:id/cancel', verifyToken, cancelBooking);

module.exports = router;
