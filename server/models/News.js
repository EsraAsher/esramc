import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  titleColor: {
    type: String,
    trim: true,
    default: '#ffffff',
    match: /^#(?:[0-9a-fA-F]{3}){1,2}$/,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  summary: {
    type: String,
    trim: true,
    default: '',
    maxlength: 300,
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  contentType: {
    type: String,
    enum: ['html', 'json'],
    default: 'html',
  },
  author: {
    type: String,
    required: true,
    trim: true,
  },
  image: {
    type: String,
    default: '',
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

// Index for ordering and active status
newsSchema.index({ isActive: 1, order: 1, createdAt: -1 });

const News = mongoose.model('News', newsSchema);

/**
 * Get active news sorted by order and creation date
 */
export async function getActiveNews(limit = null) {
  const query = News.find({ isActive: true })
    .sort({ order: 1, createdAt: -1 });
  
  if (limit) {
    query.limit(limit);
  }
  
  return await query.exec();
}

/**
 * Get all news for admin (including inactive)
 */
export async function getAllNews() {
  return await News.find({}).sort({ order: 1, createdAt: -1 }).exec();
}

export default News;