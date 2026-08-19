# Smart Warranty Platform - Team Git Workflow & Collaboration Guide

This document establishes the official **Git Workflow, Branching Strategy, and Pull Request Guidelines** for the 10 software engineers working on the Smart Warranty Platform.

---

## 1. Branching Strategy

The standard base branch for production-ready, verified code is `main`. All developers must create feature branches originating from the latest `main`.

### Assigned Feature Branches by Module

| Team Member / Role | Feature Branch Name | Module Assignment |
| :--- | :--- | :--- |
| **Developer 1** | `feature/customer-account` | Customer Profile, Settings, & Security |
| **Developer 2** | `feature/customer-products` | Customer Registered Products & Warranty Claims |
| **Developer 3** | `feature/cart-orders` | Cart Management, Order Checkout & Tracking |
| **Developer 4** | `feature/merchant-dashboard` | Store Manager UI, Sales Telemetry & Metrics |
| **Developer 5** | `feature/products-inventory` | Product Catalog, Barcode Management & Stock Movements |
| **Developer 6** | `feature/expiry-management` | Warranty Expiration Tracking & Expiry Alerts |
| **Developer 7** | `feature/dynamic-pricing` | Expiry-Based Discounting & Pricing Engines |
| **Developer 8** | `feature/prediction-ai` | Demand Forecasting & Reorder Recommendations |
| **Developer 9** | `feature/donations` | Charity Product Requests & Distribution |
| **Developer 10** | `feature/notifications-analytics` | Notification Dispatcher & Analytics Event Logger |

---

## 2. Developer Workflow Steps

1. **Checkout Main and Pull Latest Changes**:
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create Your Assigned Feature Branch**:
   ```bash
   git checkout -b feature/your-assigned-module
   ```

3. **Develop Code Within Module Boundaries**:
   - Write module-specific controllers, services, and routes inside your assigned directory in `src/modules/<your-module>/`.
   - **Do NOT modify Core files** (`src/middleware/authenticate.ts`, `src/middleware/authorize.ts`, `prisma/schema.prisma`) without prior approval.

4. **Run Unit Tests & Build Verification Before Commit**:
   ```bash
   npm test
   npm run build
   ```

5. **Commit with Structured Messages**:
   Use semantic commit prefixes:
   - `feat(module): add new functionality`
   - `fix(module): resolve endpoint validation error`
   - `docs(module): update API specification`

6. **Rebase Main Prior to Pull Request**:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

7. **Create Pull Request**:
   Target `main`. Require at least 1 team peer review and successful CI test pass.
