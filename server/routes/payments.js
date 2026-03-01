/**
 * Payment Routes — Razorpay + Cashfree integration (Webhook-Only Confirmation)
 *
 * POST /api/payments/create-order       → create payment order (provider decided by PAYMENT_PROVIDER env)
 * POST /api/payments/webhook             → Razorpay webhook (server-to-server)
 * POST /api/payments/cashfree-webhook    → Cashfree webhook (server-to-server)
 * GET  /api/payments/order/:id           → get order status (for polling / thank-you page)
 *
 * ⚠️  Frontend NEVER confirms payment. Only webhooks mark orders as paid.
 */
import { Router } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import Razorpay from 'razorpay';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import StoreCode from '../models/StoreCode.js';
import ReferralPartner from '../models/ReferralPartner.js';
import ReferralFraudLog from '../models/ReferralFraudLog.js';
import { createCashfreeOrder, verifyCashfreeWebhook } from '../services/cashfree.js';
import { deliverOrder } from '../services/rcon.js';

const router = Router();

// ─── Rate limiter for checkout (S4) ──────────────────
const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many checkout attempts. Please try again in a minute.' },
});

// ─── Razorpay instance ────────────────────────────────────
function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error('Razorpay keys not configured in server/.env');
  }
  return new Razorpay({ key_id, key_secret });
}

