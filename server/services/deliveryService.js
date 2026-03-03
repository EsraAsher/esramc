/**
 * Delivery Service � plugin-owned delivery.
 *
 * The backend is responsible for:
 *   1. Creating Purchase records from a paid Order (status = 'pending')
 *
 * The plugin is responsible for:
 *   2. Polling GET /api/purchases/unnotified to fetch pending purchases
 *   3. Executing delivery in-game
 *   4. Calling POST /api/purchases/mark-delivered or mark-failed
 */
import Purchase from '../models/Purchase.js';

// --- Helpers ----------------------------------------------

/**
 * Determine purchase type from a command string.
 *   - "lp user <player> parent add <rank>"  ? { type: 'rank', value: '<rank>' }
 *   - economy / money commands               ? { type: 'money', value: <amount> }
 *   - Anything else defaults to 'rank' with the raw command as value
 */
function parsePurchaseType(command) {
  const lpMatch = command.match(/lp\s+user\s+\S+\s+parent\s+add\s+(\S+)/i);
  if (lpMatch) {
    return { type: 'rank', value: lpMatch[1] };
  }

  const ecoMatch = command.match(/(?:eco(?:nomy)?|essentials:eco)\s+(?:give|deposit|add)\s+\S+\s+(\d+(?:\.\d+)?)/i);
  if (ecoMatch) {
    return { type: 'money', value: parseFloat(ecoMatch[1]) };
  }

  return { type: 'rank', value: command };
}

// --- Core Functions ---------------------------------------

/**
 * Create Purchase documents (status='pending') for every command in a paid Order.
 * The plugin will poll and deliver these in-game.
 *
 * @param {Object} order � populated Order document (must have mcUsername, items[], _id)
 * @returns {Purchase[]} � created Purchase documents
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
        orderId: order._id,
        command: cmd,
      });

      purchases.push(purchase);
    }
  }

  return purchases;
}
