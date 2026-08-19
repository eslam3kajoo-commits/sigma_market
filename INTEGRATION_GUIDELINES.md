# Smart Warranty Platform - Core Architecture & Integration Guidelines

This document provides technical integration rules to ensure consistent API standards, database query safety, and clear separation of concerns across all 10 developer modules.

---

## 1. Core Architecture Boundaries

```
[ HTTP Request ]
      │
      ▼
[ Express Router ] ──────► [ Zod Input Validation ]
                                 │
                                 ▼
                    [ Authentication & RBAC Middleware ]
                                 │
                                 ▼
                     [ Module Controller ]
                                 │
                                 ▼
                     [ Module Service Layer ]
                                 │
                                 ▼
                     [ Prisma Database Client ]
```

### Core Protected Files (Do Not Modify Directly)

The following core components provide global security and isolation. Modifications must be approved by the Lead Architect:

- `src/middleware/authenticate.ts` (JWT verification & session extraction)
- `src/middleware/authorize.ts` (RBAC role verification & ownership guards)
- `src/middleware/errorHandler.ts` (Centralized HTTP error response handler)
- `src/utils/response.ts` (Standardized HTTP JSON formatters)
- `prisma/schema.prisma` (Shared relational models)

---

## 2. Standardized Response Format

All API endpoints must utilize the shared response helper functions `sendSuccess` and `sendError`:

### Success Response Example (HTTP 200 / 201)
```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {
    "result": {}
  }
}
```

### Error Response Example (HTTP 400 / 401 / 403 / 404 / 422 / 500)
```json
{
  "success": false,
  "message": "Validation failed for request parameters.",
  "error": [
    { "field": "email", "message": "Valid email address is required" }
  ]
}
```

---

## 3. Database Access & Isolation Rules

- **Use Prisma Client Only**: Import `prisma` from `src/utils/prisma.ts`.
- **Tenant Isolation**: Always enforce query scoping so Merchants can only query items where `merchantId === req.user.userId`, Customers where `customerId === req.user.userId`, and Charities where `charityId === req.user.userId`.
- **Transaction Safety**: Wrap multi-table operations (e.g. creating a product alongside stock inventory and warranty expiry) inside `prisma.$transaction([])`.
