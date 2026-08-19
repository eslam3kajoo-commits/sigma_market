# التقرير البرمجي الهندسي المكتمل للمشروع
## Comprehensive Technical & Architecture Report - Smart Supermarket Warranty Platform

هذا التقرير يقدم مراجعة شاملة وهندسية لكافة المكونات والأكواد والـ Endpoints والجداول وواجهات المستخدم التي تم بناؤها واختبارها وتسليمها في المشروع حتى الآن.

---

## 🛠️ 1. ملفات الهيكل الأساسي للـ Backend (Backend Architecture Files)

### 1.1 ملف التشغيل الرئيسي (`src/server.ts`)
- **الوصف**: نقطة الانطلاق لتشغيل السيرفر والاستماع للمنفذ `PORT` المعرف في البيئة (الافتراضي 3000).
```typescript
import app from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`==================================================`);
  console.log(`Smart Warranty Platform Server Running`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`URL:         http://localhost:${config.port}`);
  console.log(`==================================================`);
});
```

### 1.2 تجميع التطبيق والمسارات (`src/app.ts`)
- **الوصف**: تجميع برمجيات Express المتوسطة (Helmet, CORS, CookieParser, BodyParsers, Rate Limiter) وإصدار الـ Static Web App وربط جميع وحدات الـ API 10.
```typescript
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';

import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { sendSuccess } from './utils/response';
import { rateLimiter } from './utils/rateLimiter';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import rolesRoutes from './modules/roles/roles.routes';
import productsRoutes from './modules/products/products.routes';
import adminRoutes from './modules/admin/admin.routes';
import warrantyRoutes from './modules/warranties/warranty.routes';
import { paymentsRouter, payoutsRouter, deliveriesRouter } from './modules/payments/financial.routes';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Rate Limiting
app.use('/api/auth/login', rateLimiter(15 * 60 * 1000, 20));
app.use('/api/auth/register', rateLimiter(15 * 60 * 1000, 20));

// Core Routers
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/warranties', warrantyRoutes);
app.use('/api/payments', paymentsRouter);
app.use('/api/payouts', payoutsRouter);
app.use('/api/deliveries', deliveriesRouter);

app.use(errorHandler);

