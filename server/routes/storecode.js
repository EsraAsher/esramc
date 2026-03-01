import { Router } from 'express';
import StoreCode from '../models/StoreCode.js';
import { safeCompare, validateHmacRequest } from '../middleware/hmacAuth.js';

const router = Router();

function isPluginAuthorized(req, serverSecret) {
  const hmac = validateHmacRequest(req, serverSecret);
  if (hmac.present) return hmac.ok;

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

  const token = authHeader.split(' ')[1];
  return safeCompare(token, serverSecret);
}

// POST /api/storecode/generate
// Called by Minecraft plugin only
router.post('/generate', async (req, res) => {
  try {
    const serverSecret = process.env.SERVER_SECRET;

    if (!serverSecret) {
      return res.status(500).json({ success: false });
    }

    if (!isPluginAuthorized(req, serverSecret)) {
      return res.status(401).json({ success: false });
    }

    const { username, code } = req.body;

    if (!username || !code) {
      return res.status(400).json({ success: false });
    }

    await StoreCode.deleteMany({ username, used: false });

    await StoreCode.create({
      username,
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      used: false,
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false });
  }
});

// POST /api/storecode/verify
// Called by website before payment
router.post('/verify', async (req, res) => {
  try {
    const { username, code } = req.body;

    if (!username || !code) {
      return res.json({ success: false });
    }

    const found = await StoreCode.findOne({
      username,
      code,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!found) {
      return res.json({ success: false });
    }

    // Only validate — do NOT mark as used here.
    // Code is consumed only when /create-order begins payment.
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false });
  }
});

export default router;
