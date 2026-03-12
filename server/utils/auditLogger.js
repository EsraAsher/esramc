/**
 * Audit Logger — fire-and-forget write-only helper.
 *
 * Usage:
 *   logAction(req.admin, 'PRODUCT_UPDATED', product.title, { price: { before: 99, after: 149 } }, req.ip);
 *
 * - Never throws — a log failure must never break a request.
 * - Async but never awaited by callers (fire-and-forget).
 * - Logs are write-only: no update, no delete endpoints exist.
 */
import AuditLog from '../models/AuditLog.js';

/**
 * @param {object|null} admin   - req.admin (may be null for system actions)
 * @param {string}      action  - Action identifier, e.g. 'PRODUCT_UPDATED'
 * @param {string}      target  - Human-readable label of the affected resource
 * @param {object}      details - Optional extra context { before, after, id, ... }
 * @param {string|null} ip      - Request IP (req.ip), optional
 */
export async function logAction(admin, action, target = '', details = {}, ip = null) {
  try {
    await AuditLog.create({
      adminId: admin?._id || null,
      displayName: admin?.displayName || admin?.discordId || admin?.username || 'system',
      action,
      target: String(target).slice(0, 300), // cap length
      details,
      ip: ip || null,
    });
  } catch (err) {
    // Log to console but never propagate — audit log failure is non-fatal
    console.error('[AuditLog] Write failed:', err.message);
  }
}

export async function auditLogger(action, actor, details = {}, ip = null) {
  const target = details?.title || details?.target || '';
  const normalizedAdmin = actor && typeof actor === 'object'
    ? actor
    : { username: actor, discordId: actor, displayName: actor };

  await logAction(normalizedAdmin, action, target, details, ip);
}
