import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import adminRoutes from './routes/admin.js';
import collectionRoutes from './routes/collections.js';
import productRoutes from './routes/products.js';
import analyticsRoutes from './routes/analytics.js';
import paymentRoutes from './routes/payments.js';
import storeCodeRoutes from './routes/storecode.js';
import rewardsRoutes from './routes/rewards.js';
import ticketRoutes from './routes/tickets.js';
import votingRoutes from './routes/voting.js';
import referralRoutes from './routes/referrals.js';
import creatorRoutes from './routes/creator.js';
import payoutRoutes from './routes/payouts.js';
import settingsRoutes from './routes/settings.js';
import botRoutes from './routes/bot.js';
import purchaseRoutes from './routes/purchases.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');

// Trust Render's (and other reverse proxies') X-Forwarded-For header
// Required for express-rate-limit to correctly identify client IPs
app.set('trust proxy', 1);

// ─── Security Headers ───────────────────────────────────
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:', 'wss:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: null,
    },
  },
}));

// ─── Rate Limiting ──────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again later.' },
});

// ─── CORS ─────────────────────────────────────────────────
// Allow local dev + any Vercel deployment + custom FRONTEND_URL
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://store.redlinesmp.fun',
  'https://redlinesmp.fun',
  'https://www.redlinesmp.fun',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    // Allow any Vercel preview/production deployment
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    // Allow explicitly listed origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use('/api', globalLimiter);
app.use(['/api/admin/login', '/api/creator/login'], authLimiter);

// ⚠️ Webhook routes MUST use raw body — define BEFORE express.json()
// Support both plural and singular paths to avoid dashboard URL mismatch issues.
app.use(['/api/payments/webhook', '/api/payment/webhook'], express.raw({ type: 'application/json' }));
app.use(['/api/payments/cashfree-webhook', '/api/payment/cashfree-webhook'], express.raw({ type: 'application/json' }));

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf?.toString('utf8') || '';
  },
}));

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/products', productRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/storecode', storeCodeRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/voting', votingRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/creator', creatorRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/purchases', purchaseRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route — confirms API is online
app.get('/', (req, res) => {
  res.json({ message: 'Redline SMP API is running', docs: '/api/health' });
});

// Connect to MongoDB then start server
const start = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not set in server/.env');
    }
    await connectDB();
    app.listen(PORT, () => {
      console.log(`\n✅ Redline SMP Server running on http://localhost:${PORT}`);
      console.log(`📡 MongoDB connected`);
      console.log(`\n  → Admin panel: http://localhost:5173/adminishere\n`);
    });
  } catch (err) {
    console.error('\n❌ Server failed to start:', err.message);
    console.error('\nCheck your MONGODB_URI in server/.env');
    process.exit(1);
  }
};

start();
