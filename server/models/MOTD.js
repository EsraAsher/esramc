import mongoose from 'mongoose';

const motdSchema = new mongoose.Schema({
  // ─── Display ──────────────────────────────
  enabled: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Limited Time Deal',
    trim: true,
  },
  badgeText: {
    type: String,
    default: 'Flash Sale',
    trim: true,
  },
  bgColor: {
    type: String,
    default: '#1a0000',
  },
  accentColor: {
    type: String,
    default: '#dc2626',
  },

  // ─── Product Reference ────────────────────
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null,
  },

  // ─── Schedule ─────────────────────────────
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },

  // ─── Stock ────────────────────────────────
  stockLimit: {
    type: Number,
    default: 0, // 0 = unlimited
    min: 0,
  },
  stockSold: {
    type: Number,
    default: 0,
    min: 0,
  },

  // ─── Media ────────────────────────────────
  mediaType: {
    type: String,
    enum: ['image', 'video', 'none'],
    default: 'none',
  },
  mediaUrl: {
    type: String,
    default: '',
  },

  // ─── Expiry Behavior ─────────────────────
  expiryBehavior: {
    type: String,
    enum: ['auto-hide', 'show-expired'],
    default: 'auto-hide',
  },
}, { timestamps: true });

export default mongoose.model('MOTD', motdSchema);
