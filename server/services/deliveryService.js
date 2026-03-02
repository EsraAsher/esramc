/**
 * Delivery Service — pull-only purchase delivery tracking.
 *
 * Handles:
 *   1. Creating Purchase records from a paid Order
 *   2. Attempting RCON delivery for each pending Purchase
 *   3. Retrying all pending purchases on a schedule
 */
import Purchase from '../models/Purchase.js';
import { executeCommand, isRconConfigured } from './rcon.js';

// ─── Helpers ──────────────────────────────────────────────

/**
 * Determine purchase type from a command string.
 *   - "lp user <player> parent add <rank>"  → { type: 'rank', value: '<rank>' }
 *   - economy / money commands               → { type: 'money', value: <amount> }
 *   - Anything else defaults to 'rank' with the raw command as value
 */
function parsePurchaseType(command) {
  // LuckPerms rank command
  const lpMatch = command.match(/lp\s+user\s+\S+\s+parent\s+add\s+(\S+)/i);
  if (lpMatch) {
    return { type: 'rank', value: lpMatch[1] };
  }

  // Economy deposit: eco give / economy deposit / essentials eco give etc.
  const ecoMatch = command.match(/(?:eco(?:nomy)?|essentials:eco)\s+(?:give|deposit|add)\s+\S+\s+(\d+(?:\.\d+)?)/i);
  if (ecoMatch) {
    return { type: 'money', value: parseFloat(ecoMatch[1]) };
  }

  // Fallback — treat as rank
  return { type: 'rank', value: command };
}

// ─── Core Functions ───────────────────────────────────────

/**
 * Create Purchase documents for every command in a paid Order.
 * Each command becomes one Purchase record.
 *
 * @param {Object} order — populated Order document (must have mcUsername, items[], _id)
 * @returns {Purchase[]} — created Purchase documents
 */
export async function createPurchases(order) {
  const purchases = [];

  for (const item of order.items) {
    const commands = item.commands || [];
    for (let rawCmd of commands) {
      const cmd = rawCmd
        .replace(/\{player\}/gi, order.mcUsername)
        .replace(/\{qty\}/gi, String(item.quantity));

      const { type, value } = parsePurchaseType(cmd);

      const purchase = await Purchase.create({
        player: order.mcUsername,
        type,
        value,
        status: 'pending',
        notified: false,
        deliveryMethod: null,
        deliveredAt: null,
        orderId: order._id,
        command: cmd,
      });

      purchases.push(purchase);
    }
  }

  return purchases;
}

/**
 * Attempt RCON delivery for a single Purchase.
 *
 * Rules:
 *   - Only delivers if status === 'pending'
 *   - On success: status='delivered', deliveryMethod='rcon', deliveredAt=now
 *   - On failure: status stays 'pending' (retry later)
 *
 * @param {Purchase} purchase — Mongoose Purchase document
 * @returns {{ delivered: boolean, notified: boolean, log: string[] }}
 */
export async function attemptDelivery(purchase) {
  const log = [];

  // Guard: never deliver unless pending
  if (purchase.status !== 'pending') {
    log.push(`[Delivery] Skipped — status is "${purchase.status}", not "pending"`);
    return { delivered: false, notified: false, log };
  }

  if (!isRconConfigured()) {
    log.push('[Delivery] RCON not configured — skipping (test mode)');
    return { delivered: false, notified: false, log };
  }

  // ── Step 1: Execute RCON command ──
  const { success, response } = await executeCommand(purchase.command);
  log.push(`[RCON] ${purchase.command} → success=${success}, response=${response}`);

  if (!success) {
    log.push('[Delivery] RCON failed — keeping status as pending for retry');
    return { delivered: false, notified: false, log };
  }

  // ── Step 2: Mark as delivered ──
  purchase.status = 'delivered';
  purchase.deliveryMethod = 'rcon';
  purchase.deliveredAt = new Date();
  await purchase.save();
  log.push(`[Delivery] Purchase ${purchase._id} marked as delivered`);
  return { delivered: true, notified: false, log };
}

/**
 * Retry all pending purchases.
 * Called on a schedule (setInterval) from server/index.js.
 */
export async function retryPendingPurchases() {
  try {
    const pending = await Purchase.find({ status: 'pending' });

    if (pending.length === 0) return;

    console.log(`[Retry] Found ${pending.length} pending purchase(s) — attempting delivery…`);

    for (const purchase of pending) {
      try {
        const { delivered, log } = await attemptDelivery(purchase);
        if (delivered) {
          console.log(`[Retry] ✅ Delivered purchase ${purchase._id} for ${purchase.player}`);
        }
        // Log details at debug level
        for (const line of log) {
          console.log(`  ${line}`);
        }
      } catch (err) {
        console.error(`[Retry] Error delivering purchase ${purchase._id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Retry] Failed to query pending purchases:', err.message);
  }
}
