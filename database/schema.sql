-- ============================================================
-- HOTEL MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Database: MySQL
-- Author: Hotel Management System
-- Description: Complete schema with all tables
-- ============================================================

CREATE DATABASE IF NOT EXISTS hotel_management;
USE hotel_management;

-- ============================================================
-- TABLE: users
-- Stores all users (customers + admins)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,          -- bcrypt hashed
    phone VARCHAR(20),
    address TEXT,
    role ENUM('customer', 'admin') DEFAULT 'customer',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: room_types
-- Master table for room categories
-- ============================================================
CREATE TABLE IF NOT EXISTS room_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,          -- Single, Double, Deluxe, Suite
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    max_occupancy INT NOT NULL DEFAULT 2,
    amenities TEXT,                           -- JSON string of amenities
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: rooms
-- Individual room records
-- ============================================================
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(10) UNIQUE NOT NULL,
    room_type_id INT NOT NULL,
    floor INT DEFAULT 1,
    price_per_night DECIMAL(10,2) NOT NULL,
    status ENUM('available', 'occupied', 'maintenance', 'reserved') DEFAULT 'available',
    description TEXT,
    images TEXT,                              -- comma-separated image paths
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE RESTRICT
);

-- ============================================================
-- TABLE: bookings
-- All reservation records
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_reference VARCHAR(20) UNIQUE NOT NULL,  -- e.g. HMS-2024-00001
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    num_guests INT DEFAULT 1,
    total_nights INT NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    special_requests TEXT,
    status ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled') DEFAULT 'pending',
    cancelled_at TIMESTAMP NULL,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT
);

-- ============================================================
-- TABLE: payments
-- Payment records linked to bookings
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    payment_reference VARCHAR(30) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('credit_card', 'debit_card', 'cash', 'upi', 'net_banking') DEFAULT 'credit_card',
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    transaction_id VARCHAR(100),
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT
);

-- ============================================================
-- TABLE: invoices
-- Generated invoices for bookings
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(20) UNIQUE NOT NULL,
    booking_id INT NOT NULL,
    payment_id INT,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    tax_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (payment_id) REFERENCES payments(id)
);

-- ============================================================
-- TABLE: reviews
-- Customer reviews for rooms
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    booking_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_room ON bookings(room_id);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_type ON rooms(room_type_id);

-- ============================================================
-- SAMPLE DATA - Room Types
-- ============================================================
INSERT INTO room_types (type_name, description, base_price, max_occupancy, amenities) VALUES
('Single', 'Cozy single room perfect for solo travelers', 1500.00, 1, '["WiFi","AC","TV","Hot Water","Room Service"]'),
('Double', 'Spacious double room ideal for couples', 2500.00, 2, '["WiFi","AC","TV","Hot Water","Room Service","Mini Fridge"]'),
('Deluxe', 'Premium deluxe room with extra amenities', 4000.00, 3, '["WiFi","AC","Smart TV","Hot Water","Room Service","Mini Bar","Bathtub","City View"]'),
('Suite', 'Luxury suite with premium furnishings', 7500.00, 4, '["WiFi","AC","Smart TV","Hot Water","24hr Room Service","Mini Bar","Jacuzzi","Lounge Area","Balcony","Ocean View"]');

-- ============================================================
-- SAMPLE DATA - Rooms
-- ============================================================
INSERT INTO rooms (room_number, room_type_id, floor, price_per_night, status, description) VALUES
-- Floor 1 - Single Rooms
('101', 1, 1, 1500.00, 'available', 'Ground floor single room with garden view'),
('102', 1, 1, 1500.00, 'available', 'Ground floor single room near pool'),
('103', 1, 1, 1500.00, 'maintenance', 'Under renovation'),
-- Floor 2 - Double Rooms
('201', 2, 2, 2500.00, 'available', 'Double room with city view'),
('202', 2, 2, 2500.00, 'available', 'Double room with balcony'),
('203', 2, 2, 2800.00, 'available', 'Corner double room - extra spacious'),
-- Floor 3 - Deluxe Rooms
('301', 3, 3, 4000.00, 'available', 'Deluxe room with panoramic city view'),
('302', 3, 3, 4200.00, 'available', 'Deluxe room with private terrace'),
('303', 3, 3, 4000.00, 'available', 'Deluxe room - quiet wing'),
-- Floor 4 - Suites
('401', 4, 4, 7500.00, 'available', 'Presidential Suite with ocean view'),
('402', 4, 4, 8000.00, 'available', 'Royal Suite with private butler'),
('403', 4, 4, 7500.00, 'available', 'Honeymoon Suite with jacuzzi');

-- ============================================================
-- SAMPLE DATA - Admin User
-- Password: Admin@123 (bcrypt hashed)
-- ============================================================
INSERT INTO users (name, email, password, phone, role) VALUES
('Hotel Admin', 'admin@hotel.com', '$2b$10$rQnm8V8mK9x5Z7H2L3P1KOqX8Y6W4N5M7J2K1L0I9H8G7F6E5D4C3B', '+91-9876543210', 'admin');

-- Note: Run the Node.js seed script to insert admin with proper bcrypt hash
-- The above hash is a placeholder. Use: node backend/utils/seedAdmin.js
