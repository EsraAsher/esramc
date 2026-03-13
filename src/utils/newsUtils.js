/**
 * News content utilities.
 * Converts structured JSON content to HTML and provides rendering helpers.
 * NO frontend sanitization — backend already sanitizes all content.
 */

// ─── JSON → HTML Converter ──────────────────────────────

/**
 * Convert a text node (with formatting properties) to an HTML string.
 */
function textNodeToHtml(node) {
  if (!node || typeof node.text !== 'string') return '';

  let html = node.text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Apply inline formatting
  if (node.bold) html = `<strong>${html}</strong>`;
  if (node.italic) html = `<em>${html}</em>`;
  if (node.strike) html = `<del>${html}</del>`;

  // Apply color via inline style on span
  if (node.color) {
    html = `<span style="color:${node.color};">${html}</span>`;
  }

  // Wrap in link
  if (node.link) {
    html = `<a href="${node.link}" target="_blank" rel="noopener noreferrer">${html}</a>`;
  }

  return html;
}

/**
 * Convert an array of child nodes to HTML.
 */
function childrenToHtml(children) {
  if (!Array.isArray(children)) return '';
  return children.map(textNodeToHtml).join('');
}

/**
 * Convert structured JSON blocks to an HTML string.
 * @param {Array} blocks - array of block objects
 * @returns {string} HTML string
 */
export function jsonToHtml(blocks) {
  if (!Array.isArray(blocks)) return '';

  return blocks.map((block) => {
    if (!block || !block.type) return '';

    switch (block.type) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'p': {
        const inner = childrenToHtml(block.children);
        // Check if any child has a color — apply to the block tag
        const blockColor = block.children?.find((c) => c.color)?.color;
        const style = blockColor ? ` style="color:${blockColor};"` : '';
        return `<${block.type}${style}>${inner}</${block.type}>`;
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

/**
 * Get the rendered HTML content for a news item.
 * Dispatches based on contentType: json → convert, html → use directly.
 * @param {object} newsItem
 * @returns {string} HTML string ready for dangerouslySetInnerHTML
 */
export function getRenderedContent(newsItem) {
  if (!newsItem) return '';

  const { content, contentType } = newsItem;

  if (contentType === 'json') {
    // content is a native JSON array of blocks
    const blocks = Array.isArray(content) ? content : [];
    return jsonToHtml(blocks);
  }

  // Legacy HTML (or no contentType set) — render directly
  return typeof content === 'string' ? content : '';
}