// ─── 1. Create Razorpay Order ─────────────────────────────
router.post('/create-order', checkoutLimiter, async (req, res) => {
  try {
    const { mcUsername, email, items, storeCode, referralCode } = req.body;

    if (!mcUsername || !items?.length) {
      return res.status(400).json({ message: 'mcUsername and items are required' });
    }

    if (!storeCode) {
      return res.status(400).json({ message: 'Store code is required. Use /storecode in-game to get one.' });
    }

    // Find valid, unused, unexpired store code and consume it atomically
    const validCode = await StoreCode.findOneAndUpdate(
      {
        username: mcUsername,
        code: storeCode,
        used: false,
        expiresAt: { $gt: new Date() },
      },
      { used: true },
      { new: true }
    );

    if (!validCode) {
      return res.status(403).json({ message: 'Invalid or expired store code. Please generate a new one in-game.' });
    }

    // Validate products exist & are active, get real prices
    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true });

    if (products.length !== productIds.length) {
      return res.status(400).json({ message: 'One or more products are unavailable' });
    }

    // Build order items with server-side prices (never trust client prices)
    let total = 0;
    const orderItems = items.map((clientItem) => {
      const prod = products.find((p) => p._id.toString() === clientItem.productId);
      const qty = Math.max(1, parseInt(clientItem.quantity) || 1);
      total += prod.price * qty;
      return {
        product: prod._id,
        title: prod.title,
        price: prod.price,
        quantity: qty,
        commands: prod.commands || [],
      };
    });

    // Round to 2 decimals
    total = Math.round(total * 100) / 100;

    // ── Referral code validation (Phase 2) ──────────────────
    let referralSnapshot = null;

    if (referralCode && referralCode.trim()) {
      const code = referralCode.trim().toUpperCase();

      // Find the referral partner
      const partner = await ReferralPartner.findOne({ referralCode: code });
      if (!partner) {
        return res.status(400).json({ message: `Referral code "${code}" does not exist.` });
      }

      // Status must be active (not paused or banned)
      if (partner.status !== 'active') {
        return res.status(400).json({ message: 'This referral code is currently inactive.' });
      }

      // Check expiry
      if (partner.expiresAt && new Date() > partner.expiresAt) {
        return res.status(400).json({ message: 'This referral code has expired.' });
      }

      // Check max uses
      if (partner.maxUses !== null && partner.totalUses >= partner.maxUses) {
        return res.status(400).json({ message: 'This referral code has reached its maximum usage limit.' });
      }

      // Prevent self-use: buyer's mcUsername must not match creator's
      if (partner.minecraftUsername && mcUsername.trim().toLowerCase() === partner.minecraftUsername.trim().toLowerCase()) {
        // Fraud log: self-use attempt (non-blocking)
        ReferralFraudLog.create({ referralCode: code, type: 'self_use', metadata: { ip: req.ip, mcUsername: mcUsername.trim(), partnerCreatorName: partner.creatorName } }).catch(() => {});
        return res.status(400).json({ message: 'You cannot use your own referral code.' });
      }

      // Calculate discount server-side
      const discountAmount = Math.round(total * (partner.discountPercent / 100) * 100) / 100;

      referralSnapshot = {
        referralCodeUsed: code,
        referralCreatorId: partner._id,
        referralDiscountApplied: discountAmount,
        referralCommissionSnapshot: partner.commissionPercent,
        referralTracked: false,
      };

      // Apply discount
      total = Math.round((total - discountAmount) * 100) / 100;
      if (total < 1) total = 1; // Razorpay minimum ₹1
    }
    // ── End referral validation ─────────────────────────────
    // Non-blocking fraud monitoring (S5)
    if (referralSnapshot) {
      logReferralFraudCheck(req.ip, email, referralSnapshot.referralCodeUsed).catch(() => {});
    }

    // ── Provider switch ─────────────────────────────────────
    const provider = (process.env.PAYMENT_PROVIDER || 'razorpay').toLowerCase();

    if (provider === 'cashfree') {
      // ── Cashfree flow ─────────────────────────────────────
      // 1. Persist order in DB first (status: pending)
      const order = await Order.create({
        mcUsername,
        email: email || '',
        items: orderItems,
        total,
        currency: 'INR',
        provider: 'cashfree',
        status: 'pending',
        paymentStatus: 'created',
        ...(referralSnapshot || {}),
      });

      // 2. Create Cashfree order via API
      const cfResult = await createCashfreeOrder({
        orderId: order._id.toString(),
        amount: total,
        currency: 'INR',
        mcUsername,
        email: email || '',
        returnUrl: `${process.env.FRONTEND_URL || 'https://store.redlinesmp.fun'}?order=${order._id}`,
      });

      // 3. Save Cashfree order ID back
      order.cashfreeOrderId = cfResult.cfOrderId;
      await order.save();

      // 4. Return response (same shape + cashfree extras)
      return res.json({
        orderId: order._id,
        provider: 'cashfree',
        paymentSessionId: cfResult.paymentSessionId,
        cashfreeOrderId: cfResult.cfOrderId,
        cashfreeEnv: (process.env.CASHFREE_ENV || 'SANDBOX').toUpperCase(),
        amount: Math.round(total * 100), // paise (same unit as Razorpay for frontend consistency)
        currency: 'INR',
        mcUsername,
        ...(referralSnapshot ? {
          referralApplied: true,
          referralCode: referralSnapshot.referralCodeUsed,
          discountAmount: referralSnapshot.referralDiscountApplied,
        } : {}),
      });
    }

    // ── Razorpay flow (default, unchanged) ──────────────────
    // Create Razorpay order (amount in smallest unit — paise for INR)
    const rz = getRazorpay();
    const rzOrder = await rz.orders.create({
      amount: Math.round(total * 100), // paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: {
        mcUsername,
        email: email || '',
      },
    });

    // Persist order in DB
    const order = await Order.create({
      mcUsername,
      email: email || '',
      items: orderItems,
      total,
      currency: 'INR',
      provider: 'razorpay',
      razorpayOrderId: rzOrder.id,
      status: 'created',
      paymentStatus: 'created',
      // Referral snapshot (null-safe spread)
      ...(referralSnapshot || {}),
    });

    res.json({
      orderId: order._id,
      provider: 'razorpay',
      razorpayOrderId: rzOrder.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      amount: rzOrder.amount,
      currency: rzOrder.currency,
      mcUsername,
      // Return discount info so frontend can display it (not used for calculation)
      ...(referralSnapshot ? {
        referralApplied: true,
        referralCode: referralSnapshot.referralCodeUsed,
        discountAmount: referralSnapshot.referralDiscountApplied,
      } : {}),
    });
  } catch (err) {
    console.error('[Payment] create-order error:', err);
    res.status(500).json({ message: err.message || 'Failed to create order' });
  }
});

// ─── 2. (REMOVED) Client-side Verification ───────────────
// Frontend no longer confirms payment. Only Razorpay webhook can mark orders as paid.
// This route has been intentionally removed for security.

