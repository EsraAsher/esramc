import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema({
  player: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['rank', 'money'],
    required: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed, // String for rank name, Number for money amount
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'failed'],
    default: 'pending',
  },
  notified: {
    type: Boolean,
    default: false,
  },
  deliveryMethod: {
    type: String,
    enum: ['rcon', null],
    default: null,
  },
  deliveredAt: {
    type: Date,
    default: null,
  },

  // ─── Internal references ──────────────────
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  command: {
    type: String,
    required: true,
  },
}, { timestamps: true });

// Index for retry queries
purchaseSchema.index({ status: 1 });
purchaseSchema.index({ player: 1, notified: 1 });

export default mongoose.model('Purchase', purchaseSchema);
