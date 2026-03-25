// ============================================================
// controllers/paymentController.js
// Handles payments, invoices, billing
// ============================================================

const db = require('../config/database');

// ----- Helper: Generate payment reference -----
const generatePaymentRef = () => {
    const timestamp = Date.now();
    return `PAY-${timestamp}`;
};

// ----- Helper: Generate invoice number -----
const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 90000) + 10000;
    return `INV-${year}-${random}`;
};

// ============================================================
// POST /api/payments
// Process payment for a booking
// ============================================================
const processPayment = async (req, res) => {
    try {
        const { booking_id, payment_method } = req.body;

        if (!booking_id || !payment_method) {
            return res.status(400).json({ success: false, message: 'Booking ID and payment method are required.' });
        }

        // Get booking details
        const [bookings] = await db.query(`
            SELECT b.*, u.name as guest_name, u.email as guest_email
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            WHERE b.id = ?
        `, [booking_id]);

        if (bookings.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        const booking = bookings[0];

        // Customers can only pay for their own bookings
        if (req.user.role === 'customer' && booking.user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        // Check if already paid
        const [existingPayment] = await db.query(
            "SELECT id FROM payments WHERE booking_id = ? AND payment_status = 'completed'",
            [booking_id]
        );
        if (existingPayment.length > 0) {
            return res.status(400).json({ success: false, message: 'This booking is already paid.' });
        }

        if (booking.status === 'cancelled') {
            return res.status(400).json({ success: false, message: 'Cannot pay for a cancelled booking.' });
        }

        // Simulate payment processing (In production, integrate Stripe/Razorpay)
        const paymentRef = generatePaymentRef();
        const transactionId = `TXN${Date.now()}`;

        // Insert payment record
        const [paymentResult] = await db.query(`
            INSERT INTO payments
            (booking_id, payment_reference, amount, payment_method, payment_status, transaction_id, paid_at)
            VALUES (?, ?, ?, ?, 'completed', ?, NOW())
        `, [booking_id, paymentRef, booking.total_amount, payment_method, transactionId]);

        // Update booking status to confirmed
        await db.query("UPDATE bookings SET status = 'confirmed' WHERE id = ?", [booking_id]);

        // Generate invoice
        const invoiceNumber = generateInvoiceNumber();
        const taxRate = parseFloat(process.env.TAX_RATE || 18);

        await db.query(`
            INSERT INTO invoices
            (invoice_number, booking_id, payment_id, subtotal, tax_rate, tax_amount, total_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [invoiceNumber, booking_id, paymentResult.insertId,
            booking.subtotal, taxRate, booking.tax_amount, booking.total_amount]);

        return res.status(200).json({
            success: true,
            message: 'Payment processed successfully!',
            payment: {
                payment_reference: paymentRef,
                transaction_id: transactionId,
                amount: booking.total_amount,
                payment_method,
                status: 'completed',
                invoice_number: invoiceNumber
            }
        });

    } catch (error) {
        console.error('Payment Error:', error);
        return res.status(500).json({ success: false, message: 'Payment processing failed.' });
    }
};

// ============================================================
// GET /api/payments/invoice/:bookingId
// Get invoice for a booking
// ============================================================
const getInvoice = async (req, res) => {
    try {
        const [invoices] = await db.query(`
            SELECT i.*, b.booking_reference, b.check_in_date, b.check_out_date,
                   b.total_nights, b.price_per_night, b.num_guests, b.special_requests,
                   r.room_number, rt.type_name as room_type,
                   u.name as guest_name, u.email as guest_email, u.phone as guest_phone,
                   p.payment_method, p.transaction_id, p.paid_at
            FROM invoices i
            JOIN bookings b ON i.booking_id = b.id
            JOIN rooms r ON b.room_id = r.id
            JOIN room_types rt ON r.room_type_id = rt.id
            JOIN users u ON b.user_id = u.id
            LEFT JOIN payments p ON i.payment_id = p.id
            WHERE i.booking_id = ?
        `, [req.params.bookingId]);

        if (invoices.length === 0) {
            return res.status(404).json({ success: false, message: 'Invoice not found.' });
        }

        const invoice = invoices[0];

        if (req.user.role === 'customer' && invoice.user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        return res.status(200).json({ success: true, invoice });

    } catch (error) {
        console.error('Invoice Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ============================================================
// GET /api/payments  [Admin Only]
// Get all payments
// ============================================================
const getAllPayments = async (req, res) => {
    try {
        const [payments] = await db.query(`
            SELECT p.*, b.booking_reference, u.name as guest_name,
                   r.room_number, rt.type_name as room_type
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            JOIN users u ON b.user_id = u.id
            JOIN rooms r ON b.room_id = r.id
            JOIN room_types rt ON r.room_type_id = rt.id
            ORDER BY p.created_at DESC
        `);

        return res.status(200).json({ success: true, count: payments.length, payments });

    } catch (error) {
        console.error('All Payments Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ============================================================
// GET /api/payments/report  [Admin Only]
// Generate revenue report
// ============================================================
const getRevenueReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Total revenue
        const [totalRevenue] = await db.query(`
            SELECT
                COUNT(*) as total_payments,
                SUM(amount) as total_revenue,
                AVG(amount) as avg_booking_value
            FROM payments
            WHERE payment_status = 'completed'
            ${startDate ? 'AND paid_at >= ?' : ''}
            ${endDate ? 'AND paid_at <= ?' : ''}
        `, [startDate, endDate].filter(Boolean));

        // Revenue by room type
        const [revenueByType] = await db.query(`
            SELECT rt.type_name, COUNT(b.id) as bookings, SUM(p.amount) as revenue
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            JOIN rooms r ON b.room_id = r.id
            JOIN room_types rt ON r.room_type_id = rt.id
            WHERE p.payment_status = 'completed'
            GROUP BY rt.type_name
            ORDER BY revenue DESC
        `);

        // Monthly revenue
        const [monthlyRevenue] = await db.query(`
            SELECT
                DATE_FORMAT(paid_at, '%Y-%m') as month,
                COUNT(*) as bookings,
                SUM(amount) as revenue
            FROM payments
            WHERE payment_status = 'completed'
            GROUP BY DATE_FORMAT(paid_at, '%Y-%m')
            ORDER BY month DESC
            LIMIT 12
        `);

        // Room occupancy stats
        const [occupancyStats] = await db.query(`
            SELECT
                r.room_number, rt.type_name,
                COUNT(b.id) as total_bookings,
                SUM(b.total_nights) as total_nights_booked
            FROM rooms r
            JOIN room_types rt ON r.room_type_id = rt.id
            LEFT JOIN bookings b ON r.id = b.room_id AND b.status NOT IN ('cancelled')
            GROUP BY r.id
            ORDER BY total_bookings DESC
        `);

        return res.status(200).json({
            success: true,
            report: {
                summary: totalRevenue[0],
                byRoomType: revenueByType,
                monthly: monthlyRevenue,
                occupancy: occupancyStats
            }
        });

    } catch (error) {
        console.error('Report Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { processPayment, getInvoice, getAllPayments, getRevenueReport };