// ─── 3. Razorpay Webhook (ONLY way to confirm payment) ───
// POST /api/payments/webhook — called by Razorpay servers
// ⚠️  Raw body parsing is handled in server/index.js BEFORE express.json()
router.post('/webhook', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[Webhook] RAZORPAY_WEBHOOK_SECRET is not configured!');
      return res.status(500).send('Webhook secret not configured');
    }

    console.log('Webhook received');
    console.log('Headers:', req.headers);
    console.log('Raw body length:', req.body?.length ?? 0);

    // Verify webhook signature using raw body buffer
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      console.warn('[Webhook] Missing x-razorpay-signature header');
      return res.status(400).send('Missing webhook signature');
    }

    if (!Buffer.isBuffer(req.body)) {
      console.error('[Webhook] req.body is not a raw Buffer. Check middleware order/path.');
      return res.status(400).send('Invalid webhook payload format');
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('[Webhook] Invalid signature — rejecting');
      return res.status(400).send('Invalid webhook signature');
    }

    // Parse the event only after signature verification
    const event = JSON.parse(req.body.toString('utf8'));
    console.log('Event:', event?.event);
    console.log('[Webhook] Received:', event.event);

    // Only process payment.captured events
    if (event.event !== 'payment.captured') {
      console.log(`[Webhook] Ignoring event: ${event.event}`);
      return res.status(200).send('Event ignored');
    }

    // Extract payment data
    const payment = event.payload.payment.entity;
    const paymentId = payment.id;
    const razorpayOrderId = payment.order_id;
    const notes = payment.notes || {};
    const mcUsername = notes.mcUsername;

    console.log('[Webhook] Processing payment ID:', paymentId);
    console.log('[Webhook] Razorpay Order ID:', razorpayOrderId);
    console.log('[Webhook] MC Username:', mcUsername);

    // Prevent duplicate processing
    const existing = await Order.findOne({ razorpayPaymentId: paymentId });
    if (existing) {
      console.log('[Webhook] Already processed payment:', paymentId);
      return res.status(200).send('Already processed');
    }

    // Find and update order — ONLY set paid + pending delivery
    const order = await Order.findOneAndUpdate(
      { razorpayOrderId: razorpayOrderId },
      {
        status: 'paid',
        paymentStatus: 'paid',
        webhookVerified: true,
        deliveryStatus: 'pending',
        razorpayPaymentId: paymentId,
        paidAt: new Date(),
      },
      { new: true }
    );

    if (!order) {
      console.warn(`[Webhook] Order not found for razorpayOrderId: ${razorpayOrderId}`);
      return res.status(200).send('Order not found'); // 200 so Razorpay doesn't retry
    }

    console.log(`[Webhook] ✅ Order ${order._id} marked as PAID (webhook verified)`);

    // Update product analytics
    await updateProductAnalytics(order);

    // Track referral commission (Phase 3)
    await trackReferralCommission(order);

    res.status(200).send('OK');
  } catch (err) {
    console.error('[Webhook] Error:', err);
    res.status(200).send('Error handled'); // always 200 to prevent Razorpay retries
  }
});