export default app;
```

### 1.3 البرمجيات المتوسطة (Middleware Layer)
1. **`src/middleware/authenticate.ts`**: فحص الـ JWT Token الصادر في الـ Header `Authorization: Bearer <Token>`.
2. **`src/middleware/authorize.ts`**: التحقق من صلاحيات الوصول والجدار الناري بناءً على الأدوار (`Admin`, `Merchant`, `Customer`, `Charity`).
3. **`src/middleware/validate.ts`**: فحص المدخلات والبيانات باستخدام Zod Schemas.
4. **`src/middleware/errorHandler.ts`**: التعامل المركزي مع الأخطاء غير المتوقعة واستثناءات الـ API.

---

## 🗄️ 2. هيكل قاعدة البيانات الحالي (Database Schema & Models)

ملف البيانات الحالي (`prisma/schema.prisma`) يحتوي على **20 جشولاً وموديلاً** تغطي كافة الاحتياجات التجارية والمالية ونظام الضمان:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Role {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  permissions String   // JSON array string of permission identifiers
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  users       User[]

  @@map("roles")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  fullName     String
  phoneNumber  String?
  status       String   @default("ACTIVE") // ACTIVE, INACTIVE, SUSPENDED, PENDING
  roleId       String
  role         Role     @relation(fields: [roleId], references: [id], onDelete: Restrict)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  addresses          Address[]
  products           Product[]           @relation("MerchantProducts")
  orders             Order[]             @relation("CustomerOrders")
  donations          Donation[]          @relation("CharityDonations")
  notifications      Notification[]
  inventoryMovements InventoryMovement[] @relation("UserInventoryMovements")
  merchantProfile    MerchantProfile?
  auditLogs          AuditLog[]          @relation("UserAuditLogs")
  warrantyClaims     WarrantyClaim[]     @relation("CustomerWarrantyClaims")

  @@index([email])
  @@index([roleId])
  @@map("users")
}

model MerchantProfile {
  id          String   @id @default(uuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyName String
  type        String   @default("MERCHANT") // MERCHANT, CHARITY
  status      String   @default("PENDING") // PENDING, APPROVED, REJECTED
  details     String?  // JSON string
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  payouts Payout[]

  @@index([userId])
  @@index([status])
  @@index([type])
  @@map("merchant_profiles")
}

model SystemSetting {
  id             String   @id @default(uuid())
  settingKey     String   @unique
  commissionRate Float    @default(0.10) // 10%
  updatedAt      DateTime @updatedAt

  @@map("system_settings")
}

model AuditLog {
  id        String   @id @default(uuid())
  userId    String?
  user      User?    @relation("UserAuditLogs", fields: [userId], references: [id], onDelete: SetNull)
  action    String
  ipAddress String?
  details   String?  // JSON string
  timestamp DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@map("audit_logs")
}

model Warranty {
  id           String   @id @default(uuid())
  serialNumber String   @unique
  productId    String
  product      Product  @relation(fields: [productId], references: [id], onDelete: Restrict)
  orderId      String
  order        Order    @relation(fields: [orderId], references: [id], onDelete: Restrict)
  startDate    DateTime @default(now())
  endDate      DateTime
  status       String   @default("ACTIVE") // ACTIVE, EXPIRED, CLAIMED

  claims WarrantyClaim[]

  @@index([serialNumber])
  @@index([productId])
  @@index([orderId])
  @@index([status])
  @@map("warranties")
}

model WarrantyClaim {
  id               String   @id @default(uuid())
  warrantyId       String
  warranty         Warranty @relation(fields: [warrantyId], references: [id], onDelete: Restrict)
  customerId       String
  customer         User     @relation("CustomerWarrantyClaims", fields: [customerId], references: [id], onDelete: Restrict)
  issueDescription String
  claimStatus      String   @default("PENDING") // PENDING, APPROVED, REJECTED, COMPLETED
  claimType        String   @default("REPAIR")  // REPAIR, REPLACEMENT
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([warrantyId])
  @@index([customerId])
  @@index([claimStatus])
  @@map("warranty_claims")
}

model Payment {
  id        String   @id @default(uuid())
  orderId   String   @unique
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  amount    Float
  status    String   @default("PENDING") // PENDING, PAID, FAILED
  createdAt DateTime @default(now())

  @@index([orderId])
  @@index([status])
  @@map("payments")
}

model Payout {
  id                 String          @id @default(uuid())
  merchantId         String
  merchant           MerchantProfile @relation(fields: [merchantId], references: [id], onDelete: Restrict)
  amount             Float
  platformCommission Float
  netAmount          Float
  status             String          @default("PENDING") // PENDING, COMPLETED, FAILED
  createdAt          DateTime        @default(now())

  @@index([merchantId])
  @@index([status])
  @@map("payouts")
}

model Delivery {
  id             String   @id @default(uuid())
  orderId        String   @unique
  order          Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  driverName     String
  driverPhone    String
  deliveryStatus String   @default("ASSIGNED") // ASSIGNED, OUT_FOR_DELIVERY, DELIVERED
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([orderId])
  @@index([deliveryStatus])
  @@map("deliveries")
}
```

---

## 📡 3. قائمة واجهات البرمجة والـ APIs المتاحة حالياً

### 3.1 المصادقة والأدوار (`/api/auth`, `/api/roles`, `/api/users`)
- `POST /api/auth/register`: إنشاء حساب جديد للأدوار المختلفة.
- `POST /api/auth/login`: تسجيل الدخول والحصول على JWT Token.
- `POST /api/auth/logout`: تسجيل الخروج وإلغاء الـ Cookie/Session.
- `GET /api/auth/me`: استرجاع بيانات المستخدم المتصل.
- `GET /api/roles`: استرجاع أدوار النظام والصلاحيات.
- `GET /api/users/addresses`: استرجاع عناوين شحن العميل.
- `POST /api/users/addresses`: إضافة عنوان شحن جديد.

