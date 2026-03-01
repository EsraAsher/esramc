import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  // Legacy field kept optional for backward compatibility with existing data
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    default: undefined,
  },
  discordId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  displayName: {
    type: String,
    trim: true,
    default: '',
  },
  role: {
    type: String,
    enum: ['admin', 'superadmin'],
    default: 'admin',
  },
}, { timestamps: true });

// Remove password from JSON output
adminSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('Admin', adminSchema);