// ─── 3b. Cashfree Webhook ─────────────────────────────────
// POST /api/payments/cashfree-webhook — called by Cashfree servers
// ⚠️  Raw body parsing is handled in server/index.js BEFORE express.json()
router.post('/cashfree-webhook', async (req, res) => {
  try {
    // Verify signature
    const { verified, event, reason } = verifyCashfreeWebhook(req);
    if (!verified) {
      console.warn(`[Cashfree Webhook] Rejected: ${reason}`);
      return res.status(400).send('Invalid webhook');
    }

    console.log('[Cashfree Webhook] Received event type:', event?.type);

    // Only process PAYMENT_SUCCESS events
    // Cashfree event types: PAYMENT_SUCCESS, PAYMENT_FAILED, PAYMENT_USER_DROPPED, etc.
    if (event.type !== 'PAYMENT_SUCCESS_WEBHOOK') {
      // Also check for the older event format
      const eventType = event.type || event.event;
      if (eventType !== 'PAYMENT_SUCCESS_WEBHOOK' && eventType !== 'PAYMENT_SUCCESS') {
        console.log(`[Cashfree Webhook] Ignoring event: ${eventType}`);
        return res.status(200).send('Event ignored');
      }
    }

    // Extract payment data from Cashfree payload
    const paymentData = event.data || {};
    const cfPayment = paymentData.payment || {};
    const cfOrder = paymentData.order || {};
    const internalOrderId = cfOrder.order_id; // This is our Mongo _id
    const cfPaymentId = String(cfPayment.cf_payment_id || cfPayment.payment_id || '');
    const paidAmount = parseFloat(cfOrder.order_amount || cfPayment.payment_amount || 0);
    const paidCurrency = cfOrder.order_currency || cfPayment.payment_currency || 'INR';
    const paymentStatus = cfPayment.payment_status || '';

    console.log('[Cashfree Webhook] Order ID:', internalOrderId);
    console.log('[Cashfree Webhook] Payment ID:', cfPaymentId);
    console.log('[Cashfree Webhook] Amount:', paidAmount, paidCurrency);
    console.log('[Cashfree Webhook] Payment Status:', paymentStatus);

    if (!internalOrderId) {
      console.warn('[Cashfree Webhook] No order_id in payload');
      return res.status(200).send('Missing order_id');
    }

    // Find the order in DB
    const order = await Order.findById(internalOrderId);
    if (!order || order.provider !== 'cashfree') {
      console.error('[Cashfree Webhook] Provider mismatch or order not found');
      return res.status(200).end();
    }

    // ── Idempotency: already paid → skip ──
    if (order.status === 'paid' || order.status === 'delivered') {
      console.log(`[Cashfree Webhook] Order ${internalOrderId} already ${order.status} — skipping`);
      return res.status(200).end();
    }

    // ── Validate amount & currency match ──
    const expectedAmount = order.total;
    if (Math.abs(paidAmount - expectedAmount) > 0.01) {
      console.error(`[Cashfree Webhook] ⚠️ AMOUNT MISMATCH: expected ${expectedAmount}, got ${paidAmount} for order ${internalOrderId}`);
      // Log suspicious mismatch but don't expose details
      return res.status(200).send('Amount mismatch');
    }
    if (paidCurrency !== order.currency) {
      console.error(`[Cashfree Webhook] ⚠️ CURRENCY MISMATCH: expected ${order.currency}, got ${paidCurrency} for order ${internalOrderId}`);
      return res.status(200).send('Currency mismatch');
    }

    // ── Validate payment status ──
    if (paymentStatus !== 'SUCCESS') {
      console.log(`[Cashfree Webhook] Payment not successful (status: ${paymentStatus}) for order ${internalOrderId}`);
      if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
        order.status = 'failed';
        order.paymentStatus = 'failed';
        await order.save();
      }
      return res.status(200).send('Payment not successful');
    }

    // ── Prevent duplicate payment ID processing ──
    if (cfPaymentId) {
      const duplicate = await Order.findOne({ cashfreePaymentId: cfPaymentId });
      if (duplicate && duplicate._id.toString() !== order._id.toString()) {
        console.error(`[Cashfree Webhook] ⚠️ Payment ID ${cfPaymentId} already used on a different order!`);
        return res.status(200).send('Duplicate payment ID');
      }
    }

    // ── Mark order as paid ──
    order.status = 'paid';
    order.paymentStatus = 'paid';
    order.webhookVerified = true;
    order.deliveryStatus = 'pending';
    order.cashfreePaymentId = cfPaymentId;
    order.paidAt = new Date();
    await order.save();

    console.log(`[Cashfree Webhook] ✅ Order ${order._id} marked as PAID (webhook verified)`);

    // ── RCON delivery ──
    try {
      const { success, log } = await deliverOrder(order.mcUsername, order.items);
      order.deliveryStatus = success ? 'delivered' : 'failed';
      order.deliveryLog = log;
      order.deliveredAt = success ? new Date() : undefined;
      await order.save();
      if (success) {
        console.log(`[Cashfree Webhook] ✅ RCON delivery complete for order ${order._id}`);
      } else {
        console.warn(`[Cashfree Webhook] ⚠️ RCON delivery failed for order ${order._id}`);
      }
    } catch (rconErr) {
      console.error(`[Cashfree Webhook] RCON error for order ${order._id}:`, rconErr.message);
      order.deliveryStatus = 'failed';
      order.deliveryLog = [`[RCON] ERROR: ${rconErr.message}`];
      await order.save();
    }

    // Update product analytics
    await updateProductAnalytics(order);

    // Track referral commission
    await trackReferralCommission(order);

    res.status(200).send('OK');
  } catch (err) {
    console.error('[Cashfree Webhook] Error:', err);
    res.status(200).send('Error handled'); // always 200 to prevent Cashfree retries
  }
});

