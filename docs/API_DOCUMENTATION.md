# توثيق واجهات البرمجة والـ APIs - منصة سوبرماركت الضمان الذكي
## Smart Warranty & Supermarket Platform - Complete API Specifications

هذا التوثيق يوفر المواصفات التفصيلية للـ Requests والـ Responses لكل الـ Endpoints في النظام، بالإضافة إلى الهياكل المقترحة (JSON Formats) للـ 10 Modules لسهولة الربط بين أعضاء الفريق.

---

## 🔐 1. Authentication & RBAC Module (`/api/auth`, `/api/users`, `/api/roles`)

### `POST /api/auth/register`
- **الوصف**: تسجيل حساب جديد بأسماء الأدوار (Admin, Merchant, Charity, Customer).
- **Request Body**:
```json
{
  "email": "merchant@supermarket.com",
  "password": "Password123!",
  "fullName": "محمد أحمد - مدير المتجر",
  "roleName": "Merchant"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "User registered successfully.",
  "data": {
    "user": {
      "id": "u-uuid-1234",
      "email": "merchant@supermarket.com",
      "fullName": "محمد أحمد - مدير المتجر",
      "role": "Merchant",
      "status": "ACTIVE"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI..."
  }
}
```

### `POST /api/auth/login`
- **Request Body**:
```json
{
  "email": "admin@smartwarranty.local",
  "password": "AdminSecure2026!"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Authentication successful.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
    "user": {
      "id": "admin-uuid-999",
      "email": "admin@smartwarranty.local",
      "role": "Admin"
    }
  }
}
```

---

## 🛡️ 2. Admin & Governance Module (`/api/admin`)

### `GET /api/admin/pending-approvals`
- **الوصف**: عرض طلبات التجار والجمعيات الخيرية المعلقة برسم الموافقة.
- **Headers**: `Authorization: Bearer <Admin_JWT_Token>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Pending merchant & charity approvals retrieved.",
  "data": {
    "approvals": [
      {
        "id": "mp-uuid-001",
        "userId": "user-uuid-111",
        "companyName": "سوبرماركت الفخامة",
        "type": "MERCHANT",
        "status": "PENDING",
        "details": "طلب انضمام فرع جديد",
        "createdAt": "2026-08-18T10:00:00Z",
        "user": {
          "email": "owner@fakhama.com",
          "fullName": "أحمد محمود"
        }
      }
    ]
  }
}
```

### `PATCH /api/admin/users/:id/status`
- **الوصف**: تجميد أو قبول أو رفض حساب أي مستخدم.
- **Headers**: `Authorization: Bearer <Admin_JWT_Token>`
- **Request Body**:
```json
{
  "status": "SUSPENDED" // ACTIVE, INACTIVE, SUSPENDED, REJECTED
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "User status updated to SUSPENDED.",
  "data": {
    "user": {
      "id": "user-uuid-111",
      "status": "SUSPENDED"
    }
  }
}
```

### `POST & PATCH /api/admin/commissions`
- **الوصف**: تحديد وتعديل نسبة عمولة التطبيق العامة.
- **Headers**: `Authorization: Bearer <Admin_JWT_Token>`
- **Request Body**:
```json
{
  "commissionRate": 0.12 // 12%
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Platform commission rate updated successfully.",
  "data": {
    "setting": {
      "settingKey": "PLATFORM_COMMISSION",
      "commissionRate": 0.12,
      "updatedAt": "2026-08-18T12:00:00Z"
    }
  }
}
```

### `GET /api/admin/audit-logs`
- **الوصف**: عرض سجل التغييرات والعمليات الحساسة في النظام.
- **Headers**: `Authorization: Bearer <Admin_JWT_Token>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "audit-1",
        "action": "UPDATE_COMMISSION_RATE",
        "ipAddress": "127.0.0.1",
        "details": "{\"commissionRate\":0.12}",
        "timestamp": "2026-08-18T12:00:00Z",
        "user": {
          "fullName": "مدير النظام الرئيسي"
        }
      }
    ]
  }
}
```

---

## 🏷️ 3. Warranty Core Module (`/api/warranties`)

### `POST /api/warranties/generate`
- **الوصف**: توليد كارت الضمان الرقمي بعد إتمام الشراء.
- **Request Body**:
```json
{
  "productId": "prod-uuid-101",
  "orderId": "order-uuid-202",
  "durationMonths": 24
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Digital warranty card generated successfully.",
  "data": {
    "warranty": {
      "id": "war-uuid-999",
      "serialNumber": "WAR-K98X1-AB72",
      "productId": "prod-uuid-101",
      "orderId": "order-uuid-202",
      "startDate": "2026-08-18T12:00:00Z",
      "endDate": "2028-08-18T12:00:00Z",
      "status": "ACTIVE"
    }
  }
}
```

