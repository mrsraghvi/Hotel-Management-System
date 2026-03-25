// ============================================================
// controllers/authController.js
// Handles user registration, login, and profile
// ============================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
require('dotenv').config();

// ----- Helper: Generate JWT Token -----
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// ============================================================
// POST /api/auth/register
// Register a new customer
// ============================================================
const register = async (req, res) => {
    try {
        const { name, email, password, phone, address } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required.'
            });
        }

        // Check if email already exists
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered. Please login.'
            });
        }

        // Hash password with bcrypt (salt rounds = 10)
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const [result] = await db.query(
            'INSERT INTO users (name, email, password, phone, address, role) VALUES (?, ?, ?, ?, ?, "customer")',
            [name, email, hashedPassword, phone || null, address || null]
        );

        // Generate token for immediate login after registration
        const newUser = { id: result.insertId, email, role: 'customer', name };
        const token = generateToken(newUser);

        return res.status(201).json({
            success: true,
            message: 'Registration successful! Welcome to our hotel.',
            token,
            user: { id: result.insertId, name, email, role: 'customer', phone }
        });

    } catch (error) {
        console.error('Register Error:', error);
        return res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
};

// ============================================================
// POST /api/auth/login
// Login for both customers and admins
// ============================================================
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        // Find user by email
        const [users] = await db.query('SELECT * FROM users WHERE email = ? AND is_active = TRUE', [email]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const user = users[0];

        // Compare password with hashed version
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        // Generate JWT token
        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: `Welcome back, ${user.name}!`,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ success: false, message: 'Server error during login.' });
    }
};

// ============================================================
// GET /api/auth/profile
// Get logged-in user's profile
// ============================================================
const getProfile = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, name, email, phone, address, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        return res.status(200).json({ success: true, user: users[0] });

    } catch (error) {
        console.error('Profile Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ============================================================
// PUT /api/auth/profile
// Update logged-in user's profile
// ============================================================
const updateProfile = async (req, res) => {
    try {
        const { name, phone, address } = req.body;

        await db.query(
            'UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?',
            [name, phone, address, req.user.id]
        );

        return res.status(200).json({ success: true, message: 'Profile updated successfully.' });

    } catch (error) {
        console.error('Update Profile Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ============================================================
// PUT /api/auth/change-password
// Change user password
// ============================================================
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const [users] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        const isMatch = await bcrypt.compare(currentPassword, users[0].password);

        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }

        const hashedNew = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedNew, req.user.id]);

        return res.status(200).json({ success: true, message: 'Password changed successfully.' });

    } catch (error) {
        console.error('Change Password Error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { register, login, getProfile, updateProfile, changePassword };
