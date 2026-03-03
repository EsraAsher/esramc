/**
 * Purchase Routes — plugin-owned delivery endpoints.
 *
 * GET  /api/purchases/unnotified?username=<player>   — fetch pending purchases
 * POST /api/purchases/mark-delivered                 — plugin reports success
 * POST /api/purchases/mark-failed                    — plugin reports failure
 */
import { Router } from 'express';
import crypto from 'crypto';
import Purchase from '../models/Purchase.js';

const router = Router();

const SERVER_SECRET = process.env.SERVER_SECRET || '';

// Max delivery attempts before a purchase is marked 'failed'
const DELIVERY_ATTEMPT_THRESHOLD = parseInt(process.env.DELIVERY_ATTEMPT_THRESHOLD || '5', 10);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safeSecretEquals(incoming, expected) {
  if (!incoming || !expected) return false;
  const incomingBuf = Buffer.from(String(incoming));
  const expectedBuf = Buffer.from(String(expected));
  if (incomingBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(incomingBuf, expectedBuf);
}

/**
 * Middleware: verify plugin server secret via x-server-secret header.
 */
function verifyPluginSecret(req, res, next) {
  const secret = req.headers['x-server-secret'];
  if (!safeSecretEquals(secret, SERVER_SECRET)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
}

// ─── GET /api/purchases/unnotified?username=<player> ─────
// Returns all pending (undelivered) purchases for a player, oldest first.
router.get('/unnotified', verifyPluginSecret, async (req, res) => {
  try {
    const username = String(req.query.username || '').trim();
    if (!username) {
      return res.status(400).json({ success: false, message: 'username query is required' });
    }

    const purchases = await Purchase.find({
      player: new RegExp(`^${escapeRegex(username)}$`, 'i'),
      status: 'pending',
    })
      .sort({ createdAt: 1 })
      .select('_id type value player')
      .lean();

    const formattedPurchases = purchases.map((p) => {
      const base = {
        purchaseId: p._id.toString(),
        player: p.player,
        type: p.type,
        status: 'pending',
      };
      if (p.type === 'rank') {
        base.rank = String(p.value);
      } else if (p.type === 'money') {
        base.amount = Number(p.value);
      }
      return base;
    });

    res.json({ success: true, purchases: formattedPurchases });
  } catch (err) {
    console.error('[Purchases] Error fetching pending:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/purchases/mark-delivered ───────────────────
// Body: { purchaseId: "<id>" }
// Plugin calls this after successfully delivering the item in-game.
router.post('/mark-delivered', verifyPluginSecret, async (req, res) => {
  try {
    const purchaseId = String(req.body?.purchaseId || '').trim();
    if (!purchaseId) {
      return res.status(400).json({ success: false, message: 'purchaseId is required' });
    }

    const updated = await Purchase.findOneAndUpdate(
      { _id: purchaseId, status: 'pending' },
      { $set: { status: 'delivered', deliveredAt: new Date(), lastError: null } },
      { new: true }
    );

    if (!updated) {
      // Check whether it already exists (idempotent) or truly missing
      const existing = await Purchase.findById(purchaseId).select('_id status').lean();
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Purchase not found' });
      }
      // Already delivered — idempotent success
      return res.json({ success: true, alreadyDelivered: true });
    }

    console.log(`[Purchases] ✅ Delivered purchase ${purchaseId} for ${updated.player}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[Purchases] Error marking delivered:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/purchases/mark-failed ──────────────────────
// Body: { purchaseId: "<id>", error: "<reason>" }
// Plugin calls this when delivery failed. Increments attempt counter.
// After DELIVERY_ATTEMPT_THRESHOLD failures, status is set to 'failed'.
router.post('/mark-failed', verifyPluginSecret, async (req, res) => {
  try {
    const purchaseId = String(req.body?.purchaseId || '').trim();
    const errorMsg = String(req.body?.error || 'Unknown error').trim();

    if (!purchaseId) {
      return res.status(400).json({ success: false, message: 'purchaseId is required' });
    }

    // Single atomic pipeline update: increment attempts + conditionally escalate status
    const updated = await Purchase.findOneAndUpdate(
      { _id: purchaseId, status: 'pending' },
      [
        {
          $set: {
            deliveryAttempts: { $add: ['$deliveryAttempts', 1] },
            lastError: errorMsg,
          },
        },
        {
          $set: {
            status: {
              $cond: {
                if: { $gte: ['$deliveryAttempts', DELIVERY_ATTEMPT_THRESHOLD] },
                then: 'failed',
                else: '$status',
              },
            },
          },
        },
      ],
      { new: true }
    );

    if (!updated) {
      const existing = await Purchase.findById(purchaseId).select('_id status').lean();
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Purchase not found' });
      }
      // Already delivered or failed — nothing to do
      return res.json({ success: true, status: existing.status });
    }

    if (updated.status === 'failed') {
      console.warn(
        `[Purchases] ❌ Purchase ${purchaseId} for ${updated.player} permanently failed after ${updated.deliveryAttempts} attempt(s). Last error: ${errorMsg}`
      );
      return res.json({ success: true, status: 'failed', attempts: updated.deliveryAttempts });
    }

    console.warn(
      `[Purchases] ⚠️ Purchase ${purchaseId} for ${updated.player} failed (attempt ${updated.deliveryAttempts}/${DELIVERY_ATTEMPT_THRESHOLD}): ${errorMsg}`
    );
    res.json({ success: true, status: 'pending', attempts: updated.deliveryAttempts });
  } catch (err) {
    console.error('[Purchases] Error marking failed:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
