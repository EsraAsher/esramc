/**
 * Purchase Routes — endpoints for the in-game plugin to query purchases.
 *
 * GET  /api/purchases/unnotified?username=<player>
 * POST /api/purchases/mark-notified
 */
import { Router } from 'express';
import crypto from 'crypto';
import Purchase from '../models/Purchase.js';

const router = Router();

const PLUGIN_SERVER_SECRET = process.env.PLUGIN_SERVER_SECRET || '';

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
 * Middleware: verify plugin server secret.
 * The plugin must send x-server-secret header matching PLUGIN_SERVER_SECRET.
 */
function verifyPluginSecret(req, res, next) {
  const secret = req.headers['x-server-secret'];
  if (!safeSecretEquals(secret, PLUGIN_SERVER_SECRET)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
}

// ─── GET /api/purchases/unnotified?username=<player> ─────
// Returns only delivered but un-notified purchases for a player (oldest first).
router.get('/unnotified', verifyPluginSecret, async (req, res) => {
  try {
    const username = String(req.query.username || '').trim();
    if (!username) {
      return res.status(400).json({ success: false, message: 'username query is required' });
    }

    const purchases = await Purchase.find({
      player: new RegExp(`^${escapeRegex(username)}$`, 'i'), // case-insensitive match
      status: 'delivered',
      notified: false,
    })
      .sort({ createdAt: 1 })
      .select('_id type value')
      .lean();

    // Shape response for the plugin
    const formattedPurchases = purchases.map((p) => {
      const base = {
        purchaseId: p._id.toString(),
        type: p.type,
      };
      if (p.type === 'rank') {
        base.rank = String(p.value);
      } else if (p.type === 'money') {
        base.amount = Number(p.value);
      }
      return base;
    });

    res.json({
      success: true,
      purchases: formattedPurchases,
    });
  } catch (err) {
    console.error('[Purchases] Error fetching unnotified:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/purchases/mark-notified ────────────────────
// Body: { purchaseId: "<id>" }
router.post('/mark-notified', verifyPluginSecret, async (req, res) => {
  try {
    const purchaseId = String(req.body?.purchaseId || '').trim();
    if (!purchaseId) {
      return res.status(400).json({ success: false, message: 'purchaseId is required' });
    }

    const updated = await Purchase.findOneAndUpdate(
      {
        _id: purchaseId,
        status: 'delivered',
        notified: false,
      },
      {
        $set: {
          notified: true,
        },
      },
      { new: true }
    );

    if (!updated) {
      const existing = await Purchase.findById(purchaseId).select('_id status notified');
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Purchase not found' });
      }

      // idempotent success for already-notified delivered purchases
      if (existing.status === 'delivered' && existing.notified === true) {
        return res.json({ success: true });
      }

      // reject premature notify attempts before successful delivery
      if (existing.status !== 'delivered') {
        return res.status(400).json({ success: false, message: 'Purchase not delivered yet' });
      }

      return res.json({ success: true });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Purchases] Error marking notified:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