// ─── 4. Get Order Status ──────────────────────────────────
router.get('/order/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).select(
      'mcUsername items total status paymentStatus deliveryStatus createdAt paidAt deliveredAt'
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Helpers ───────────────────────────────────────────────

/**
 * Update totalSold / totalRevenue on each Product after a successful payment.
 */
async function updateProductAnalytics(order) {
  try {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: {
          totalSold: item.quantity,
          totalRevenue: item.price * item.quantity,
        },
      });
    }
  } catch (err) {
    console.error('[Analytics] Failed to update product stats:', err.message);
  }
}

/**
 * Track referral commission after a verified payment.
 * Only runs if:
 *   - order has referralCodeUsed
 *   - referralTracked is false (prevents duplicate commission)
 *   - paymentStatus is 'paid' and webhookVerified is true
 *   - order is not refunded or failed
 */
async function trackReferralCommission(order) {
  try {
    // Guard: must have referral code and not already tracked
    if (!order.referralCodeUsed || order.referralTracked) return;

    // Guard: only process fully verified paid orders
    if (order.paymentStatus !== 'paid' || !order.webhookVerified) return;

    // Guard: skip refunded / failed orders
    if (order.status === 'refunded' || order.status === 'failed') return;

    // Fetch fresh partner data for race-condition-safe maxUses enforcement (S6)
    const partner = await ReferralPartner.findById(order.referralCreatorId);
    if (!partner) {
      console.warn(`[Referral] Partner ${order.referralCreatorId} not found — skipping commission for order ${order._id}`);
      return;
    }

    // Calculate commission from final paid amount (order.total = discounted amount)
    const commission = Math.round(order.total * (order.referralCommissionSnapshot / 100) * 100) / 100;

    // Build atomic filter with maxUses guard to prevent race conditions (S6)
    const filter = { _id: order.referralCreatorId };
    if (partner.maxUses !== null) {
      filter.totalUses = { $lt: partner.maxUses };
    }

    // Atomically update the referral partner's tracking counters
    const updated = await ReferralPartner.findOneAndUpdate(
      filter,
      {
        $inc: {
          totalUses: 1,
          totalRevenueGenerated: order.total,
          totalCommissionEarned: commission,
          pendingCommission: commission,
        },
      },
      { new: true }
    );

    if (!updated) {
      console.log(`[Referral] Code ${order.referralCodeUsed} hit maxUses cap — commission skipped for order ${order._id}`);
      order.referralTracked = true;
      await order.save();
      return;
    }

    // Mark order as tracked so commission is never applied twice
    order.referralTracked = true;
    await order.save();

    console.log(`[Referral] ✅ Commission ₹${commission} tracked for code ${order.referralCodeUsed} (order ${order._id})`);
  } catch (err) {
    // Non-fatal: log but don't break the webhook response
    console.error('[Referral] Commission tracking error:', err.message);
  }
}

/**
 * Non-blocking fraud monitoring for referral code usage (S5).
 * Logs a 'code_usage' entry and checks for suspicious patterns.
 */
async function logReferralFraudCheck(ip, email, referralCode) {
  try {
    // Log this usage
    await ReferralFraudLog.create({
      referralCode,
      type: 'code_usage',
      metadata: { ip, email },
    });

    // Check rapid repeat: same IP + same code > 3 times in 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const rapidCount = await ReferralFraudLog.countDocuments({
      referralCode,
      type: 'code_usage',
      'metadata.ip': ip,
      createdAt: { $gte: tenMinAgo },
    });
    if (rapidCount > 3) {
      await ReferralFraudLog.create({
        referralCode,
        type: 'rapid_repeat',
        metadata: { ip, email, details: `${rapidCount} uses from same IP in 10 min` },
      });
      console.warn(`[Fraud] ⚠️ Rapid repeat: IP ${ip} used code ${referralCode} ${rapidCount}x in 10 min`);
    }

    // Check suspicious pattern: same email + same code > 3 total uses
    if (email) {
      const emailCount = await ReferralFraudLog.countDocuments({
        referralCode,
        type: 'code_usage',
        'metadata.email': email.toLowerCase(),
      });
      if (emailCount > 3) {
        await ReferralFraudLog.create({
          referralCode,
          type: 'suspicious_pattern',
          metadata: { ip, email, details: `Email ${email} used code ${referralCode} ${emailCount} times total` },
        });
        console.warn(`[Fraud] ⚠️ Suspicious: ${email} used code ${referralCode} ${emailCount}x total`);
      }
    }
  } catch (err) {
    console.error('[Fraud] Logging error:', err.message);
  }
}

export default router;
