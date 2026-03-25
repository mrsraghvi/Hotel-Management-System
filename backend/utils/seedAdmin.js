// ============================================================
// utils/seedAdmin.js
// Run this script ONCE to create the admin user in database
// Usage: node utils/seedAdmin.js
// ============================================================

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function seedAdmin() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'hotel_management'
    });

    try {
        // Create admin user with hashed password
        const adminPassword = await bcrypt.hash('Admin@123', 10);

        // Delete existing admin if any
        await db.query("DELETE FROM users WHERE email = 'admin@hotel.com'");

        // Insert fresh admin
        await db.query(
            "INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, 'admin')",
            ['Hotel Admin', 'admin@hotel.com', adminPassword, '+91-9876543210']
        );

        console.log('✅ Admin user created successfully!');
        console.log('📧 Email: admin@hotel.com');
        console.log('🔑 Password: Admin@123');

        // Also create a sample customer
        const custPassword = await bcrypt.hash('Test@123', 10);
        await db.query("DELETE FROM users WHERE email = 'john@example.com'");
        await db.query(
            "INSERT INTO users (name, email, password, phone, address, role) VALUES (?, ?, ?, ?, ?, 'customer')",
            ['John Doe', 'john@example.com', custPassword, '+91-9876543211', '123 Main Street, Hyderabad']
        );

        console.log('\n✅ Sample customer created!');
        console.log('📧 Email: john@example.com');
        console.log('🔑 Password: Test@123');

    } catch (error) {
        console.error('❌ Seed Error:', error.message);
    } finally {
        await db.end();
    }
}

seedAdmin();
