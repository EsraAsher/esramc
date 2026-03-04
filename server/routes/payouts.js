import { Router } from 'express';
import ReferralPartner from '../models/ReferralPartner.js';
import ReferralApplication from '../models/ReferralApplication.js';
import Payout from '../models/Payout.js';
import PayoutRequest from '../models/PayoutRequest.js';
import { getSettings } from '../models/Settings.js';
import authMiddleware from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';
import { sendMail, payoutProcessedHTML, payoutRejectedHTML } from '../utils/mailer.js';
import { sendDiscordEvent } from '../utils/discord.js';
import { logAction } from '../utils/auditLogger.js';

const router = Router();
const requireSuperadmin = requireRole('superadmin');

function getAdminActorName(admin) {
  return admin?.displayName || admin?.discordId || admin?.username || 'admin';
}

// ═══════════════════════════════════════════════════════════
// ADMIN — List creators eligible for payout (dynamic threshold)
// GET /api/payouts/eligible
// ═══════════════════════════════════════════════════════════
router.get('/eligible', authMiddleware, async (req, res) => {
  try {
    const settings = await getSettings();
    const threshold = settings.globalPayoutThreshold;

    const partners = await ReferralPartner.find({
      pendingCommission: { $gte: threshold },
      status: { $in: ['active', 'paused'] },
    })
      .sort({ pendingCommission: -1 })
      .select('creatorName discordId referralCode pendingCommission totalPaidOut totalCommissionEarned totalUses totalRevenueGenerated payoutThreshold status');

    res.json(partners);
  } catch (err) {
    console.error('[Payouts] Eligible error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN — Get payout history (all or for a specific partner)
// GET /api/payouts/history?partnerId=xxx
// ═══════════════════════════════════════════════════════════
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const filter = {};
    if (req.query.partnerId) filter.partnerId = req.query.partnerId;

    const payouts = await Payout.find(filter)
      .sort({ createdAt: -1 })
      .populate('processedBy', 'username displayName discordId')
      .limit(200);

    res.json(payouts);
  } catch (err) {
    console.error('[Payouts] History error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN — Process a payout
// POST /api/payouts/process
// Body: { partnerId, amount, note? }
// ═══════════════════════════════════════════════════════════
router.post('/process', authMiddleware, requireSuperadmin, async (req, res) => {
  try {
    const { partnerId, amount, note } = req.body;

    // ── Validation ──────────────────────────────────────────
    if (!partnerId || !amount) {
      return res.status(400).json({ message: 'partnerId and amount are required.' });
    }

    const payoutAmount = Number(amount);
    if (!Number.isFinite(payoutAmount) || payoutAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number.' });
    }

    // ── Find partner ────────────────────────────────────────
    const partner = await ReferralPartner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: 'Referral partner not found.' });
    }

    if (partner.status === 'banned') {
      return res.status(400).json({ message: 'Cannot process payout for a banned partner.' });
    }

    // ── Prevent over-paying ─────────────────────────────────
    if (payoutAmount > partner.pendingCommission) {
      return res.status(400).json({
        message: `Payout amount (₹${payoutAmount}) exceeds pending commission (₹${partner.pendingCommission}).`,
      });
    }

    // ── Atomic update on partner ────────────────────────────
    const updated = await ReferralPartner.findOneAndUpdate(
      {
        _id: partnerId,
        pendingCommission: { $gte: payoutAmount },       // double-check concurrency
      },
      {
        $inc: {
          pendingCommission: -payoutAmount,
          totalPaidOut: payoutAmount,
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(409).json({ message: 'Payout failed — pending commission changed. Please refresh and retry.' });
    }

    // ── Create payout record ────────────────────────────────
    const payout = await Payout.create({
      partnerId: partner._id,
      amount: payoutAmount,
      creatorName: partner.creatorName,
      referralCode: partner.referralCode,
      processedBy: req.admin._id,
      note: note?.trim() || '',
    });

    // ── Notifications (fire-and-forget) ─────────────────────
    // Fetch creator email from linked application
    let creatorEmail = null;
    if (partner.applicationId) {
      const app = await ReferralApplication.findById(partner.applicationId).select('email');
      creatorEmail = app?.email;
    }

    if (creatorEmail) {
      sendMail({
        to: creatorEmail,
        subject: '💸 Payout Processed — Redline SMP',
        html: payoutProcessedHTML({
          creatorName: partner.creatorName,
          amount: payoutAmount,
          referralCode: partner.referralCode,
          remainingBalance: updated.pendingCommission,
          totalPaidOut: updated.totalPaidOut,
        }),
      }).catch(() => {});
    }

    sendDiscordEvent('payout_processed', {
      creatorName: partner.creatorName,
      referralCode: partner.referralCode,
      amount: payoutAmount,
      remainingBalance: updated.pendingCommission,
      processedBy: getAdminActorName(req.admin),
    }).catch(() => {});

    res.json({
      message: `Payout of ₹${payoutAmount} processed for ${partner.creatorName}.`,
      payout,
      partner: {
        pendingCommission: updated.pendingCommission,
        totalPaidOut: updated.totalPaidOut,
      },
    });
    logAction(req.admin, 'PAYOUT_PROCESSED', partner.creatorName, { amount: payoutAmount, referralCode: partner.referralCode }, req.ip).catch(() => {});
  } catch (err) {
    console.error('[Payouts] Process error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN — List payout requests
// GET /api/payouts/requests?status=pending,processing
// ═══════════════════════════════════════════════════════════
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    const statusFilter = req.query.status
      ? req.query.status.split(',').map((s) => s.trim())
      : ['pending', 'processing'];

    const requests = await PayoutRequest.find({ status: { $in: statusFilter } })
      .sort({ requestedAt: -1 })
      .limit(300);

    res.json(requests);
  } catch (err) {
    console.error('[Payouts] List requests error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN — Mark payout request as "processing"
// PATCH /api/payouts/requests/:id/processing
// ═══════════════════════════════════════════════════════════
router.patch('/requests/:id/processing', authMiddleware, requireSuperadmin, async (req, res) => {
  try {
    const pr = await PayoutRequest.findById(req.params.id);
    if (!pr) return res.status(404).json({ message: 'Payout request not found.' });
    if (pr.status !== 'pending') {
      return res.status(400).json({ message: `Cannot process — request is already "${pr.status}".` });
    }

    pr.status = 'processing';
    pr.processedBy = req.admin._id;
    await pr.save();

    res.json({ message: 'Payout request marked as processing.', request: pr });
    logAction(req.admin, 'PAYOUT_REQUEST_PROCESSING', pr.creatorName, { amount: pr.amount, requestId: pr._id }, req.ip).catch(() => {});
  } catch (err) {
    console.error('[Payouts] Mark processing error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN — Complete a payout request
// PATCH /api/payouts/requests/:id/complete
// Body: { transactionId }
// ═══════════════════════════════════════════════════════════
router.patch('/requests/:id/complete', authMiddleware, requireSuperadmin, async (req, res) => {
  try {
    const { transactionId } = req.body;
    if (!transactionId?.trim()) {
      return res.status(400).json({ message: 'Transaction ID is required to complete a payout.' });
    }

    const pr = await PayoutRequest.findById(req.params.id);
    if (!pr) return res.status(404).json({ message: 'Payout request not found.' });
    if (pr.status !== 'pending' && pr.status !== 'processing') {
      return res.status(400).json({ message: `Cannot complete — request is already "${pr.status}".` });
    }

    // Verify partner still exists and has enough pending commission
    const partner = await ReferralPartner.findById(pr.partnerId);
    if (!partner) return res.status(404).json({ message: 'Referral partner not found.' });

    if (pr.amount > partner.pendingCommission) {
      return res.status(400).json({
        message: `Payout amount (₹${pr.amount}) exceeds current pending commission (₹${partner.pendingCommission}).`,
      });
    }

    // Atomic update on partner
    const updated = await ReferralPartner.findOneAndUpdate(
      { _id: pr.partnerId, pendingCommission: { $gte: pr.amount } },
      { $inc: { pendingCommission: -pr.amount, totalPaidOut: pr.amount } },
      { new: true }
    );

    if (!updated) {
      return res.status(409).json({ message: 'Payout failed — pending commission changed. Please refresh and retry.' });
    }

    // Update payout request
    pr.status = 'completed';
    pr.transactionId = transactionId.trim();
    pr.processedBy = req.admin._id;
    pr.processedAt = new Date();
    await pr.save();

    // Create payout record (for history)
    await Payout.create({
      partnerId: partner._id,
      amount: pr.amount,
      creatorName: pr.creatorName,
      referralCode: pr.referralCode,
      processedBy: req.admin._id,
      note: `Payout request #${pr._id} — ${pr.method.toUpperCase()} — Txn: ${transactionId.trim()}`,
    });

    // Notifications (fire-and-forget)
    let creatorEmail = null;
    if (partner.applicationId) {
      const app = await ReferralApplication.findById(partner.applicationId).select('email');
      creatorEmail = app?.email;
    }

    if (creatorEmail) {
      sendMail({
        to: creatorEmail,
        subject: '💸 Payout Processed — Redline SMP',
        html: payoutProcessedHTML({
          creatorName: partner.creatorName,
          amount: pr.amount,
          referralCode: partner.referralCode,
          remainingBalance: updated.pendingCommission,
          totalPaidOut: updated.totalPaidOut,
        }),
      }).catch(() => {});
    }

    sendDiscordEvent('payout_processed', {
      creatorName: partner.creatorName,
      referralCode: partner.referralCode,
      amount: pr.amount,
      remainingBalance: updated.pendingCommission,
      processedBy: getAdminActorName(req.admin),
    }).catch(() => {});

    res.json({
      message: `Payout of ₹${pr.amount} completed for ${pr.creatorName}.`,
      request: pr,
      partner: { pendingCommission: updated.pendingCommission, totalPaidOut: updated.totalPaidOut },
    });
    logAction(req.admin, 'PAYOUT_REQUEST_COMPLETED', pr.creatorName, { amount: pr.amount, transactionId, requestId: pr._id }, req.ip).catch(() => {});
  } catch (err) {
    console.error('[Payouts] Complete request error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN — Reject a payout request
// PATCH /api/payouts/requests/:id/reject
// Body: { reason? }
// ═══════════════════════════════════════════════════════════
router.patch('/requests/:id/reject', authMiddleware, requireSuperadmin, async (req, res) => {
  try {
    const pr = await PayoutRequest.findById(req.params.id);
    if (!pr) return res.status(404).json({ message: 'Payout request not found.' });
    if (pr.status === 'completed' || pr.status === 'rejected') {
      return res.status(400).json({ message: `Cannot reject — request is already "${pr.status}".` });
    }

    pr.status = 'rejected';
    pr.rejectionReason = req.body.reason?.trim() || '';
    pr.processedBy = req.admin._id;
    pr.processedAt = new Date();
    await pr.save();

    // Send rejection email
    const partner = await ReferralPartner.findById(pr.partnerId);
    if (partner?.applicationId) {
      const app = await ReferralApplication.findById(partner.applicationId).select('email');
      if (app?.email) {
        sendMail({
          to: app.email,
          subject: '❌ Payout Request Rejected — Redline SMP',
          html: payoutRejectedHTML({
            creatorName: pr.creatorName,
            amount: pr.amount,
            reason: pr.rejectionReason || 'No reason provided.',
          }),
        }).catch(() => {});
      }
    }

    sendDiscordEvent('payout_rejected', {
      creatorName: pr.creatorName,
      referralCode: pr.referralCode,
      amount: pr.amount,
      reason: pr.rejectionReason || 'No reason provided.',
      rejectedBy: getAdminActorName(req.admin),
    }).catch(() => {});

    res.json({ message: `Payout request rejected.`, request: pr });
    logAction(req.admin, 'PAYOUT_REQUEST_REJECTED', pr.creatorName, { amount: pr.amount, reason: pr.rejectionReason, requestId: pr._id }, req.ip).catch(() => {});
  } catch (err) {
    console.error('[Payouts] Reject request error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
