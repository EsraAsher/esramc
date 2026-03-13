import { Router } from 'express';
import News from '../models/News.js';
import authMiddleware from '../middleware/auth.js';
import { logAction } from '../utils/auditLogger.js';
import sanitizeHtml from 'sanitize-html';

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

const sanitizeNewsContent = (rawContent) =>
  sanitizeHtml(rawContent || '', {
    allowedTags: [
      'p',
      'br',
      'h1',
      'h2',
      'h3',
      'strong',
      'b',
      'em',
      'i',
      's',
      'strike',
      'del',
      'ul',
      'ol',
      'li',
      'a',
      'span',
      'font',
      'blockquote',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      span: ['style'],
      font: ['color'],
    },
    allowedStyles: {
      span: {
        color: [/^#(?:[0-9a-fA-F]{3}){1,2}$/, /^rgb\((\s*\d+\s*,){2}\s*\d+\s*\)$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
    },
  });

const hasMeaningfulContent = (html) =>
  sanitizeHtml(html || '', { allowedTags: [], allowedAttributes: {} }).trim().length > 0;

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
  if (req.admin.role !== 'admin' && req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const { title, summary, content, image, author, isActive } = req.body;
    
    if (!title || !summary || !content || !author) {
      return res.status(400).json({ message: 'Title, summary, content, and author are required' });
    }

    const sanitizedContent = sanitizeNewsContent(content);
    if (!hasMeaningfulContent(sanitizedContent)) {
      return res.status(400).json({ message: 'Content cannot be empty after sanitization' });
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
      content: sanitizedContent,
      image: image ? image.trim() : '',
      author: author.trim(),
      isActive: Boolean(isActive),
    });

    await news.save();

    await logAction(req.admin, 'NEWS_CREATE', news.title, { newsId: news._id });

    res.status(201).json(news);
  } catch (err) {
    console.error('[News] Create error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Admin: Update News ────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  if (req.admin.role !== 'admin' && req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const { id } = req.params;
    const { title, summary, content, image, author, isActive } = req.body;

    if (!title || !summary || !content || !author) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const sanitizedContent = sanitizeNewsContent(content);
    if (!hasMeaningfulContent(sanitizedContent)) {
      return res.status(400).json({ message: 'Content cannot be empty after sanitization' });
    }

    const news = await News.findById(id);
    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    news.title = title.trim();
    // Only update slug if not set, otherwise keep it
    if (!news.slug) news.slug = generateSlug(title.trim());
    
    news.summary = summary.trim();
    news.content = sanitizedContent;
    news.image = image ? image.trim() : '';
    news.author = author.trim();
    news.isActive = Boolean(isActive);

    await news.save();

    await logAction(req.admin, 'NEWS_UPDATE', news.title, { newsId: news._id });

    res.json(news);
  } catch (err) {
    console.error('[News] Update error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Admin: Delete News ────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.admin.role !== 'admin' && req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const { id } = req.params;
    const news = await News.findByIdAndDelete(id);
    
    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    await logAction(req.admin, 'NEWS_DELETE', news.title, { newsId: id });

    res.json({ message: 'News deleted successfully' });
  } catch (err) {
    console.error('[News] Delete error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;