### `GET /api/warranties/lookup/:barcode`
- **الوصف**: فحص وتتبع حالة الضمان برقم الباركود أو السيريال.
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Warranty information retrieved.",
  "data": {
    "warranty": {
      "id": "war-uuid-999",
      "serialNumber": "WAR-K98X1-AB72",
      "status": "ACTIVE",
      "isExpired": false,
      "endDate": "2028-08-18T12:00:00Z",
      "product": {
        "name": "ثلاجة ذكية X1",
        "barcode": "SMART-REF-001",
        "price": 999.99
      }
    }
  }
}
```

### `POST /api/warranties/claims`
- **الوصف**: تقديم طلب إصلاح أو استبدال جديد تحت الضمان.
- **Headers**: `Authorization: Bearer <Customer_Token>`
- **Request Body**:
```json
{
  "warrantyId": "war-uuid-999",
  "issueDescription": "عطل في حساس التبريد السريع",
  "claimType": "REPAIR" // REPAIR or REPLACEMENT
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Warranty claim submitted successfully.",
  "data": {
    "claim": {
      "id": "claim-uuid-303",
      "warrantyId": "war-uuid-999",
      "issueDescription": "عطل في حساس التبريد السريع",
      "claimStatus": "PENDING",
      "claimType": "REPAIR"
    }
  }
}
```

### `PATCH /api/warranties/claims/:id`
- **الوصف**: تحديث حالة طلب الضمان (قبول/رفض/مكتمل).
- **Headers**: `Authorization: Bearer <Admin_or_Merchant_Token>`
- **Request Body**:
```json
{
  "claimStatus": "COMPLETED" // PENDING, APPROVED, REJECTED, COMPLETED
}
```

---

## 💳 4. Payments, Payouts & Delivery Module (`/api/payments`, `/api/payouts`, `/api/deliveries`)

### `POST /api/payments/mock-checkout`
- **الوصف**: معالجة حالة الدفع تلقائياً وخصم عمولة المنصة: `(Platform Commission = Order Total * Commission Rate)`.
- **Request Body**:
```json
{
  "orderId": "order-uuid-202",
  "paymentMethod": "CARD"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Mock checkout processed successfully.",
  "data": {
    "payment": {
      "id": "pay-uuid-505",
      "orderId": "order-uuid-202",
      "amount": 1000.0,
      "status": "PAID"
    },
    "financialSummary": {
      "orderTotal": 1000.0,
      "commissionRate": "10.0%",
      "platformCommission": 100.0,
      "netMerchantAmount": 900.0
    }
  }
}
```

### `GET /api/payouts/merchant/:id`
- **الوصف**: حساب وتصفية المستحقات المالية للتاجر بعد خصم العمولة.
- **Headers**: `Authorization: Bearer <Merchant_or_Admin_Token>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "merchant": {
      "companyName": "سوبرماركت الفخامة"
    },
    "financialSummary": {
      "totalSales": 5000.0,
      "commissionRate": "10.0%",
      "platformCommission": 500.0,
      "netPayoutAmount": 4500.0
    }
  }
}
```

### `POST /api/deliveries/assign`
- **الوصف**: تعيين مندوب توصيل وتحديث حالة الشحنة.
- **Headers**: `Authorization: Bearer <Admin_or_Merchant_Token>`
- **Request Body**:
```json
{
  "orderId": "order-uuid-202",
  "driverName": "سامي المندوب",
  "driverPhone": "+966555123456",
  "deliveryStatus": "OUT_FOR_DELIVERY" // ASSIGNED, OUT_FOR_DELIVERY, DELIVERED
}
```

---

## 📦 5. JSON Formats المقترحة لباقي الـ 10 Modules لربط الفريق

| # | Module Name | Proposed Endpoint | JSON Payload / Schema Structure |
|---|---|---|---|
| 1 | **Products Registry** | `GET /api/products` | `{"name":"شاشه 55 بوصة","description":"سلسلة ذكية","price":1999,"barcode":"SW-55","stock":10}` |
| 2 | **Inventory Movements** | `POST /api/inventory/movement` | `{"productId":"p-1","type":"ADD","quantity":50,"reason":"توريد شحنة جديدة"}` |
| 3 | **Expiry Management** | `GET /api/expiry/alerts` | `{"productId":"p-1","manufactureDate":"2025-01-01","expiryDate":"2026-09-01","alertDaysBefore":30}` |
| 4 | **Dynamic Pricing AI** | `POST /api/pricing/discount` | `{"productId":"p-1","discountPercentage":25,"discountedPrice":1499,"startDate":"2026-08-18","endDate":"2026-08-30"}` |
| 5 | **AI Predictions** | `GET /api/predictions/demand` | `{"productId":"p-1","predictedDemandNextWeek":120,"confidenceScore":0.94}` |
| 6 | **Charity Donations** | `POST /api/donations/request` | `{"charityId":"c-1","productId":"p-1","quantity":20,"status":"REQUESTED"}` |
| 7 | **Notifications System** | `GET /api/notifications` | `{"userId":"u-1","title":"تنبيه صلاحية","message":"المنتج سينتهي خلال 5 أيام","type":"EXPIRY_ALERT"}` |
| 8 | **Cart & Orders** | `POST /api/orders` | `{"customerId":"u-1","items":[{"productId":"p-1","quantity":2}],"totalAmount":3998}` |
| 9 | **Customer Addresses** | `POST /api/users/addresses` | `{"street":"شارع الملك فهد","city":"الرياض","state":"الرياض","postalCode":"11564","country":"Saudi Arabia"}` |
| 10 | **Roles & RBAC** | `GET /api/roles` | `{"name":"Merchant","permissions":["product:create","inventory:manage"]}` |

---
