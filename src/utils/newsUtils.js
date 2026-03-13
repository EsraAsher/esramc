/**
 * News content rendering utilities.
 * TipTap outputs HTML directly, so new posts (contentType='html') render as-is.
 * Legacy JSON posts (contentType='json') are converted to HTML for backward compat.
 * No frontend sanitization — backend sanitizes all stored content.
 */

// ─── Legacy JSON → HTML Converter ──────────────────────────

function textNodeToHtml(node) {
  if (!node || typeof node.text !== 'string') return '';

  let html = node.text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (node.bold) html = `<strong>${html}</strong>`;
  if (node.italic) html = `<em>${html}</em>`;
  if (node.strike) html = `<del>${html}</del>`;
  if (node.color) html = `<span style="color:${node.color};">${html}</span>`;
  if (node.link) html = `<a href="${node.link}" target="_blank" rel="noopener noreferrer">${html}</a>`;

  return html;
}

function childrenToHtml(children) {
  if (!Array.isArray(children)) return '';
  return children.map(textNodeToHtml).join('');
}

export function jsonToHtml(blocks) {
  if (!Array.isArray(blocks)) return '';

  return blocks.map((block) => {
    if (!block?.type) return '';

    switch (block.type) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'p': {
        const inner = childrenToHtml(block.children);
        return `<${block.type}>${inner}</${block.type}>`;
      }
      case 'ul':
      case 'ol': {
        const items = (block.children || [])
          .filter((li) => li.type === 'li')
          .map((li) => `<li>${childrenToHtml(li.children)}</li>`)
          .join('');
        return `<${block.type}>${items}</${block.type}>`;
      }
      default:
        return '';
    }
  }).join('');
}

// ─── Main Renderer ──────────────────────────────────────────

/**
 * Get the rendered HTML for a news item.
 * - contentType 'html': return the stored HTML string directly (TipTap output or legacy)
 * - contentType 'json': convert legacy JSON blocks to HTML
 * @param {object} newsItem
 * @returns {string}
 */
export function getRenderedContent(newsItem) {
  if (!newsItem) return '';

  const { content, contentType } = newsItem;

  if (contentType === 'json') {
    // Legacy structured JSON format
    const blocks = Array.isArray(content) ? content : [];
    return jsonToHtml(blocks);
  }

  // HTML (TipTap output or legacy HTML string)
  return typeof content === 'string' ? content : '';
}