### 3.2 التحكم والإدارة (`/api/admin`)
- `GET /api/admin/metrics`: استرجاع إحصائيات المنصة الحية.
- `GET /api/admin/users`: تصفح وقوائم مستخدمي النظام مع الفلترة والبحث.
- `PATCH /api/admin/users/:id/status`: قبول أو تجميد أو تعديل حالة حساب مستخدم.
- `GET /api/admin/pending-approvals`: عرض طلبات انضمام التجار والجمعيات المعلقة.
- `POST & PATCH /api/admin/commissions`: تحديد وتعديل نسبة عمولة التطبيق العامة.
- `GET /api/admin/audit-logs`: عرض سجل الحركات الحساسة في النظام.

### 3.3 كتالوج المنتجات والضمان (`/api/products`, `/api/warranties`)
- `GET /api/products`: عرض كتالوج المنتجات والضمان.
- `GET /api/products/barcode/:barcode`: التحقق من حالة المنتج برقم الباركود.
- `POST /api/products`: إضافة منتج جديد (خاص بالتجار والمدراء).
- `POST /api/warranties/generate`: توليد كارت الضمان الرقمي بعد الشراء.
- `GET /api/warranties/lookup/:barcode`: الفحص الفوري لحالة الضمان برقم الباركود أو السيريال.
- `POST /api/warranties/claims`: تقديم بلاغ إصلاح/استبدال تحت الضمان.
- `PATCH /api/warranties/claims/:id`: تحديث حالة طلب الضمان.

### 3.4 المدفوعات وتصفيات التجار والتوصيل (`/api/payments`, `/api/payouts`, `/api/deliveries`)
- `POST /api/payments/mock-checkout`: دفع الطلب محلياً وخصم العمولة تلقائياً `(Platform Commission = Order Total * Commission Rate)`.
- `GET /api/payouts/merchant/:id`: حساب وتصفية المستحقات المالية الصافية للتاجر.
- `POST /api/deliveries/assign`: تعيين مندوب وتحديث حالة الشحنة.

---

## 🎨 4. حالة الربط الحالية مع واجهات الـ Frontend

الواجهة الأمامية تم تطويرها بالكامل وتعمل بتناغم مباشر مع خادم الـ Node.js:
1. **نظام التصميم العربي (White & Orange Theme)**:
   - دعم اتجاه RTL الكامل مع خط **Cairo** المعتمد من Google Fonts.
   - ألوان السوبرماركت العصري (الأبيض العاجي المريح مع التدرج البرتقالي `#F97316` / `#FF6B00`).
2. **البوابة الرئيسية (`public/index.html` & `public/js/app.js`)**:
   - مؤشر فحص صحة الـ API الحي (`GET /api/health`).
   - جلب المنتجات ديناميكياً وعرض كروت المنتجات مع الأسعار والمخزون وتاريخ انتهاء الصلاحية.
   - نموذج فحص الباركود الفوري مع النتائج التفاعلية (`GET /api/products/barcode/:barcode`).
   - نموذج تسجيل الدخول وإنشاء حساب منبثق مع التوثيق عبر LocalStorage.
3. **لوحة تحكم الإدارة (`public/admin.html` & `public/js/admin.js`)**:
   - حماية الوصول لجلسة الأدمن فقط (`verifyAdminAccess`).
   - كروت الإحصائيات الحية للمستخدمين، التجار، العملاء، والمنتجات.
   - جدول مستخدمي النظام مع فلاتر البحث وإمكانية تجميد الحساب أو تعديل الدور مباشرة.

---

## 📄 5. ملفات التوثيق والإعدادات المجهزة

1. **`.env.example`**: ملف نموذج الإعدادات البيئية (Port, Database URL, JWT Secrets, CORS).
2. **`README.md`**: دليل تشغيل المشروع محلياً وبنائه واختباره خطوة بخطوة.
3. **`docs/API_DOCUMENTATION.md`**: توثيق شامل للـ Request/Response والهياكل المقترحة لباقي أعضاء الفريق الـ 10.
