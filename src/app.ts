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
import ordersRoutes from './modules/cart-orders/orders.routes';
import inventoryRoutes from './modules/products-inventory/inventory.routes';
import expiryRoutes from './modules/expiry-management/expiry.routes';
import pricingRoutes from './modules/dynamic-pricing/pricing.routes';
import predictionsRoutes from './modules/prediction-ai/predictions.routes';
import donationsRoutes from './modules/donations/donations.routes';
import notificationsRoutes from './modules/notifications-analytics/notifications.routes';
import warrantyRoutes from './modules/warranties/warranty.routes';
import { paymentsRouter, payoutsRouter, deliveriesRouter } from './modules/payments/financial.routes';

const app = express();

// Security Header Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));

// Dynamic CORS Configuration for local dev servers & production
app.use(cors({
  origin: (origin, callback) => {
    // Allow any origin in development or when CORS_ORIGIN is '*'
    if (!origin || config.corsOrigin === '*' || config.nodeEnv !== 'production') {
      return callback(null, true);
    }
    const allowedOrigins = [config.corsOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'];
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Host static public web application
app.use(express.static(path.join(__dirname, '../public')));

// Rate Limiter for Authentication endpoints
app.use('/api/auth/login', rateLimiter(15 * 60 * 1000, 20));
app.use('/api/auth/register', rateLimiter(15 * 60 * 1000, 20));

// System Health Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  return sendSuccess(res, 'Smart Warranty Platform Core Engine is operational.', {
    environment: config.nodeEnv,
    timestamp: new Date().toISOString()
  });
});

// Modular Feature API Routers
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/warranties', warrantyRoutes);
app.use('/api/payments', paymentsRouter);
app.use('/api/payouts', payoutsRouter);
app.use('/api/deliveries', deliveriesRouter);

// Modular Team Endpoint Placeholders
app.use('/api/orders', ordersRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/expiry', expiryRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/predictions', predictionsRoutes);
app.use('/api/donations', donationsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Fallback routing for SPA frontend
app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API Endpoint not found' });
  }
  if (req.path.startsWith('/admin')) {
    return res.sendFile(path.join(__dirname, '../public/admin.html'));
  }
  return res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Centralized Error Middleware
app.use(errorHandler);

export default app;
