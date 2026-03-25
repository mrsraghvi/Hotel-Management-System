# 🏨 Hotel Management System

---

## 🧩 Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | HTML5, CSS3, Vanilla JavaScript     |
| Backend   | Node.js + Express.js (REST API)     |
| Database  | MySQL                               |
| Auth      | JWT (JSON Web Tokens) + Bcrypt      |

---

## 📁 Project Folder Structure

```
hotel-management-system/
├── backend/                    ← Node.js Express Server
│   ├── config/
│   │   └── database.js         ← MySQL connection pool
│   ├── controllers/
│   │   ├── authController.js   ← Register, Login, Profile
│   │   ├── roomController.js   ← Room CRUD + Search
│   │   ├── bookingController.js← Booking lifecycle
│   │   ├── paymentController.js← Payments + Invoices
│   │   └── adminController.js  ← Dashboard + User Mgmt
│   ├── middleware/
│   │   └── auth.js             ← JWT verification middleware
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── roomRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── paymentRoutes.js
│   │   └── adminRoutes.js
│   ├── utils/
│   │   └── seedAdmin.js        ← Create initial admin user
│   ├── server.js               ← Main app entry point
│   ├── .env.example            ← Environment template
│   └── package.json
│
├── frontend/                   ← HTML/CSS/JS Frontend
│   ├── css/
│   │   └── style.css           ← Global styles
│   ├── js/
│   │   └── api.js              ← API calls + utilities
│   ├── pages/
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── rooms.html          ← Room search + booking
│   │   ├── customer/
│   │   │   └── bookings.html   ← My bookings + payment + invoice
│   │   └── admin/
│   │       ├── dashboard.html  ← Stats + overview
│   │       ├── rooms.html      ← Add/edit/delete rooms
│   │       ├── bookings.html   ← Manage all bookings
│   │       ├── users.html      ← Customer management
│   │       └── reports.html    ← Revenue reports
│   └── index.html              ← Homepage
│
└── database/
    └── schema.sql              ← Complete DB schema + sample data
```

---

## 🚀 Setup Guide (Step by Step)

### Prerequisites
- Node.js (v18+): https://nodejs.org
- MySQL (v8+): https://dev.mysql.com/downloads/
- A code editor (VS Code recommended)

---

### Step 1: Clone / Download the Project
```bash
# If using git
git clone <your-repo-url>
cd hotel-management-system

# Or just unzip the project folder
```

---

### Step 2: Setup MySQL Database
Open MySQL Workbench or any MySQL client and run:
```sql
-- Run the full schema file
SOURCE /path/to/hotel-management-system/database/schema.sql;
```

Or copy-paste the contents of `database/schema.sql` into your MySQL client and execute.

This creates:
- Database: `hotel_management`
- All 6 tables (users, room_types, rooms, bookings, payments, invoices, reviews)
- Sample room types and 12 sample rooms

---

### Step 3: Configure Backend Environment
```bash
cd backend

# Copy the env example file
cp .env.example .env

# Edit .env with your settings:
# DB_PASSWORD=your_actual_mysql_password
# JWT_SECRET=any_long_random_string_you_choose
```

Your `.env` file should look like:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YourMySQLPassword
DB_NAME=hotel_management
JWT_SECRET=mySecretKey2024ForHotelSystem
JWT_EXPIRES_IN=7d
TAX_RATE=18
```

---

### Step 4: Install Backend Dependencies
```bash
cd backend
npm install
```

This installs: express, mysql2, bcryptjs, jsonwebtoken, dotenv, cors, uuid, moment

---

### Step 5: Create Admin User
```bash
cd backend
node utils/seedAdmin.js
```

This creates:
- **Admin:** admin@hotel.com / Admin@123
- **Customer:** john@example.com / Test@123

---

### Step 6: Start the Backend Server
```bash
# Development (auto-restart on changes)
npm run dev

