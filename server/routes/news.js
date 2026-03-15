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

// ─── HTML Sanitizer ──────────────────────────────────────
const sanitizeNewsContent = (rawContent) =>
  sanitizeHtml(rawContent || '', {
    allowedTags: [
      'h1', 'h2', 'h3',
      'p',
      'strong',
      'em',
      'span',
      'ul', 'ol', 'li',
      'a',
      'br',
      'del',
    ],
    allowedAttributes: {
      '*': ['style'],
      a: ['href'],
    },
    allowedStyles: {
      '*': {
        color: [/^#(?:[0-9a-fA-F]{3}){1,2}$/, /^rgb\((\s*\d+\s*,){2}\s*\d+\s*\)$/],
        'font-weight': [/^(bold|normal|\d+)$/],
        'font-style': [/^(italic|normal)$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      // Convert deprecated <font color="X"> → <span style="color:X">
      font: (tagName, attribs) => {
        const style = attribs.color ? `color:${attribs.color};` : '';
        return {
          tagName: 'span',
          attribs: style ? { style } : {},
        };
      },
      b: 'strong',
      i: 'em',
      s: 'del',
      strike: 'del',
    },
  });

const hasMeaningfulContent = (html) =>
  sanitizeHtml(html || '', { allowedTags: [], allowedAttributes: {} }).trim().length > 0;

const deriveSummaryFromHtml = (html, maxLength = 300) => {
  const text = sanitizeHtml(html || '', { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
};

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

const normalizeTitleColor = (value) => {
  if (typeof value !== 'string') return '#ffffff';
  const normalized = value.trim();
  return HEX_COLOR_REGEX.test(normalized) ? normalized.toLowerCase() : '#ffffff';
};

const normalizeTitleSize = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 34;
  return Math.min(72, Math.max(16, parsed));
};

// ─── JSON Content Helpers ────────────────────────────────
const ALLOWED_BLOCK_TYPES = new Set(['h1', 'h2', 'h3', 'p', 'ul', 'ol']);

/**
 * Validate structured JSON content blocks.
 * Returns true if the structure is valid.
 */
const validateJsonContent = (blocks) => {
  if (!Array.isArray(blocks)) return false;
  if (blocks.length === 0) return false;

  for (const block of blocks) {
    if (!block || typeof block !== 'object') return false;
    if (!block.type || !ALLOWED_BLOCK_TYPES.has(block.type)) return false;
    if (!Array.isArray(block.children) || block.children.length === 0) return false;

    // For list types, children are list items
    if (block.type === 'ul' || block.type === 'ol') {
      for (const li of block.children) {
        if (!li || li.type !== 'li') return false;
        if (!Array.isArray(li.children) || li.children.length === 0) return false;
        for (const node of li.children) {
          if (!node || typeof node.text !== 'string') return false;
        }
      }
    } else {
      for (const node of block.children) {
        if (!node || typeof node.text !== 'string') return false;
      }
    }
  }
  return true;
};

/**
 * Derive a plain-text summary from structured JSON content.
 */
const deriveSummaryFromJson = (blocks, maxLength = 300) => {
  const parts = [];

  const extractText = (children) => {
    for (const node of children) {
      if (typeof node.text === 'string') {
        parts.push(node.text);
      }
      if (Array.isArray(node.children)) {
        extractText(node.children);
      }
    }
  };

  for (const block of blocks) {
    if (Array.isArray(block.children)) {
      extractText(block.children);
    }
  }

  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
};

/**
 * Check if JSON content has any meaningful text.
 */
const jsonHasMeaningfulContent = (blocks) => {
  if (!Array.isArray(blocks)) return false;
  return deriveSummaryFromJson(blocks, 10).length > 0;
};

// ─── Public: Get Active News (Latest) ─────────────────
router.get('/', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 0; // 0 = all
    const query = News.find({ isActive: true })
      .select('title titleColor titleSize slug summary content contentType image author createdAt isActive')
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
    const { title, titleColor, titleSize, content, contentType, image, author, isActive } = req.body;
    
    if (!title || !content || !author) {
      return res.status(400).json({ message: 'Title, content, and author are required' });
    }

    let finalContent;
    let finalContentType;
    let summary;

    if (contentType === 'json') {
      // Structured JSON content
      const blocks = typeof content === 'string' ? JSON.parse(content) : content;
      if (!validateJsonContent(blocks)) {
        return res.status(400).json({ message: 'Invalid content structure' });
      }
      if (!jsonHasMeaningfulContent(blocks)) {
        return res.status(400).json({ message: 'Content cannot be empty' });
      }
      finalContent = blocks;
      finalContentType = 'json';
      summary = deriveSummaryFromJson(blocks, 300);
    } else {
      // Legacy HTML content
      const sanitizedContent = sanitizeNewsContent(content);
      if (!hasMeaningfulContent(sanitizedContent)) {
        return res.status(400).json({ message: 'Content cannot be empty after sanitization' });
      }
      finalContent = sanitizedContent;
      finalContentType = 'html';
      summary = deriveSummaryFromHtml(sanitizedContent, 300);
    }

    let slug = generateSlug(title);
    
    // Check for duplicate slug
    let existingSlug = await News.findOne({ slug });
    if (existingSlug) {
        slug = `${slug}-${Date.now()}`;
    }

    const news = new News({
      title: title.trim(),
      titleColor: normalizeTitleColor(titleColor),
      titleSize: normalizeTitleSize(titleSize),
      slug,
      summary,
      content: finalContent,
      contentType: finalContentType,
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
    const { title, titleColor, titleSize, content, contentType, image, author, isActive } = req.body;

    if (!title || !content || !author) {
      return res.status(400).json({ message: 'Title, content, and author are required' });
    }

    let finalContent;
    let finalContentType;
    let summary;

    if (contentType === 'json') {
      const blocks = typeof content === 'string' ? JSON.parse(content) : content;
      if (!validateJsonContent(blocks)) {
        return res.status(400).json({ message: 'Invalid content structure' });
      }
      if (!jsonHasMeaningfulContent(blocks)) {
        return res.status(400).json({ message: 'Content cannot be empty' });
      }
      finalContent = blocks;
      finalContentType = 'json';
      summary = deriveSummaryFromJson(blocks, 300);
    } else {
      const sanitizedContent = sanitizeNewsContent(content);
      if (!hasMeaningfulContent(sanitizedContent)) {
        return res.status(400).json({ message: 'Content cannot be empty after sanitization' });
      }
      finalContent = sanitizedContent;
      finalContentType = 'html';
      summary = deriveSummaryFromHtml(sanitizedContent, 300);
    }

    const news = await News.findById(id);
    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    news.title = title.trim();
    news.titleColor = normalizeTitleColor(titleColor);
    news.titleSize = normalizeTitleSize(titleSize);
    // Only update slug if not set, otherwise keep it
    if (!news.slug) news.slug = generateSlug(title.trim());
    
    news.summary = summary;
    news.content = finalContent;
    news.contentType = finalContentType;
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