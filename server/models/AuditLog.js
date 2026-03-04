import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  // Who performed the action
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
  },
  displayName: {
    type: String,
    default: 'unknown',
    trim: true,
  },

  // What was done
  action: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },

  // What it was done to (human-readable label)
  target: {
    type: String,
    default: '',
    trim: true,
  },

  // Extra context (before/after values, IDs, etc.)
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // Where from
  ip: {
    type: String,
    default: null,
    trim: true,
  },
}, {
  timestamps: { createdAt: true, updatedAt: false }, // only createdAt — logs are immutable
});

// ─── Indexes ─────────────────────────────────────────────
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ adminId: 1 });
auditLogSchema.index({ createdAt: -1 });

// Auto-expire logs after 365 days (configurable via TTL index)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// ─── Never allow update — logs are write-once ─────────────
auditLogSchema.set('strict', true);

export default mongoose.model('AuditLog', auditLogSchema);
