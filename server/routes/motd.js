/**
 * MOTD (Limited Time Deal) Routes
 *
 * Public:
 *   GET  /api/motd              — get active MOTD for store (no auth)
 *
 * Admin:
 *   GET  /api/motd/admin        — get full MOTD config
 *   PUT  /api/motd/admin        — update MOTD config
 *   POST /api/motd/admin/stock/decrement — (internal) atomic stock decrement
 */
import { Router } from 'express';
import MOTD from '../models/MOTD.js';
import Product from '../models/Product.js';
import authMiddleware from '../middleware/auth.js';

const router = Router();

// ─── Public: Get Active MOTD ──────────────────────────────
// Returns the deal info only if enabled, within schedule, and product is valid.
router.get('/', async (req, res) => {
  try {
    const motd = await MOTD.findOne().populate('product', 'title price image features commands isActive collection').lean();

    if (!motd || !motd.enabled) {
      return res.json({ active: false });
    }

    const now = new Date();

    // Not started yet
    if (motd.startDate && now < new Date(motd.startDate)) {
      return res.json({ active: false });
    }

    // Expired
    const expired = motd.endDate && now > new Date(motd.endDate);
    if (expired) {
      if (motd.expiryBehavior === 'show-expired') {
        return res.json({
          active: true,
          expired: true,
          title: motd.title,
          badgeText: motd.badgeText,
          bgColor: motd.bgColor,
          accentColor: motd.accentColor,
          expiryBehavior: motd.expiryBehavior,
        });
      }
      return res.json({ active: false });
    }

    // Product deleted or deactivated
    if (!motd.product || !motd.product.isActive) {
      return res.json({ active: false });
    }

    // Stock check
    const stockLimit = motd.stockLimit || 0;
    const stockSold = motd.stockSold || 0;
    const soldOut = stockLimit > 0 && stockSold >= stockLimit;

    res.json({
      active: true,
      expired: false,
      title: motd.title,
      badgeText: motd.badgeText,
      bgColor: motd.bgColor,
      accentColor: motd.accentColor,
      expiryBehavior: motd.expiryBehavior,
      endDate: motd.endDate,
      startDate: motd.startDate,
      stockLimit,
      stockRemaining: stockLimit > 0 ? Math.max(0, stockLimit - stockSold) : null,
      soldOut,
      mediaType: motd.mediaType,
      mediaUrl: motd.mediaUrl,
      product: {
        _id: motd.product._id,
        title: motd.product.title,
        price: motd.product.price,
        image: motd.product.image,
        features: motd.product.features,
        collection: motd.product.collection,
        maxQuantityPerOrder: motd.product.maxQuantityPerOrder || null,
      },
    });
  } catch (err) {
    console.error('[MOTD] Public fetch error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Admin: Get MOTD Config ───────────────────────────────
router.get('/admin', authMiddleware, async (req, res) => {
  try {
    let motd = await MOTD.findOne().populate('product', 'title price image isActive').lean();

    if (!motd) {
      // Auto-create a default disabled MOTD
      motd = await MOTD.create({
        enabled: false,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      motd = motd.toObject();
    }

    res.json(motd);
  } catch (err) {
    console.error('[MOTD] Admin fetch error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Admin: Update MOTD Config ────────────────────────────
router.put('/admin', authMiddleware, async (req, res) => {
  try {
    const {
      enabled, title, badgeText, bgColor, accentColor,
      product, startDate, endDate, stockLimit,
      mediaType, mediaUrl, expiryBehavior,
    } = req.body;

    // Validation: cannot enable without end date
    if (enabled && !endDate) {
      return res.status(400).json({ message: 'End date is required to enable the deal.' });
    }

    // Validation: cannot enable without product
    if (enabled && !product) {
      return res.status(400).json({ message: 'A product must be selected to enable the deal.' });
    }

    // Validate product exists if provided
    if (product) {
      const exists = await Product.findById(product).select('_id isActive').lean();
      if (!exists) {
        return res.status(400).json({ message: 'Selected product not found.' });
      }
      if (!exists.isActive) {
        return res.status(400).json({ message: 'Selected product is inactive. Activate it first.' });
      }
    }

    let motd = await MOTD.findOne();
    if (!motd) {
      motd = new MOTD({});
    }

    // Update fields
    if (typeof enabled === 'boolean') motd.enabled = enabled;
    if (title !== undefined) motd.title = title;
    if (badgeText !== undefined) motd.badgeText = badgeText;
    if (bgColor !== undefined) motd.bgColor = bgColor;
    if (accentColor !== undefined) motd.accentColor = accentColor;
    if (product !== undefined) motd.product = product || null;
    if (startDate !== undefined) motd.startDate = new Date(startDate);
    if (endDate !== undefined) motd.endDate = new Date(endDate);
    if (stockLimit !== undefined) motd.stockLimit = Math.max(0, parseInt(stockLimit) || 0);
    if (mediaType !== undefined) motd.mediaType = mediaType;
    if (mediaUrl !== undefined) motd.mediaUrl = mediaUrl;
    if (expiryBehavior !== undefined) motd.expiryBehavior = expiryBehavior;

    await motd.save();

    const populated = await MOTD.findById(motd._id).populate('product', 'title price image isActive').lean();
    res.json(populated);
  } catch (err) {
    console.error('[MOTD] Admin update error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Admin: Reset Stock ───────────────────────────────────
router.post('/admin/reset-stock', authMiddleware, async (req, res) => {
  try {
    const motd = await MOTD.findOneAndUpdate({}, { $set: { stockSold: 0 } }, { new: true });
    if (!motd) return res.status(404).json({ message: 'MOTD not found' });
    res.json({ success: true, stockSold: 0 });
  } catch (err) {
    console.error('[MOTD] Reset stock error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Atomic stock decrement — called internally from payment webhook.
 * Uses findOneAndUpdate with $inc to prevent race conditions.
 *
 * @returns {boolean} true if stock was available and decremented
 */
export async function decrementMOTDStock(productId) {
  try {
    const motd = await MOTD.findOne({ product: productId, enabled: true }).lean();
    if (!motd) return true; // not an MOTD product — allow purchase

    // Unlimited stock
    if (!motd.stockLimit || motd.stockLimit === 0) return true;

    // Check if still within schedule
    const now = new Date();
    if (motd.endDate && now > new Date(motd.endDate)) return true; // expired deal, normal product purchase

    // Atomic decrement: only if stockSold < stockLimit
    const result = await MOTD.findOneAndUpdate(
      {
        product: productId,
        enabled: true,
        $expr: { $lt: ['$stockSold', '$stockLimit'] },
      },
      { $inc: { stockSold: 1 } },
      { new: true }
    );

    return !!result; // null means stock was exhausted — reject
  } catch (err) {
    console.error('[MOTD] Stock decrement error:', err.message);
    return true; // on error, allow purchase (don't block sales)
  }
}

export default router;
