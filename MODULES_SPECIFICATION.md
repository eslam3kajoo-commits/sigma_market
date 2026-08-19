# Smart Warranty Platform - Technical Module Specifications

This document defines the responsibilities, directory paths, models, and endpoints for all 10 developer team modules.

---

## 1. `customer-account` Module
- **Assigned Path**: `src/modules/customer-account/`
- **Responsibility**: Customer profile management, preferences, and personal shipping addresses.
- **APIs**: `/api/users/me`, `/api/users/addresses`

## 2. `customer-products` Module
- **Assigned Path**: `src/modules/customer-products/`
- **Responsibility**: Customer product warranty registrations, digital warranty card viewing, and claim filings.
- **APIs**: `/api/products`, `/api/products/barcode/:barcode`

## 3. `cart-orders` Module
- **Assigned Path**: `src/modules/cart-orders/`
- **Responsibility**: Customer shopping cart management, order placement, and order status tracking.
- **APIs**: `/api/orders`

## 4. `merchant-dashboard` Module
- **Assigned Path**: `src/modules/merchant-dashboard/`
- **Responsibility**: Merchant store dashboard, sales analytics, product management UI, and revenue tracking.
- **APIs**: `/api/products`, `/api/orders`

## 5. `products-inventory` Module
- **Assigned Path**: `src/modules/products-inventory/`
- **Responsibility**: Stock quantity updates, minimum stock alert levels, and inventory audit movement logs.
- **APIs**: `/api/inventory`

## 6. `expiry-management` Module
- **Assigned Path**: `src/modules/expiry-management/`
- **Responsibility**: Product manufacture/expiry dates calculation, near-expiration flags, and warranty alerts.
- **APIs**: `/api/expiry`

## 7. `dynamic-pricing` Module
- **Assigned Path**: `src/modules/dynamic-pricing/`
- **Responsibility**: Automated discount scheduling based on shelf life and stock velocity.
- **APIs**: `/api/pricing`

## 8. `prediction-ai` Module
- **Assigned Path**: `src/modules/prediction-ai/`
- **Responsibility**: Sales demand forecasting and automated stock reorder quantity recommendations.
- **APIs**: `/api/predictions`

## 9. `donations` Module
- **Assigned Path**: `src/modules/donations/`
- **Responsibility**: Near-expiry product donation listings, charity organization claims, and logistics tracking.
- **APIs**: `/api/donations`

## 10. `notifications-analytics` Module
- **Assigned Path**: `src/modules/notifications-analytics/`
- **Responsibility**: Email/In-app warranty notifications and platform-wide analytics logger.
- **APIs**: `/api/notifications`
