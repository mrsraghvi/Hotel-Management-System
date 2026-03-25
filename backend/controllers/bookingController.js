// ============================================================
// controllers/bookingController.js
// Handles booking creation, modification, cancellation
// ============================================================

const db = require('../config/database');

// ----- Helper: Generate unique booking reference -----
const generateBookingRef = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 90000) + 10000;
    return `HMS-${year}-${random}`;
};

// ----- Helper: Calculate nights between dates -----
const calculateNights = (checkIn, checkOut) => {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
};

// ============================================================
// POST /api/bookings
// Create a new booking (Customer)
// ============================================================
const createBooking = async (req, res) => {
    try {
        const { room_id, check_in_date, check_out_date, num_guests, special_requests } = req.body;
        const user_id = req.user.id;

        // Validate required fields
        if (!room_id || !check_in_date || !check_out_date) {
            return res.status(400).json({ success: false, message: 'Room, check-in, and check-out dates are required.' });
        }

        const checkIn = new Date(check_in_date);
        const checkOut = new Date(check_out_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (checkIn < today) {
            return res.status(400).json({ success: false, message: 'Check-in date cannot be in the past.' });
        }
        if (checkOut <= checkIn) {
            return res.status(400).json({ success: false, message: 'Check-out must be after check-in.' });
        }

        // Verify room exists and is available
        const [rooms] = await db.query(
            "SELECT r.*, rt.type_name FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id WHERE r.id = ? AND r.is_active = TRUE",
            [room_id]
        );
        if (rooms.length === 0) {
            return res.status(404).json({ success: false, message: 'Room not found.' });
        }

        const room = rooms[0];
        if (room.status === 'maintenance') {
            return res.status(400).json({ success: false, message: 'Room is under maintenance.' });
        }

        // Check if room is already booked for these dates
        const [conflicts] = await db.query(`
            SELECT id FROM bookings
            WHERE room_id = ?
              AND status NOT IN ('cancelled', 'checked_out')
              AND check_in_date < ?
              AND check_out_date > ?
        `, [room_id, check_out_date, check_in_date]);

        if (conflicts.length > 0) {
            return res.status(409).json({ success: false, message: 'Room is already booked for selected dates.' });
        }

        // Calculate pricing
        const totalNights = calculateNights(check_in_date, check_out_date);
        const pricePerNight = parseFloat(room.price_per_night);
        const subtotal = pricePerNight * totalNights;
        const taxRate = parseFloat(process.env.TAX_RATE || 18) / 100;
        const taxAmount = subtotal * taxRate;
        const totalAmount = subtotal + taxAmount;

        // Generate unique booking reference
        const bookingRef = generateBookingRef();

        // Insert booking record
        const [result] = await db.query(`
            INSERT INTO bookings
            (booking_reference, user_id, room_id, check_in_date, check_out_date,
             num_guests, total_nights, price_per_night, subtotal, tax_amount, total_amount,
             special_requests, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `, [bookingRef, user_id, room_id, check_in_date, check_out_date,
            num_guests || 1, totalNights, pricePerNight, subtotal, taxAmount, totalAmount,
            special_requests || '']);

        // Update room status to 'reserved'
        await db.query("UPDATE rooms SET status = 'reserved' WHERE id = ?", [room_id]);

        return res.status(201).json({
            success: true,
            message: 'Booking created successfully!',
            booking: {
                id: result.insertId,
                booking_reference: bookingRef,
                room_number: room.room_number,
                room_type: room.type_name,
                check_in_date,
                check_out_date,
                total_nights: totalNights,
                price_per_night: pricePerNight,
                subtotal,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('Create Booking Error:', error);
        return res.status(500).json({ success: false, message: 'Server error creating booking.' });
    }
};

// ============================================================
// GET /api/bookings/my
// Get current user's booking history
// ============================================================
const getMyBookings = async (req, res) => {
    try {
        const [bookings] = await db.query(`
            SELECT b.*, r.room_number, rt.type_name as room_type,
                   p.payment_status, p.payment_method, p.paid_at
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            JOIN room_types rt ON r.room_type_id = rt.id
            LEFT JOIN payments p ON b.id = p.booking_id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        `, [req.user.id]);

        return res.status(200).json({ success: true, count: bookings.length, bookings });

    } catch (error) {
        console.error('My Bookings Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ============================================================
// GET /api/bookings/:id
// Get single booking details
// ============================================================
const getBookingById = async (req, res) => {
    try {
        const [bookings] = await db.query(`
            SELECT b.*, r.room_number, r.floor, rt.type_name as room_type,
                   rt.amenities, u.name as guest_name, u.email as guest_email, u.phone as guest_phone,
                   p.payment_status, p.payment_method, p.transaction_id, p.paid_at
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            JOIN room_types rt ON r.room_type_id = rt.id
            JOIN users u ON b.user_id = u.id
            LEFT JOIN payments p ON b.id = p.booking_id
            WHERE b.id = ?
        `, [req.params.id]);

        if (bookings.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        const booking = bookings[0];

        // Customers can only see their own bookings
        if (req.user.role === 'customer' && booking.user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        booking.amenities = JSON.parse(booking.amenities || '[]');
        return res.status(200).json({ success: true, booking });

    } catch (error) {
        console.error('Get Booking Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ============================================================
// PUT /api/bookings/:id
// Modify a booking (Customer - limited fields)
// ============================================================
const modifyBooking = async (req, res) => {
    try {
        const { check_in_date, check_out_date, num_guests, special_requests } = req.body;
        const bookingId = req.params.id;

        // Get current booking
        const [bookings] = await db.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        if (bookings.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        const booking = bookings[0];

        // Only the booking owner or admin can modify
        if (req.user.role === 'customer' && booking.user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        // Cannot modify if checked-in, checked-out, or cancelled
        if (['checked_in', 'checked_out', 'cancelled'].includes(booking.status)) {
            return res.status(400).json({ success: false, message: `Cannot modify a ${booking.status} booking.` });
        }

        const newCheckIn = check_in_date || booking.check_in_date;
        const newCheckOut = check_out_date || booking.check_out_date;
        const totalNights = calculateNights(newCheckIn, newCheckOut);
        const subtotal = booking.price_per_night * totalNights;
        const taxAmount = subtotal * (parseFloat(process.env.TAX_RATE || 18) / 100);
        const totalAmount = subtotal + taxAmount;

        await db.query(`
            UPDATE bookings SET
                check_in_date = ?, check_out_date = ?,
                num_guests = COALESCE(?, num_guests),
                special_requests = COALESCE(?, special_requests),
                total_nights = ?, subtotal = ?, tax_amount = ?, total_amount = ?
            WHERE id = ?
        `, [newCheckIn, newCheckOut, num_guests, special_requests,
            totalNights, subtotal, taxAmount, totalAmount, bookingId]);

        return res.status(200).json({
            success: true,
            message: 'Booking modified successfully.',
            updatedPricing: { total_nights: totalNights, subtotal, tax_amount: taxAmount, total_amount: totalAmount }
        });

    } catch (error) {
        console.error('Modify Booking Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ============================================================
// DELETE /api/bookings/:id/cancel
// Cancel a booking
// ============================================================
const cancelBooking = async (req, res) => {
    try {
        const { cancellation_reason } = req.body;
        const bookingId = req.params.id;

        const [bookings] = await db.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        if (bookings.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        const booking = bookings[0];

        if (req.user.role === 'customer' && booking.user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        if (['cancelled', 'checked_out'].includes(booking.status)) {
            return res.status(400).json({ success: false, message: `Booking is already ${booking.status}.` });
        }

        // Cancel the booking
        await db.query(
            "UPDATE bookings SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = ? WHERE id = ?",
            [cancellation_reason || 'Cancelled by user', bookingId]
        );

        // Free up the room
        await db.query("UPDATE rooms SET status = 'available' WHERE id = ?", [booking.room_id]);

        return res.status(200).json({ success: true, message: 'Booking cancelled successfully.' });

    } catch (error) {
        console.error('Cancel Booking Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ============================================================
// GET /api/bookings  [Admin Only]
// Get all bookings with filters
// ============================================================
const getAllBookings = async (req, res) => {
    try {
        const { status, date, search } = req.query;

        let query = `
            SELECT b.*, r.room_number, rt.type_name as room_type,
                   u.name as guest_name, u.email as guest_email,
                   p.payment_status
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            JOIN room_types rt ON r.room_type_id = rt.id
            JOIN users u ON b.user_id = u.id
            LEFT JOIN payments p ON b.id = p.booking_id
            WHERE 1=1
        `;
        const params = [];

        if (status) { query += ' AND b.status = ?'; params.push(status); }
        if (date) { query += ' AND DATE(b.check_in_date) = ?'; params.push(date); }
        if (search) {
            query += ' AND (u.name LIKE ? OR b.booking_reference LIKE ? OR r.room_number LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY b.created_at DESC';

        const [bookings] = await db.query(query, params);
        return res.status(200).json({ success: true, count: bookings.length, bookings });

    } catch (error) {
        console.error('All Bookings Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ============================================================
// PUT /api/bookings/:id/status  [Admin Only]
// Admin updates booking status (confirm, check-in, check-out)
// ============================================================
const updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status.' });
        }

        const [bookings] = await db.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
        if (bookings.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        const booking = bookings[0];
        await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);

        // Update room status based on booking status
        if (status === 'checked_in') {
            await db.query("UPDATE rooms SET status = 'occupied' WHERE id = ?", [booking.room_id]);
        } else if (status === 'checked_out' || status === 'cancelled') {
            await db.query("UPDATE rooms SET status = 'available' WHERE id = ?", [booking.room_id]);
        }

        return res.status(200).json({ success: true, message: `Booking status updated to ${status}.` });

    } catch (error) {
        console.error('Update Booking Status Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = {
    createBooking, getMyBookings, getBookingById, modifyBooking,
    cancelBooking, getAllBookings, updateBookingStatus
};
