// ============================================================
// routes/roomRoutes.js
// ============================================================
const express = require('express');
const router = express.Router();
const {
    getAllRooms, getAvailableRooms, getRoomById,
    createRoom, updateRoom, deleteRoom, getRoomTypes
} = require('../controllers/roomController');
const { verifyToken, adminOnly } = require('../middleware/auth');

// Public routes (no auth required)
router.get('/', getAllRooms);
router.get('/available', getAvailableRooms);
router.get('/types', getRoomTypes);
router.get('/:id', getRoomById);

// Admin only routes
router.post('/', adminOnly, createRoom);
router.put('/:id', adminOnly, updateRoom);
router.delete('/:id', adminOnly, deleteRoom);

module.exports = router;
