// ============================================================
// config/database.js
// MySQL Database Connection using mysql2 with connection pooling
// ============================================================

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool (more efficient than single connection)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hotel_management',
    waitForConnections: true,
    connectionLimit: 10,        // Max 10 simultaneous connections
    queueLimit: 0,
    timezone: '+05:30'          // IST timezone
});

// Test the connection on startup
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully to:', process.env.DB_NAME);
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1); // Exit if DB fails
    }
}

testConnection();

module.exports = pool;
