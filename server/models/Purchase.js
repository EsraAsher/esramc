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
  deliveredAt: {
    type: Date,
    default: null,
  },
  deliveryAttempts: {
    type: Number,
    default: 0,
  },
  lastError: {
    type: String,
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

// Indexes
purchaseSchema.index({ status: 1 });
purchaseSchema.index({ player: 1, status: 1 });

export default mongoose.model('Purchase', purchaseSchema);
