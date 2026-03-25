// ============================================================
// controllers/roomController.js
// Room management - CRUD operations and availability search
// ============================================================

const db = require('../config/database');

// ============================================================
// GET /api/rooms
// Get all rooms with filters (public)
// ============================================================
const getAllRooms = async (req, res) => {
    try {
        const { type, status, minPrice, maxPrice, floor } = req.query;

        let query = `
            SELECT r.*, rt.type_name, rt.description as type_description,
                   rt.max_occupancy, rt.amenities
            FROM rooms r
            JOIN room_types rt ON r.room_type_id = rt.id
            WHERE r.is_active = TRUE
        `;
        const params = [];

        // Apply optional filters
        if (type) { query += ' AND rt.type_name = ?'; params.push(type); }
        if (status) { query += ' AND r.status = ?'; params.push(status); }
        if (minPrice) { query += ' AND r.price_per_night >= ?'; params.push(minPrice); }
        if (maxPrice) { query += ' AND r.price_per_night <= ?'; params.push(maxPrice); }
        if (floor) { query += ' AND r.floor = ?'; params.push(floor); }

        query += ' ORDER BY r.room_number';

        const [rooms] = await db.query(query, params);

        // Parse amenities JSON string for each room
        const roomsWithAmenities = rooms.map(room => ({
            ...room,
            amenities: JSON.parse(room.amenities || '[]')
        }));

        return res.status(200).json({ success: true, count: rooms.length, rooms: roomsWithAmenities });

    } catch (error) {
        console.error('Get Rooms Error:', error);
        return res.status(500).json({ success: false, message: 'Server error fetching rooms.' });
    }
};

// ============================================================
// GET /api/rooms/available
// Search available rooms by date range
// ============================================================
const getAvailableRooms = async (req, res) => {
    try {
        const { checkIn, checkOut, guests, type } = req.query;

        if (!checkIn || !checkOut) {
            return res.status(400).json({ success: false, message: 'Check-in and check-out dates required.' });
        }

        if (new Date(checkIn) >= new Date(checkOut)) {
            return res.status(400).json({ success: false, message: 'Check-out must be after check-in.' });
        }

        // Find rooms NOT booked during the requested dates
        let query = `
            SELECT r.*, rt.type_name, rt.max_occupancy, rt.amenities,
                   rt.description as type_description
            FROM rooms r
            JOIN room_types rt ON r.room_type_id = rt.id
            WHERE r.is_active = TRUE
              AND r.status = 'available'
              AND r.id NOT IN (
                  SELECT DISTINCT room_id FROM bookings
                  WHERE status NOT IN ('cancelled', 'checked_out')
                    AND check_in_date < ?
                    AND check_out_date > ?
              )
        `;
        const params = [checkOut, checkIn];

        if (type) { query += ' AND rt.type_name = ?'; params.push(type); }
        if (guests) { query += ' AND rt.max_occupancy >= ?'; params.push(parseInt(guests)); }

        query += ' ORDER BY r.price_per_night';

        const [rooms] = await db.query(query, params);

        const roomsWithAmenities = rooms.map(room => ({
            ...room,
            amenities: JSON.parse(room.amenities || '[]')
        }));

        return res.status(200).json({
            success: true,
            count: rooms.length,
            checkIn,
            checkOut,
            rooms: roomsWithAmenities
        });

    } catch (error) {
        console.error('Available Rooms Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ============================================================
// GET /api/rooms/:id
// Get single room details
// ============================================================
const getRoomById = async (req, res) => {
    try {
        const [rooms] = await db.query(`
            SELECT r.*, rt.type_name, rt.max_occupancy, rt.amenities, rt.description as type_description
            FROM rooms r
            JOIN room_types rt ON r.room_type_id = rt.id
            WHERE r.id = ? AND r.is_active = TRUE
        `, [req.params.id]);

        if (rooms.length === 0) {
            return res.status(404).json({ success: false, message: 'Room not found.' });
        }

        const room = { ...rooms[0], amenities: JSON.parse(rooms[0].amenities || '[]') };

        // Also get reviews for this room
        const [reviews] = await db.query(`
            SELECT rv.*, u.name as user_name
            FROM reviews rv
            JOIN users u ON rv.user_id = u.id
            WHERE rv.room_id = ?
            ORDER BY rv.created_at DESC LIMIT 5
        `, [req.params.id]);

        return res.status(200).json({ success: true, room, reviews });

    } catch (error) {
        console.error('Get Room Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ============================================================
// POST /api/rooms  [Admin Only]
// Create a new room
// ============================================================
const createRoom = async (req, res) => {
    try {
        const { room_number, room_type_id, floor, price_per_night, description } = req.body;

        if (!room_number || !room_type_id || !price_per_night) {
            return res.status(400).json({ success: false, message: 'Room number, type, and price are required.' });
        }

        // Check if room number already exists
        const [existing] = await db.query('SELECT id FROM rooms WHERE room_number = ?', [room_number]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: `Room ${room_number} already exists.` });
        }

        const [result] = await db.query(
            'INSERT INTO rooms (room_number, room_type_id, floor, price_per_night, description) VALUES (?, ?, ?, ?, ?)',
            [room_number, room_type_id, floor || 1, price_per_night, description || '']
        );

        return res.status(201).json({
            success: true,
            message: `Room ${room_number} created successfully.`,
            roomId: result.insertId
        });

    } catch (error) {
        console.error('Create Room Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ============================================================
// PUT /api/rooms/:id  [Admin Only]
// Update room details
// ============================================================
const updateRoom = async (req, res) => {
    try {
        const { room_type_id, floor, price_per_night, status, description } = req.body;

        const [result] = await db.query(
            `UPDATE rooms SET
                room_type_id = COALESCE(?, room_type_id),
                floor = COALESCE(?, floor),
                price_per_night = COALESCE(?, price_per_night),
                status = COALESCE(?, status),
                description = COALESCE(?, description)
             WHERE id = ?`,
            [room_type_id, floor, price_per_night, status, description, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Room not found.' });
        }

        return res.status(200).json({ success: true, message: 'Room updated successfully.' });

    } catch (error) {
        console.error('Update Room Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ============================================================
// DELETE /api/rooms/:id  [Admin Only]
// Soft delete a room (set is_active = false)
// ============================================================
const deleteRoom = async (req, res) => {
    try {
        // Check if room has active bookings
        const [bookings] = await db.query(
            "SELECT id FROM bookings WHERE room_id = ? AND status IN ('pending','confirmed','checked_in')",
            [req.params.id]
        );

        if (bookings.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete room with active bookings. Cancel bookings first.'
            });
        }

        await db.query('UPDATE rooms SET is_active = FALSE WHERE id = ?', [req.params.id]);

        return res.status(200).json({ success: true, message: 'Room deleted successfully.' });

    } catch (error) {
        console.error('Delete Room Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ============================================================
// GET /api/rooms/types
// Get all room types
// ============================================================
const getRoomTypes = async (req, res) => {
    try {
        const [types] = await db.query('SELECT * FROM room_types ORDER BY base_price');
        const typesWithAmenities = types.map(t => ({
            ...t,
            amenities: JSON.parse(t.amenities || '[]')
        }));
        return res.status(200).json({ success: true, types: typesWithAmenities });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { getAllRooms, getAvailableRooms, getRoomById, createRoom, updateRoom, deleteRoom, getRoomTypes };
