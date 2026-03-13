import { useState, useEffect, useRef } from 'react';
import { fetchAllNews, createNews, updateNews, deleteNews } from '../../api';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (selectedNews) {
        await updateNews(selectedNews._id, formData);
        setSuccess('News updated successfully');
      } else {
        await createNews(formData);
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
    applyEditorCommand('formatBlock', value);
  };

  const handleEditorInput = (e) => {
    setFormData((prev) => ({ ...prev, content: e.currentTarget.innerHTML }));
  };

  const handleEditorPaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
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
    editorRef.current.innerHTML = selectedNews?.content || '';
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
                      <option value="H1">Large (H1)</option>
                      <option value="H2">Medium (H2)</option>
                      <option value="H3">Small (H3)</option>
                      <option value="P">Paragraph</option>
                    </select>

                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyEditorCommand('bold')} className="px-2 py-1 border border-white/10 rounded text-xs text-gray-200 hover:bg-white/10 font-bold">B</button>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyEditorCommand('italic')} className="px-2 py-1 border border-white/10 rounded text-xs text-gray-200 hover:bg-white/10 italic">I</button>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyEditorCommand('strikeThrough')} className="px-2 py-1 border border-white/10 rounded text-xs text-gray-200 hover:bg-white/10 line-through">S</button>

                    <label className="flex items-center gap-1 px-2 py-1 border border-white/10 rounded text-xs text-gray-200 bg-dark-surface cursor-pointer">
                      Color
                      <input
                        type="color"
                        defaultValue="#6BC6F5"
                        onChange={(e) => applyEditorCommand('foreColor', e.target.value)}
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

                <p className="text-[11px] text-gray-500 mt-1">Use the toolbar to format content. This will be stored as safe HTML.</p>
                {!String(formData.content || '').replace(/<[^>]*>/g, '').trim() && (
                  <p className="text-[11px] text-red-400 mt-1">Content is required.</p>
                )}
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
                  disabled={loading || !String(formData.content || '').replace(/<[^>]*>/g, '').trim()}
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