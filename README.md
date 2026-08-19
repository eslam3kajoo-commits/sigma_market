# سوبرماركت الضمان الذكي - Smart Warranty & Supermarket Backend Engine

Enterprise micro-modular platform designed for modern product warranty management, real-time supermarket inventory tracking, multi-tenant role-based access control (RBAC), expiration monitoring, financial payouts, and 10-developer team collaboration.

---

## 🛠️ Technical Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database & ORM**: Prisma ORM, SQLite (Development), PostgreSQL/MySQL (Production ready)
- **Authentication**: JWT (JSON Web Tokens), HttpOnly Cookies, Bcrypt Password Hashing
- **Security & Validation**: Helmet, Rate-Limiting, Zod Schemas, Audit Logging
- **Testing**: Vitest, Supertest (35 automated tests passing)
- **Frontend**: HTML5, Vanilla JavaScript, White & Orange Supermarket UI Theme (`public/index.html` & `public/admin.html`)

---

## 📁 System Architecture

```
smart-warranty-platform/
├── config/                         # Environment & System Configurations
├── docs/                           # Comprehensive API & Integration Documentation
│   └── API_DOCUMENTATION.md        # API Specifications & JSON Schemas for 10 Modules
├── prisma/                         # Database Schema & Data Seeders
│   ├── schema.prisma               # Prisma Relational Schema Definitions
│   └── seed.ts                     # System Roles, Admin Account & Category Seeders
├── public/                         # White & Orange Supermarket Frontend Web App
│   ├── index.html                  # Public User Portal & Supermarket Catalog (Arabic RTL)
│   ├── admin.html                  # Dedicated Admin Control Panel Dashboard (Arabic RTL)
│   ├── css/style.css               # White & Orange Supermarket UI Design System
│   └── js/                         # Client State, App Logic & Admin Handlers
├── src/
│   ├── middleware/                 # Auth, RBAC Authorization, Validation & Error Handling
│   ├── services/                   # Business Logic & Database Abstraction Layer
│   ├── modules/                    # Feature Modules
│   │   ├── auth/                   # Authentication APIs
│   │   ├── users/                  # User Profiles & Addresses
│   │   ├── roles/                  # RBAC Roles & Permissions
│   │   ├── products/               # Products & Barcode Registry
│   │   ├── admin/                  # Admin Approvals, Commissions & Audit Logs
│   │   ├── warranties/             # Warranty Core (Generation, Lookup, Claims)
│   │   ├── payments/               # Payments, Payouts & Delivery Assign
│   │   ├── cart-orders/            # Orders & Cart Module
│   │   ├── products-inventory/     # Inventory Movements Module
│   │   ├── expiry-management/      # Expiry Alerts Module
│   │   ├── dynamic-pricing/        # Dynamic Pricing AI Module
│   │   ├── prediction-ai/          # Demand Prediction AI Module
│   │   ├── donations/              # Charity Donations Module
│   │   └── notifications-analytics/# Notifications & Telemetry Module
│   ├── utils/                      # Prisma Client, JWT, Audit Logger & Rate Limiter
│   ├── app.ts                      # Express Application Routers Assembly
│   └── server.ts                   # Main Entrypoint Listener
├── tests/                          # Automated Integration Test Suites
├── .env.example                    # Environment Variables Template
└── README.md                       # Complete Local Setup & Handover Guide
```

---

## 🚀 Local Setup & Quick Start (خطوات التشغيل محلياً)

Follow these step-by-step instructions to run the backend locally:

### 1. Clening & Installing Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to create your local `.env` configuration file:
```bash
cp .env.example .env
```

Ensure `.env` contains:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET=super_secret_jwt_key_change_in_production_32chars_min
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

### 3. Database Migration & Seeding
Synchronize SQLite database schema and seed initial roles, admin account, and categories:
```bash
npx prisma db push
npm run prisma:seed
```

### 4. Run Development Server
Start the development server with live reload:
```bash
npm run dev
```

The application will be accessible at:
- **User Portal**: [http://localhost:3000](http://localhost:3000)
- **Admin Panel**: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

---

## 🧪 Test & Build Commands

Run all 35 automated integration test suites (Security, RBAC, Admin, Warranty, Payments, Delivery):
```bash
npm test
```

Compile TypeScript and build Prisma Client for production:
```bash
npm run build
```

---

## 📌 Summary of Core Endpoints

### 1. Admin Control & Governance (`/api/admin`)
- `GET   /api/admin/pending-approvals` - View pending merchant & charity requests
- `PATCH /api/admin/users/:id/status` - Activate, suspend, approve, or reject user status
- `POST  /api/admin/commissions` - Set platform commission rate (e.g. 0.10 for 10%)
- `PATCH /api/admin/commissions` - Update platform commission rate
- `GET   /api/admin/audit-logs` - List audit logs of critical administrative changes

### 2. Warranty Core (`/api/warranties`)
- `POST  /api/warranties/generate` - Generate digital warranty card with unique serial number
- `GET   /api/warranties/lookup/:barcode` - Verify warranty status by barcode or serial number
- `POST  /api/warranties/claims` - Submit repair or replacement warranty claim
- `PATCH /api/warranties/claims/:id` - Update warranty claim status (APPROVED, REJECTED, COMPLETED)

### 3. Payments, Payouts & Delivery (`/api/payments`, `/api/payouts`, `/api/deliveries`)
- `POST /api/payments/mock-checkout` - Process payment & deduct commission `(Platform Commission = Order Total * Commission Rate)`
- `GET  /api/payouts/merchant/:id` - Calculate net merchant payouts after commission
- `POST /api/deliveries/assign` - Assign delivery driver and update shipment status

---

## 📄 Complete API Documentation
Detailed API payload specifications and proposed JSON schemas for all 10 modules are available in [docs/API_DOCUMENTATION.md](file:///d:/the.project/docs/API_DOCUMENTATION.md).
