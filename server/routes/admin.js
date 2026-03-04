import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import AuditLog from '../models/AuditLog.js';
import authMiddleware from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';
import { logAction } from '../utils/auditLogger.js';

const router = Router();

const requireSuperadmin = requireRole('superadmin');

function getAdminActorName(admin) {
  return admin?.displayName || admin?.discordId || admin?.username || 'admin';
}

async function setupAccessMiddleware(req, res, next) {
  const { setupKey } = req.body || {};

  if (setupKey !== undefined) {
    if (setupKey !== process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({ message: 'Invalid setup key' });
    }

    const discordAdminCount = await Admin.countDocuments({
      discordId: { $exists: true, $ne: '' },
    });
    if (discordAdminCount > 0) {
      return res.status(403).json({ message: 'Setup key bootstrap is disabled after initial admin creation.' });
    }

    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ message: 'Invalid setup key' });
  }

  return authMiddleware(req, res, () => requireSuperadmin(req, res, next));
}

function getAdminDiscordConfig() {
  const clientId = process.env.DISCORD_ADMIN_CLIENT_ID || process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_ADMIN_CLIENT_SECRET || process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_ADMIN_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Admin Discord OAuth env vars not configured (DISCORD_ADMIN_CLIENT_ID/SECRET and DISCORD_ADMIN_REDIRECT_URI)');
  }

  return { clientId, clientSecret, redirectUri };
}

function parseAdminAllowlist() {
  return (process.env.DISCORD_ADMIN_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

// POST /api/admin/login
router.post('/login', async (req, res) => {
  return res.status(403).json({ message: 'Password login is disabled. Use Discord login.' });
});

// GET /api/admin/auth/discord - redirect to Discord OAuth
router.get('/auth/discord', async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    const { clientId, redirectUri } = getAdminDiscordConfig();
    const state = jwt.sign(
      { type: 'admin_oauth', ts: Date.now() },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify',
      state,
    });

    res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
  } catch (err) {
    console.error('[Admin Auth] Discord redirect error:', err.message);
    res.redirect(`${frontendUrl}/admin/callback?error=oauth_not_configured`);
  }
});

// GET /api/admin/auth/discord/callback - complete OAuth and issue admin JWT
router.get('/auth/discord/callback', async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect(`${frontendUrl}/admin/callback?error=missing_code_or_state`);
    }

    try {
      const decoded = jwt.verify(state, process.env.JWT_SECRET);
      if (!decoded || decoded.type !== 'admin_oauth') {
        return res.redirect(`${frontendUrl}/admin/callback?error=invalid_state`);
      }
    } catch {
      return res.redirect(`${frontendUrl}/admin/callback?error=invalid_state`);
    }

    const { clientId, clientSecret, redirectUri } = getAdminDiscordConfig();

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      console.error('[Admin Auth] Token exchange failed:', await tokenRes.text());
      return res.redirect(`${frontendUrl}/admin/callback?error=token_failed`);
    }

    const tokenData = await tokenRes.json();

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      console.error('[Admin Auth] User fetch failed:', await userRes.text());
      return res.redirect(`${frontendUrl}/admin/callback?error=user_failed`);
    }

    const discordUser = await userRes.json();
    const allowlist = parseAdminAllowlist();

    if (!allowlist.includes(discordUser.id)) {
      return res.redirect(`${frontendUrl}/admin/callback?error=not_allowlisted`);
    }

    const admin = await Admin.findOne({ discordId: discordUser.id });
    if (!admin) {
      return res.redirect(`${frontendUrl}/admin/callback?error=not_registered`);
    }

    const nextDisplayName = discordUser.global_name || discordUser.username || '';
    if (nextDisplayName && admin.displayName !== nextDisplayName) {
      admin.displayName = nextDisplayName;
      await admin.save();
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.redirect(`${frontendUrl}/admin/callback?token=${token}`);
  } catch (err) {
    console.error('[Admin Auth] Callback error:', err);
    return res.redirect(`${frontendUrl}/admin/callback?error=server_error`);
  }
});

// GET /api/admin/me - verify token
router.get('/me', authMiddleware, async (req, res) => {
  res.json({ admin: req.admin });
});

// POST /api/admin/setup - initial admin creation (requires setup key)
router.post('/setup', setupAccessMiddleware, async (req, res) => {
  try {
    const { discordId, displayName, role } = req.body;

    if (!discordId?.trim()) {
      return res.status(400).json({ message: 'discordId is required' });
    }

    const normalizedRole = role === 'superadmin' ? 'superadmin' : 'admin';

    const existingAdmin = await Admin.findOne({ discordId: discordId.trim() });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const admin = await Admin.create({
      discordId: discordId.trim(),
      displayName: displayName?.trim() || `admin-${discordId.trim().slice(-6)}`,
      role: normalizedRole,
    });

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      admin: {
        id: admin._id,
        discordId: admin.discordId,
        displayName: admin.displayName,
        role: admin.role,
      },
    });
    logAction(req.admin || admin, 'ADMIN_CREATED', discordId.trim(), { role: normalizedRole, displayName: admin.displayName }, req.ip).catch(() => {});
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/audit-logs — superadmin only, read-only, paginated
router.get('/audit-logs', authMiddleware, requireSuperadmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, action, adminId } = req.query;
    const filter = {};
    if (action) filter.action = new RegExp(action, 'i');
    if (adminId) filter.adminId = adminId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const clampedLimit = Math.min(parseInt(limit) || 50, 200);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(clampedLimit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / clampedLimit),
    });
  } catch (err) {
    console.error('[AuditLog] Fetch error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
