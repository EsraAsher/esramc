import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import { fetchAllNews, createNews, updateNews, deleteNews } from '../../api';
import { jsonToHtml } from '../../utils/newsUtils';

// ─── Toolbar Button ───────────────────────────────────────
const ToolbarButton = ({ onClick, active, title, children, className = '' }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    title={title}
    className={`px-2 py-1 border rounded text-xs transition-colors ${
      active
        ? 'bg-sky-blue/30 border-sky-blue/60 text-sky-blue'
        : 'border-white/10 text-gray-200 hover:bg-white/10'
    } ${className}`}
  >
    {children}
  </button>
);

// ─── Editor Toolbar ───────────────────────────────────────
const EditorToolbar = ({ editor }) => {
  if (!editor) return null;

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL (https://...)', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="p-2 border-b border-white/10 flex flex-wrap items-center gap-1.5">
      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        H3
      </ToolbarButton>

      <select
        className="bg-dark-surface border border-white/10 rounded px-2 py-1 text-xs text-gray-200"
        value={editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
        onChange={(e) => {
          const next = e.target.value;
          const chain = editor.chain().focus();
          if (next === 'h1') chain.toggleHeading({ level: 1 }).run();
          else if (next === 'h2') chain.toggleHeading({ level: 2 }).run();
          else if (next === 'h3') chain.toggleHeading({ level: 3 }).run();
          else chain.setParagraph().run();
        }}
        title="Block Type"
      >
        <option value="p">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>

      <div className="w-px h-5 bg-white/10 mx-0.5" />

      {/* Inline Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Bold"
        className="font-bold"
      >
        B
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Italic"
        className="italic"
      >
        I
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="Strikethrough"
        className="line-through"
      >
        S
      </ToolbarButton>

      <div className="w-px h-5 bg-white/10 mx-0.5" />

      {/* Text Color */}
      <label
        className="flex items-center gap-1 px-2 py-1 border border-white/10 rounded text-xs text-gray-200 bg-dark-surface cursor-pointer hover:bg-white/10 transition-colors"
        title="Text Color"
      >
        Color
        <input
          type="color"
          defaultValue="#6BC6F5"
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          className="w-5 h-5 bg-transparent border-none p-0 cursor-pointer"
          aria-label="Text color"
        />
      </label>

      <div className="w-px h-5 bg-white/10 mx-0.5" />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Bullet List"
      >
        • List
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Numbered List"
      >
        1. List
      </ToolbarButton>

      <div className="w-px h-5 bg-white/10 mx-0.5" />

      {/* Link */}
      <ToolbarButton
        onClick={setLink}
        active={editor.isActive('link')}
        title="Insert Link"
      >
        Link
      </ToolbarButton>

      {/* Clear Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        title="Clear Formatting"
      >
        Clear
      </ToolbarButton>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────
const AdminNews = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    image: '',
    author: '',
    isActive: true,
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // ─── TipTap Editor ─────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bold: {},
        italic: {},
        strike: {},
        bulletList: {},
        orderedList: {},
        listItem: {},
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    editorProps: {
      attributes: {
        class:
          'w-full min-h-64 max-h-96 overflow-y-auto p-3 text-white focus:outline-none text-sm leading-relaxed tiptap-editor',
      },
    },
    content: '',
  });

  // ─── Load initial news list ─────────────────────────────
  useEffect(() => {
    loadNews();
  }, []);

  // ─── Populate editor when form opens ───────────────────
  useEffect(() => {
    if (!editor) return;
    if (showForm) {
      if (selectedNews) {
        // Load existing content into editor
        const content = selectedNews.contentType === 'json'
          ? jsonToHtml(Array.isArray(selectedNews.content) ? selectedNews.content : [])
          : (typeof selectedNews.content === 'string' ? selectedNews.content : '');
        editor.commands.setContent(content, false);
      } else {
        editor.commands.setContent('', false);
      }
      // Focus after a short tick to let the modal render
      setTimeout(() => editor.commands.focus(), 50);
    }
  }, [showForm, selectedNews, editor]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editor) return;

    setLoading(true);
    setError('');
    setSuccess('');

    const htmlContent = editor.getHTML();
    const plainText = editor.getText().trim();

    if (!plainText) {
      setError('Content is required');
      setLoading(false);
      return;
    }

    const payload = {
      title: formData.title,
      content: htmlContent,
      contentType: 'html',
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
    setFormData({ title: '', image: '', author: '', isActive: true });
    setSelectedNews(null);
    setShowForm(false);
    editor?.commands.setContent('', false);
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 3000);
  };

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
        <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
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
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
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

              {/* Author + Status */}
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
                          onError={(e) => { e.target.src = 'https://mc-heads.net/avatar/Steve'; }}
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
                    <label htmlFor="isActive" className="text-sm text-gray-300 cursor-pointer select-none">
                      Active / Published
                    </label>
                  </div>
                </div>
              </div>

              {/* Content Editor */}
              <div>
                <label className="block text-gray-400 text-xs mb-2 font-pixel">Full Content</label>
                <div className="bg-dark-bg border border-white/10 rounded-lg overflow-hidden">
                  <EditorToolbar editor={editor} />
                  <EditorContent editor={editor} />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Use the toolbar to format content. Bold, italic, headings, lists, colors, and links are all supported.
                </p>
              </div>

              {/* Image */}
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

              {/* Buttons */}
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
                  {loading ? 'Saving...' : selectedNews ? 'Update News' : 'Create News'}
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
              {/* Thumbnail */}
              <div className="w-full sm:w-24 h-24 bg-dark-bg rounded-lg overflow-hidden shrink-0 border border-white/5">
                {item.image ? (
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No Image</div>
                )}
              </div>

              {/* Info */}
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
                      onError={(e) => { e.target.style.display = 'none'; }}
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