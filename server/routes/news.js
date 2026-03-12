import { Router } from 'express';
import News from '../models/News.js';
import authMiddleware from '../middleware/auth.js';
import { logAction } from '../utils/auditLogger.js';

const router = Router();

// Helper to generate slug
const generateSlug = (title) => {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// ─── Public: Get Active News (Latest) ─────────────────
router.get('/', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 0; // 0 = all
    const query = News.find({ isActive: true })
      .select('title slug summary image author createdAt isActive') // Select fields
      .sort({ createdAt: -1 });

    if (limit > 0) {
      query.limit(limit);
    }

    const news = await query.exec();
    res.json(news);
  } catch (err) {
    console.error('[News] Public fetch error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Public: Get Single News by Slug ──────────────────
router.get('/post/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const news = await News.findOne({ slug, isActive: true });
    
    if (!news) {
      return res.status(404).json({ message: 'News post not found' });
    }
    
    res.json(news);
  } catch (err) {
    console.error('[News] Single fetch error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Admin: Get All News ───────────────────────────
router.get('/admin/all', authMiddleware, async (req, res) => {
  try {
    const news = await News.find({})
      .sort({ createdAt: -1 })
      .exec();
    res.json(news);
  } catch (err) {
    console.error('[News] Admin fetch error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Admin: Create News ────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const { title, summary, content, image, author, isActive } = req.body;
    
    if (!title || !summary || !content || !author) {
      return res.status(400).json({ message: 'Title, summary, content, and author are required' });
    }

    let slug = generateSlug(title);
    
    // Check for duplicate slug
    let existingSlug = await News.findOne({ slug });
    if (existingSlug) {
        slug = `${slug}-${Date.now()}`;
    }

    const news = new News({
      title: title.trim(),
      slug,
      summary: summary.trim(),
      content: content.trim(), 
      image: image ? image.trim() : '',
      author: author.trim(),
      isActive: Boolean(isActive),
    });

    await news.save();

    await logAction(req.user, 'NEWS_CREATE', news.title, { newsId: news._id });

    res.status(201).json(news);
  } catch (err) {
    console.error('[News] Create error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Admin: Update News ────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const { id } = req.params;
    const { title, summary, content, image, author, isActive } = req.body;

    if (!title || !summary || !content || !author) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const news = await News.findById(id);
    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    news.title = title.trim();
    // Only update slug if not set, otherwise keep it
    if (!news.slug) news.slug = generateSlug(title.trim());
    
    news.summary = summary.trim();
    news.content = content.trim();
    news.image = image ? image.trim() : '';
    news.author = author.trim();
    news.isActive = Boolean(isActive);

    await news.save();

    await logAction(req.user, 'NEWS_UPDATE', news.title, { newsId: news._id });

    res.json(news);
  } catch (err) {
    console.error('[News] Update error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Admin: Delete News ────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const { id } = req.params;
    const news = await News.findByIdAndDelete(id);
    
    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    await logAction(req.user, 'NEWS_DELETE', news.title, { newsId: id });

    res.json({ message: 'News deleted successfully' });
  } catch (err) {
    console.error('[News] Delete error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;