# OR Production
npm start
```

You should see:
```
╔════════════════════════════════════════╗
║   🏨  HOTEL MANAGEMENT SYSTEM API       ║
╠════════════════════════════════════════╣
║   🚀 Server running on port: 5000       ║
║   🌐 URL: http://localhost:5000          ║
╚════════════════════════════════════════╝
✅ Database connected successfully to: hotel_management
```

---

### Step 7: Open the Frontend
The backend serves the frontend automatically.
Open: **http://localhost:5000**

Or open `frontend/index.html` directly in a browser using VS Code Live Server.

---

## 🔐 Login Credentials

| Role     | Email                | Password   |
|----------|----------------------|------------|
| Admin    | admin@hotel.com      | Admin@123  |
| Customer | john@example.com     | Test@123   |

---

## 📊 Complete API Documentation

### Auth Endpoints
| Method | Endpoint                  | Auth | Description           |
|--------|---------------------------|------|-----------------------|
| POST   | /api/auth/register        | No   | Register new customer |
| POST   | /api/auth/login           | No   | Login (all roles)     |
| GET    | /api/auth/profile         | Yes  | Get own profile       |
| PUT    | /api/auth/profile         | Yes  | Update profile        |
| PUT    | /api/auth/change-password | Yes  | Change password       |

### Room Endpoints
| Method | Endpoint                  | Auth  | Description           |
|--------|---------------------------|-------|-----------------------|
| GET    | /api/rooms                | No    | Get all rooms         |
| GET    | /api/rooms/available      | No    | Search by dates       |
| GET    | /api/rooms/types          | No    | Get room types        |
| GET    | /api/rooms/:id            | No    | Get room by ID        |
| POST   | /api/rooms                | Admin | Create room           |
| PUT    | /api/rooms/:id            | Admin | Update room           |
| DELETE | /api/rooms/:id            | Admin | Delete room           |

### Booking Endpoints
| Method | Endpoint                      | Auth     | Description         |
|--------|-------------------------------|----------|---------------------|
| POST   | /api/bookings                 | Customer | Create booking      |
| GET    | /api/bookings/my              | Customer | My bookings         |
| GET    | /api/bookings/:id             | Auth     | Get booking detail  |
| PUT    | /api/bookings/:id             | Auth     | Modify booking      |
| POST   | /api/bookings/:id/cancel      | Auth     | Cancel booking      |
| GET    | /api/bookings                 | Admin    | All bookings        |
| PUT    | /api/bookings/:id/status      | Admin    | Update status       |

### Payment Endpoints
| Method | Endpoint                      | Auth     | Description         |
|--------|-------------------------------|----------|---------------------|
| POST   | /api/payments                 | Auth     | Process payment     |
| GET    | /api/payments/invoice/:bookId | Auth     | Get invoice         |
| GET    | /api/payments                 | Admin    | All payments        |
| GET    | /api/payments/report          | Admin    | Revenue report      |

### Admin Endpoints
| Method | Endpoint                      | Auth  | Description         |
|--------|-------------------------------|-------|---------------------|
| GET    | /api/admin/dashboard          | Admin | Dashboard stats     |
| GET    | /api/admin/users              | Admin | All customers       |
| PUT    | /api/admin/users/:id/toggle   | Admin | Toggle user status  |

---

## 🗄️ Database Schema Diagram

```
users
├── id (PK)
├── name, email (unique), password (bcrypt)
├── phone, address
└── role: customer | admin

room_types
├── id (PK)
├── type_name: Single | Double | Deluxe | Suite
├── base_price, max_occupancy
└── amenities (JSON)

rooms
├── id (PK)
├── room_number (unique), floor
├── room_type_id (FK → room_types)
├── price_per_night
└── status: available | occupied | reserved | maintenance

bookings
├── id (PK)
├── booking_reference (unique)
├── user_id (FK → users)
├── room_id (FK → rooms)
├── check_in_date, check_out_date
├── total_nights, price_per_night
├── subtotal, tax_amount, total_amount
└── status: pending | confirmed | checked_in | checked_out | cancelled

payments
├── id (PK)
├── booking_id (FK → bookings)
├── payment_reference (unique)
├── amount, payment_method
└── payment_status: pending | completed | failed | refunded

invoices
├── id (PK)
├── invoice_number (unique)
├── booking_id (FK → bookings)
├── payment_id (FK → payments)
└── subtotal, tax_rate, tax_amount, total_amount
```

---

## 🎯 Module Explanations (for Viva)

### 1. User Module
- Customers register with name, email, password (bcrypt hashed), phone
- Login returns a JWT token stored in localStorage
- Token sent in Authorization header with every protected request
- Profile update and password change supported


---

## 🧪 Sample Test Data

### Create a Booking Flow
1. Register as customer → Login
2. Go to Rooms page → Search (set dates)
3. Click "Book Now" on any available room
4. Confirm booking → Get booking reference
5. Go to My Bookings → Pay Now
6. View Invoice after payment

### Admin Flow
1. Login as admin@hotel.com
2. Dashboard → see live statistics
3. Rooms → Add/Edit/Delete rooms
4. Bookings → Change status (check-in, check-out)
5. Reports → See revenue charts

---

## ⚙️ Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| `ECONNREFUSED` on DB | Check MySQL is running, password in .env is correct |
| `Table doesn't exist` | Run database/schema.sql first |
| CORS error | Backend must be on port 5000; check FRONTEND_URL in .env |
| JWT expired error | Login again to get a new token |
| Admin login fails | Run `node utils/seedAdmin.js` again |

---

## 📝 Optional Enhancements
- Real payment gateway: Integrate Razorpay SDK
- Email notifications: Use Nodemailer for booking confirmations
- Room images: Upload with Multer middleware
- PDF invoices: Use PDFKit to generate downloadable invoices
- Search by price range: Add slider in frontend

---

