// ============================================================
// controllers/adminController.js
// Admin-specific operations: dashboard stats, user management
// ============================================================

const db = require('../config/database');

// ============================================================
// GET /api/admin/dashboard
// Dashboard statistics
// ============================================================
const getDashboardStats = async (req, res) => {
    try {
        // Total rooms
        const [[roomStats]] = await db.query(`
            SELECT
                COUNT(*) as total_rooms,
                SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
                SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
                SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved,
                SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
            FROM rooms WHERE is_active = TRUE
        `);

        // Total bookings
        const [[bookingStats]] = await db.query(`
            SELECT
                COUNT(*) as total_bookings,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END) as checked_in,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM bookings
        `);

        // Revenue stats
        const [[revenueStats]] = await db.query(`
            SELECT
                COALESCE(SUM(amount), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN MONTH(paid_at) = MONTH(NOW()) AND YEAR(paid_at) = YEAR(NOW()) THEN amount ELSE 0 END), 0) as this_month_revenue,
                COUNT(*) as total_payments
            FROM payments WHERE payment_status = 'completed'
        `);

        // Total customers
        const [[customerStats]] = await db.query(`
            SELECT COUNT(*) as total_customers FROM users WHERE role = 'customer'
        `);

        // Today's check-ins and check-outs
        const [[todayStats]] = await db.query(`
            SELECT
                SUM(CASE WHEN check_in_date = CURDATE() AND status != 'cancelled' THEN 1 ELSE 0 END) as todays_checkins,
                SUM(CASE WHEN check_out_date = CURDATE() AND status != 'cancelled' THEN 1 ELSE 0 END) as todays_checkouts
            FROM bookings
        `);

        // Recent bookings
        const [recentBookings] = await db.query(`
            SELECT b.booking_reference, b.status, b.total_amount, b.created_at,
                   u.name as guest_name, r.room_number, rt.type_name as room_type
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN rooms r ON b.room_id = r.id
            JOIN room_types rt ON r.room_type_id = rt.id
            ORDER BY b.created_at DESC LIMIT 5
        `);

        return res.status(200).json({
            success: true,
            stats: {
                rooms: roomStats,
                bookings: bookingStats,
                revenue: revenueStats,
                customers: customerStats,
                today: todayStats,
                recentBookings
            }
        });

    } catch (error) {
        console.error('Dashboard Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ============================================================
// GET /api/admin/users
// Get all customers
// ============================================================
const getAllUsers = async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
                   COUNT(b.id) as total_bookings,
                   COALESCE(SUM(p.amount), 0) as total_spent
            FROM users u
            LEFT JOIN bookings b ON u.id = b.user_id
            LEFT JOIN payments p ON b.id = p.booking_id AND p.payment_status = 'completed'
            WHERE u.role = 'customer'
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);

        return res.status(200).json({ success: true, count: users.length, users });

    } catch (error) {
        console.error('Get Users Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ============================================================
// PUT /api/admin/users/:id/toggle
// Toggle user active status
// ============================================================
const toggleUserStatus = async (req, res) => {
    try {
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const newStatus = !users[0].is_active;
        await db.query('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, req.params.id]);

        return res.status(200).json({
            success: true,
            message: `User ${newStatus ? 'activated' : 'deactivated'} successfully.`
        });

    } catch (error) {
        console.error('Toggle User Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { getDashboardStats, getAllUsers, toggleUserStatus };
