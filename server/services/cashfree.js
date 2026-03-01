/**
 * Cashfree Payment Gateway Service
 *
 * Provides:
 *   createCashfreeOrder(orderData)  → create a Cashfree PG order, return payment_session_id
 *   verifyCashfreeWebhook(req)      → verify webhook signature + parse payload
 *
 * Env vars required:
 *   CASHFREE_APP_ID
 *   CASHFREE_SECRET_KEY
 *   CASHFREE_WEBHOOK_SECRET
 *   CASHFREE_ENV            → "SANDBOX" or "PRODUCTION"
 */
import crypto from 'crypto';

// ─── Helpers ──────────────────────────────────────────────

function getCashfreeConfig() {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET;
  const env = (process.env.CASHFREE_ENV || 'SANDBOX').toUpperCase();

  if (!appId || !secretKey) {
    throw new Error('Cashfree credentials (CASHFREE_APP_ID / CASHFREE_SECRET_KEY) not configured.');
  }

  const baseUrl =
    env === 'PRODUCTION'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';

  return { appId, secretKey, webhookSecret, baseUrl, env };
}

// ─── Create Cashfree Order ────────────────────────────────

/**
 * Create a Cashfree PG order.
 *
 * @param {Object} orderData
 * @param {string} orderData.orderId    — internal Mongo _id (used as order_id)
 * @param {number} orderData.amount     — total in INR (e.g. 299.00)
 * @param {string} orderData.currency   — e.g. 'INR'
 * @param {string} orderData.mcUsername  — Minecraft username (metadata)
 * @param {string} orderData.email       — buyer email (used for Cashfree customer)
 * @param {string} orderData.returnUrl   — frontend URL to redirect after payment
 *
 * @returns {{ cfOrderId: string, paymentSessionId: string }}
 */
export async function createCashfreeOrder(orderData) {
  const { appId, secretKey, baseUrl } = getCashfreeConfig();

  const payload = {
    order_id: orderData.orderId,
    order_amount: orderData.amount,
    order_currency: orderData.currency || 'INR',
    customer_details: {
      customer_id: orderData.mcUsername.replace(/[^a-zA-Z0-9_-]/g, '_'),
      customer_email: orderData.email || 'noreply@redlinesmp.fun',
      customer_phone: '9999999999', // required by Cashfree, placeholder
    },
    order_meta: {
      return_url: orderData.returnUrl || process.env.FRONTEND_URL || 'https://store.redlinesmp.fun',
      notify_url: null, // webhook is configured in Cashfree dashboard, not per-order
    },
    order_note: `Redline SMP purchase for ${orderData.mcUsername}`,
    order_tags: {
      mcUsername: orderData.mcUsername,
    },
  };

  const response = await fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': appId,
      'x-client-secret': secretKey,
      'x-api-version': '2023-08-01',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[Cashfree] Order creation failed:', JSON.stringify(data));
    throw new Error(data.message || 'Cashfree order creation failed');
  }

  if (!data.payment_session_id) {
    console.error('[Cashfree] No payment_session_id in response:', JSON.stringify(data));
    throw new Error('Cashfree did not return a payment session');
  }

  return {
    cfOrderId: data.cf_order_id,
    paymentSessionId: data.payment_session_id,
  };
}

// ─── Verify Cashfree Webhook ──────────────────────────────

/**
 * Verify Cashfree webhook signature and parse payload.
 *
 * Cashfree sends the signature in the `x-webhook-signature` header.
 * Signature = base64-encoded HMAC-SHA256 of the raw body using the webhook secret.
 *
 * @param {import('express').Request} req — Express request with raw Buffer body
 * @returns {{ verified: boolean, event: object|null, reason?: string }}
 */
export function verifyCashfreeWebhook(req) {
  const { webhookSecret } = getCashfreeConfig();

  if (!webhookSecret) {
    console.error('[Cashfree Webhook] CASHFREE_WEBHOOK_SECRET is not configured!');
    return { verified: false, event: null, reason: 'Webhook secret not configured' };
  }

  const signature = req.headers['x-webhook-signature'];
  if (!signature) {
    console.warn('[Cashfree Webhook] Missing x-webhook-signature header');
    return { verified: false, event: null, reason: 'Missing signature header' };
  }

  if (!Buffer.isBuffer(req.body)) {
    console.error('[Cashfree Webhook] req.body is not a raw Buffer');
    return { verified: false, event: null, reason: 'Invalid payload format' };
  }

  // Cashfree uses base64-encoded HMAC-SHA256
  const timestamp = req.headers['x-webhook-timestamp'];
  const ts = Number(timestamp);

  if (!timestamp || Number.isNaN(ts) || Math.abs(Date.now() - ts) > 10 * 60 * 1000) {
    return { verified: false, event: null, reason: 'Timestamp expired or invalid' };
  }

  const rawBody = req.body.toString('utf8');

  // Cashfree v2 signature: HMAC-SHA256(timestamp + rawBody, secret) → base64
  const signPayload = timestamp + rawBody;
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(signPayload)
    .digest('base64');

  if (signature !== expectedSignature) {
    console.warn('[Cashfree Webhook] Invalid signature — rejecting');
    return { verified: false, event: null, reason: 'Invalid signature' };
  }

  // Parse only after signature verification
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    console.error('[Cashfree Webhook] Failed to parse JSON body:', err.message);
    return { verified: false, event: null, reason: 'Malformed JSON' };
  }

  return { verified: true, event };
}
