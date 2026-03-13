import { useState, useEffect, useRef } from 'react';
import { fetchAllNews, createNews, updateNews, deleteNews } from '../../api';
import { jsonToHtml } from '../../utils/newsUtils';

const AdminNews = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image: '',
    author: '',
    isActive: true,
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const editorRef = useRef(null);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    setLoading(true);
    try {
      const data = await fetchAllNews();
      setNews(data);
    } catch (err) {
      setError('Failed to load news: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── DOM → Structured JSON Serializer ──────────────────
  const serializeEditor = () => {
    const editor = editorRef.current;
    if (!editor) return [];

    const blocks = [];
    const children = editor.childNodes;

    // Helper: serialize inline content of a node to text-node array
    const serializeInline = (node) => {
      const result = [];

      const walk = (el, inherited) => {
        if (el.nodeType === Node.TEXT_NODE) {
          const text = el.textContent;
          if (text) {
            result.push({ text, ...inherited });
          }
          return;
        }

        if (el.nodeType !== Node.ELEMENT_NODE) return;

        const tag = el.tagName?.toLowerCase();
        const props = { ...inherited };

        if (tag === 'strong' || tag === 'b') props.bold = true;
        if (tag === 'em' || tag === 'i') props.italic = true;
        if (tag === 'del' || tag === 's' || tag === 'strike') props.strike = true;
        if (tag === 'a' && el.href) props.link = el.href;

        // Color from <span style> or <font color>
        if (tag === 'span' && el.style?.color) {
          props.color = el.style.color;
        }
        if (tag === 'font' && el.getAttribute('color')) {
          props.color = el.getAttribute('color');
        }

        for (const child of el.childNodes) {
          walk(child, props);
        }
      };

      walk(node, {});
      return result.length > 0 ? result : [{ text: '' }];
    };

    // Normalize: if the editor has no block-level elements, wrap everything in <p>
    const isBlockTag = (tag) => ['P', 'H1', 'H2', 'H3', 'UL', 'OL', 'DIV', 'BLOCKQUOTE'].includes(tag);

    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent.trim();
        if (text) {
          blocks.push({ type: 'p', children: [{ text }] });
        }
        continue;
      }

      if (child.nodeType !== Node.ELEMENT_NODE) continue;

      const tag = child.tagName;

      if (tag === 'UL' || tag === 'OL') {
        const items = [];
        for (const li of child.querySelectorAll('li')) {
          items.push({ type: 'li', children: serializeInline(li) });
        }
        if (items.length > 0) {
          blocks.push({ type: tag.toLowerCase(), children: items });
        }
        continue;
      }

      if (tag === 'BR') {
        // Skip standalone <br> or add empty paragraph
        continue;
      }

      // Map to allowed block types
      let blockType = 'p';
      if (tag === 'H1') blockType = 'h1';
      else if (tag === 'H2') blockType = 'h2';
      else if (tag === 'H3') blockType = 'h3';
      else if (!isBlockTag(tag)) {
        // Inline element at top level — wrap in p
        blockType = 'p';
      }

      const inlineChildren = serializeInline(child);
      // Clean up: remove empty trailing text nodes
      const cleanChildren = inlineChildren.filter((n, i) =>
        n.text !== '' || i < inlineChildren.length - 1
      );

      if (cleanChildren.length > 0) {
        blocks.push({ type: blockType, children: cleanChildren });
      }
    }

    return blocks;
  };

  // ─── JSON → Editor HTML (for editing existing posts) ───
  const contentToEditorHtml = (newsItem) => {
    if (!newsItem) return '';
    if (newsItem.contentType === 'json' && Array.isArray(newsItem.content)) {
      return jsonToHtml(newsItem.content);
    }
    // Legacy HTML
    return typeof newsItem.content === 'string' ? newsItem.content : '';
  };

  // ─── Custom Color Command ────────────────────────────
  const applyColor = (color) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    if (range.collapsed) return; // no text selected

    // Wrap selection in a span with color style
    const span = document.createElement('span');
    span.style.color = color;

    try {
      range.surroundContents(span);
    } catch {
      // If selection crosses element boundaries, use execCommand as fallback
      // then fix the output
      document.execCommand('foreColor', false, color);
      // Convert any <font> tags the browser may have created
      const fonts = editor.querySelectorAll('font[color]');
      fonts.forEach((font) => {
        const replacement = document.createElement('span');
        replacement.style.color = font.getAttribute('color');
        replacement.innerHTML = font.innerHTML;
        font.replaceWith(replacement);
      });
    }

    selection.removeAllRanges();
  };

  // ─── Editor Commands ──────────────────────────────────
  const applyEditorCommand = (command, value = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    if (command === 'createLink') {
      const link = window.prompt('Enter URL (https://...)');
      if (!link) return;
      document.execCommand('createLink', false, link);
      return;
    }
    if (command === 'removeFormat') {
      document.execCommand('removeFormat', false, null);
      return;
    }
    document.execCommand(command, false, value);
  };

  const handleHeadingChange = (e) => {
    const value = e.target.value;
    if (!value) return;
    editorRef.current?.focus();
    document.execCommand('formatBlock', false, `<${value}>`);
    e.target.value = '';
  };

  const handleEditorInput = () => {
    if (error) setError('');
  };

  // ─── Paste Sanitization ───────────────────────────────
  const handleEditorPaste = (e) => {
    e.preventDefault();
    const clipboardData = e.clipboardData;

    // Try to get HTML first, then sanitize it
    let html = clipboardData.getData('text/html');

    if (html) {
      // Strip external styles, class attributes, data attributes, scripts
      const temp = document.createElement('div');
      temp.innerHTML = html;

      // Remove all style tags, script tags, meta tags
      temp.querySelectorAll('style, script, meta, link').forEach((el) => el.remove());

      // Walk all elements and clean attributes
      temp.querySelectorAll('*').forEach((el) => {
        // Remove class, id, data-* attributes
        const attrs = [...el.attributes];
        for (const attr of attrs) {
          const name = attr.name.toLowerCase();
          if (name === 'class' || name === 'id' || name.startsWith('data-')) {
            el.removeAttribute(attr.name);
          }
          // Remove style except color
          if (name === 'style') {
            const color = el.style.color;
            const fontWeight = el.style.fontWeight;
            const fontStyle = el.style.fontStyle;
            el.removeAttribute('style');
            if (color) el.style.color = color;
            if (fontWeight === 'bold' || parseInt(fontWeight) >= 700) el.style.fontWeight = 'bold';
            if (fontStyle === 'italic') el.style.fontStyle = 'italic';
          }
        }

        // Convert unsupported tags to spans or remove them
        const tag = el.tagName.toLowerCase();
        const allowed = ['p', 'br', 'h1', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'del', 's',
          'ul', 'ol', 'li', 'a', 'span', 'div'];
        if (!allowed.includes(tag)) {
          // Replace with its inner content
          const fragment = document.createDocumentFragment();
          while (el.firstChild) fragment.appendChild(el.firstChild);
          el.replaceWith(fragment);
        }
      });

      // Convert <font> to <span>
      temp.querySelectorAll('font').forEach((font) => {
        const span = document.createElement('span');
        if (font.getAttribute('color')) {
          span.style.color = font.getAttribute('color');
        }
        span.innerHTML = font.innerHTML;
        font.replaceWith(span);
      });

      // Insert the cleaned HTML
      const cleaned = temp.innerHTML;
      document.execCommand('insertHTML', false, cleaned);
    } else {
      // Plain text fallback
      const text = clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
    }
  };

  // ─── Form Handling ────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Serialize editor DOM to structured JSON
    const blocks = serializeEditor();

    // Check for meaningful content
    const hasText = blocks.some((block) => {
      const checkChildren = (children) =>
        children?.some((c) => (c.text && c.text.trim()) || checkChildren(c.children));
      return checkChildren(block.children);
    });

    if (!hasText) {
      setError('Content is required');
      setLoading(false);
      return;
    }

    const payload = {
      title: formData.title,
      content: blocks,
      contentType: 'json',
      image: formData.image,
      author: formData.author,
      isActive: formData.isActive,
    };

    try {
      if (selectedNews) {
        await updateNews(selectedNews._id, payload);
        setSuccess('News updated successfully');
      } else {
        await createNews(payload);
        setSuccess('News created successfully');
      }
      
      resetForm();
      await loadNews();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (newsItem) => {
    setSelectedNews(newsItem);
    setFormData({
      title: newsItem.title,
      content: newsItem.content || '',
      image: newsItem.image || '',
      author: newsItem.author || '',
      isActive: newsItem.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this news item?')) return;
    
    setLoading(true);
    try {
      await deleteNews(id);
      setSuccess('News deleted successfully');
      await loadNews();
    } catch (err) {
      setError('Failed to delete news: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      image: '',
      author: '',
      isActive: true,
    });
    setSelectedNews(null);
    setShowForm(false);
    // clear notifications after a while
    setTimeout(() => {
        setSuccess('');
        setError('');
    }, 3000);
  };

  useEffect(() => {
    if (!showForm || !editorRef.current) return;
    editorRef.current.innerHTML = contentToEditorHtml(selectedNews);
  }, [showForm, selectedNews]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">News Management</h1>
          <p className="text-gray-400 text-sm">Manage homepage news articles and announcements</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-sky-blue text-white rounded-lg hover:bg-light-blue transition-colors font-pixel text-xs shadow-[0_0_10px_rgba(58,167,227,0.3)]"
        >
          ADD NEWS
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm animate-pulse">
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm animate-pulse">
          {error}
        </div>
      )}

      {/* News Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-dark-surface border border-white/10 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white font-pixel">
                {selectedNews ? 'Edit News' : 'Create News'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-xs mb-1 font-pixel">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-dark-bg border border-white/10 rounded-lg p-3 text-white focus:border-sky-blue outline-none transition-colors"
                  placeholder="e.g. Season 1 Launch"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs mb-1 font-pixel">Author (MC Username)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      className="w-full bg-dark-bg border border-white/10 rounded-lg p-3 text-white focus:border-sky-blue outline-none transition-colors"
                      placeholder="e.g. psd1"
                      required
                    />
                    {formData.author && (
                      <div className="w-10 h-10 bg-dark-bg border border-white/10 rounded overflow-hidden shrink-0">
                         <img 
                            src={`https://mc-heads.net/avatar/${formData.author}`} 
                            alt="Head" 
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.src = `https://mc-heads.net/avatar/Steve` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                   <label className="block text-gray-400 text-xs mb-1 font-pixel">Status</label>
                   <div className="flex items-center gap-3 p-3 bg-dark-bg border border-white/10 rounded-lg h-11.5">
                       <input
                         type="checkbox"
                         id="isActive"
                         checked={formData.isActive}
                         onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                         className="rounded text-sky-blue focus:ring-sky-blue bg-dark-surface border-white/20 w-4 h-4 cursor-pointer"
                       />
                       <label htmlFor="isActive" className="text-sm text-gray-300 cursor-pointer select-none">Active / Published</label>
                   </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs mb-2 font-pixel">Full Content</label>

                <div className="bg-dark-bg border border-white/10 rounded-lg overflow-hidden">
                  <div className="p-2 border-b border-white/10 flex flex-wrap items-center gap-2">
                    <select
                      className="bg-dark-surface border border-white/10 rounded px-2 py-1 text-xs text-gray-200"
                      defaultValue=""
                      onChange={handleHeadingChange}
                    >
                      <option value="">Headings</option>
                      <option value="h1">Large (H1)</option>
                      <option value="h2">Medium (H2)</option>
                      <option value="h3">Small (H3)</option>
                      <option value="p">Paragraph</option>
                    </select>

                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyEditorCommand('bold')} className="px-2 py-1 border border-white/10 rounded text-xs text-gray-200 hover:bg-white/10 font-bold">B</button>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyEditorCommand('italic')} className="px-2 py-1 border border-white/10 rounded text-xs text-gray-200 hover:bg-white/10 italic">I</button>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyEditorCommand('strikeThrough')} className="px-2 py-1 border border-white/10 rounded text-xs text-gray-200 hover:bg-white/10 line-through">S</button>

                    <label className="flex items-center gap-1 px-2 py-1 border border-white/10 rounded text-xs text-gray-200 bg-dark-surface cursor-pointer">
                      Color
                      <input
                        type="color"
                        defaultValue="#6BC6F5"
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => applyColor(e.target.value)}
                        className="w-5 h-5 bg-transparent border-none p-0"
                        aria-label="Text color"
                      />
                    </label>

                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyEditorCommand('insertUnorderedList')} className="px-2 py-1 border border-white/10 rounded text-xs text-gray-200 hover:bg-white/10">• List</button>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyEditorCommand('insertOrderedList')} className="px-2 py-1 border border-white/10 rounded text-xs text-gray-200 hover:bg-white/10">1. List</button>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyEditorCommand('createLink')} className="px-2 py-1 border border-white/10 rounded text-xs text-gray-200 hover:bg-white/10">Link</button>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyEditorCommand('removeFormat')} className="px-2 py-1 border border-white/10 rounded text-xs text-gray-200 hover:bg-white/10">Clear</button>
                  </div>

                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleEditorInput}
                    onPaste={handleEditorPaste}
                    className="w-full min-h-64 max-h-96 overflow-y-auto p-3 text-white focus:outline-none focus:ring-0 text-sm leading-relaxed"
                    style={{ whiteSpace: 'pre-wrap' }}
                    role="textbox"
                    aria-label="News content editor"
                  />
                </div>

                <p className="text-[11px] text-gray-500 mt-1">Use the toolbar to format content. Content is stored as structured JSON.</p>
              </div>

              <div>
                <label className="block text-gray-400 text-xs mb-1 font-pixel">Image URL (Optional)</label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full bg-dark-bg border border-white/10 rounded-lg p-3 text-white focus:border-sky-blue outline-none transition-colors"
                  placeholder="https://..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors font-pixel text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-sky-blue text-white rounded-lg hover:bg-light-blue transition-colors font-pixel text-xs shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (selectedNews ? 'Update News' : 'Create News')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* News List */}
      <div className="grid gap-4">
        {news.length === 0 && !loading ? (
          <div className="text-center py-12 text-gray-500 bg-dark-surface/50 rounded-xl border border-white/5">
            No news articles found. Create one to get started.
          </div>
        ) : (
          news.map((item) => (
            <div
              key={item._id}
              className="bg-dark-surface border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:border-white/10 transition-colors"
            >
              {/* Image Thumbnail */}
              <div className="w-full sm:w-24 h-24 sm:h-24 bg-dark-bg rounded-lg overflow-hidden shrink-0 border border-white/5">
                {item.image ? (
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                    No Image
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="grow min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-bold text-white text-lg truncate mr-2">{item.title}</h3>
                  <span className={`px-2 py-0.5 text-[10px] rounded border ${
                    item.isActive 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                      : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  }`}>
                    {item.isActive ? 'ACTIVE' : 'DRAFT'}
                  </span>
                </div>
                <p className="text-gray-400 text-sm line-clamp-2 mb-2">{item.summary}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <img 
                         src={`https://mc-heads.net/avatar/${item.author}`} 
                         alt="" 
                         className="w-4 h-4 rounded-sm"
                         onError={(e) => { e.target.style.display = 'none' }}
                     />
                    <span>{item.author}</span>
                  </div>
                  <span>•</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <button
                  onClick={() => handleEdit(item)}
                  className="flex-1 sm:flex-none px-3 py-2 bg-sky-blue/10 text-sky-blue rounded hover:bg-sky-blue/20 transition-colors text-xs font-pixel border border-sky-blue/20"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item._id)}
                  className="flex-1 sm:flex-none px-3 py-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors text-xs font-pixel border border-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminNews;