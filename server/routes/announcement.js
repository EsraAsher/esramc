/**
 * Announcement Bar Routes
 *
 * Public:
 *   GET  /api/announcement          — get active announcement for storefront
 *
 * Admin:
 *   GET  /api/announcement/admin    — get full config
 *   PUT  /api/announcement/admin    — update config
 */
import { Router } from 'express';
import Announcement, { getAnnouncement } from '../models/Announcement.js';
import authMiddleware from '../middleware/auth.js';

const router = Router();

// ─── Public: Get Active Announcement ──────────────────────
router.get('/', async (req, res) => {
  try {
    const doc = await getAnnouncement();

    if (!doc.enabled || !doc.text) {
      return res.json({ active: false });
    }

    res.json({
      active: true,
      text: doc.text,
      link: doc.link || null,
      bgColor: doc.bgColor,
      textColor: doc.textColor,
      scrolling: doc.scrolling,
    });
  } catch (err) {
    console.error('[Announcement] Public fetch error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Admin: Get Config ────────────────────────────────────
router.get('/admin', authMiddleware, async (req, res) => {
  try {
    const doc = await getAnnouncement();
    res.json(doc);
  } catch (err) {
    console.error('[Announcement] Admin fetch error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Admin: Update Config ─────────────────────────────────
router.put('/admin', authMiddleware, async (req, res) => {
  try {
    const { enabled, text, link, bgColor, textColor, scrolling } = req.body;
    const updates = {};

    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (typeof text === 'string') updates.text = text.slice(0, 500);
    if (typeof link === 'string') updates.link = link.slice(0, 500);
    if (typeof bgColor === 'string') updates.bgColor = bgColor;
    if (typeof textColor === 'string') updates.textColor = textColor;
    if (typeof scrolling === 'boolean') updates.scrolling = scrolling;

    const doc = await Announcement.findOneAndUpdate(
      {},
      { $set: updates },
      { new: true, upsert: true },
    );

    res.json(doc);
  } catch (err) {
    console.error('[Announcement] Update error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
