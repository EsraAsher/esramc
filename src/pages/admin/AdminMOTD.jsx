import { useState, useEffect } from 'react';
import { fetchAdminMOTD, updateAdminMOTD, resetMOTDStock, fetchAllProducts } from '../../api';

const AdminMOTD = () => {
  const [motd, setMotd] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, p] = await Promise.all([fetchAdminMOTD(), fetchAllProducts()]);
      setMotd(m);
      setProducts(p);
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg({ text: '', type: '' });
    try {
      const updated = await updateAdminMOTD({
        enabled: motd.enabled,
        title: motd.title,
        badgeText: motd.badgeText,
        bgColor: motd.bgColor,
        accentColor: motd.accentColor,
        product: motd.product?._id || motd.product || null,
        startDate: motd.startDate,
        endDate: motd.endDate,
        stockLimit: motd.stockLimit,
        mediaType: motd.mediaType,
        mediaUrl: motd.mediaUrl,
        expiryBehavior: motd.expiryBehavior,
      });
      setMotd(updated);
      setMsg({ text: 'Saved successfully!', type: 'success' });
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetStock = async () => {
    if (!confirm('Reset sold count to 0?')) return;
    try {
      await resetMOTDStock();
      setMotd((m) => ({ ...m, stockSold: 0 }));
      setMsg({ text: 'Stock reset!', type: 'success' });
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    }
  };

  const set = (key, value) => setMotd((m) => ({ ...m, [key]: value }));

  const fmt = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500 font-pixel text-sm animate-pulse">Loading MOTD config...</div>
      </div>
    );
  }

  if (!motd) {
    return <p className="text-red-400 text-center py-12">Failed to load MOTD configuration.</p>;
  }

  const selectedProduct = typeof motd.product === 'object' ? motd.product : products.find(p => p._id === motd.product);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-pixel text-sm text-red-400">MOTD SECTION</h2>
          <span className={`px-2 py-0.5 rounded font-pixel text-[10px] ${motd.enabled ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
            {motd.enabled ? 'ACTIVE' : 'DISABLED'}
          </span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 font-pixel text-xs bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors shadow-[0_0_15px_rgba(255,0,0,0.3)] disabled:opacity-50"
        >
          {saving ? 'SAVING...' : 'SAVE CHANGES'}
        </button>
      </div>

      {msg.text && (
        <div className={`text-sm rounded-lg p-3 border ${msg.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
          {msg.text}
        </div>
      )}

      {/* Toggle */}
      <div className="bg-dark-surface border border-white/10 rounded-xl p-5">
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => set('enabled', !motd.enabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${motd.enabled ? 'bg-red-600' : 'bg-gray-700'}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${motd.enabled ? 'translate-x-5' : ''}`} />
          </div>
          <span className="text-white text-sm font-pixel">Enable Deal Section</span>
        </label>
      </div>

      {/* General Settings */}
      <div className="bg-dark-surface border border-white/10 rounded-xl p-5 space-y-4">
        <h3 className="font-pixel text-xs text-gray-400 mb-2">GENERAL</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-xs font-pixel mb-1">SECTION TITLE</label>
            <input
              type="text"
              value={motd.title || ''}
              onChange={(e) => set('title', e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs font-pixel mb-1">BADGE TEXT</label>
            <input
              type="text"
              value={motd.badgeText || ''}
              onChange={(e) => set('badgeText', e.target.value)}
              placeholder="Flash Sale"
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-xs font-pixel mb-1">BACKGROUND COLOR</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={motd.bgColor || '#1a0000'}
                onChange={(e) => set('bgColor', e.target.value)}
                className="w-10 h-10 rounded border border-white/10 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={motd.bgColor || ''}
                onChange={(e) => set('bgColor', e.target.value)}
                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-400 text-xs font-pixel mb-1">ACCENT COLOR</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={motd.accentColor || '#dc2626'}
                onChange={(e) => set('accentColor', e.target.value)}
                className="w-10 h-10 rounded border border-white/10 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={motd.accentColor || ''}
                onChange={(e) => set('accentColor', e.target.value)}
                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Product Selection */}
      <div className="bg-dark-surface border border-white/10 rounded-xl p-5 space-y-3">
        <h3 className="font-pixel text-xs text-gray-400 mb-2">PRODUCT</h3>
        <select
          value={motd.product?._id || motd.product || ''}
          onChange={(e) => set('product', e.target.value || null)}
          className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50"
        >
          <option value="">— Select Product —</option>
          {products.map((p) => (
            <option key={p._id} value={p._id}>
              {p.title} — ₹{p.price} {!p.isActive ? '(Inactive)' : ''}
            </option>
          ))}
        </select>
        {selectedProduct && (
          <div className="flex items-center gap-3 p-3 bg-black/30 rounded-lg border border-white/5">
            {selectedProduct.image && (
              <img src={selectedProduct.image} alt="" className="w-10 h-10 rounded object-cover" />
            )}
            <div>
              <div className="text-white text-sm">{selectedProduct.title}</div>
              <div className="text-green-400 text-xs font-mono">₹{selectedProduct.price}</div>
            </div>
          </div>
        )}
      </div>

      {/* Schedule */}
      <div className="bg-dark-surface border border-white/10 rounded-xl p-5 space-y-4">
        <h3 className="font-pixel text-xs text-gray-400 mb-2">SCHEDULE</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-xs font-pixel mb-1">START DATE & TIME</label>
            <input
              type="datetime-local"
              value={fmt(motd.startDate)}
              onChange={(e) => set('startDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs font-pixel mb-1">END DATE & TIME</label>
            <input
              type="datetime-local"
              value={fmt(motd.endDate)}
              onChange={(e) => set('endDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50"
            />
          </div>
        </div>
      </div>

      {/* Stock */}
      <div className="bg-dark-surface border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-pixel text-xs text-gray-400">STOCK</h3>
          <button
            onClick={handleResetStock}
            className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors font-pixel"
          >
            ↻ RESET SOLD COUNT
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-400 text-xs font-pixel mb-1">STOCK LIMIT (0 = unlimited)</label>
            <input
              type="number"
              min="0"
              value={motd.stockLimit || 0}
              onChange={(e) => set('stockLimit', parseInt(e.target.value) || 0)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs font-pixel mb-1">SOLD</label>
            <div className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-cyan-400 text-sm font-mono">
              {motd.stockSold || 0}
            </div>
          </div>
          <div>
            <label className="block text-gray-400 text-xs font-pixel mb-1">REMAINING</label>
            <div className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono">
              {motd.stockLimit > 0 ? (
                <span className={motd.stockLimit - (motd.stockSold || 0) <= 0 ? 'text-red-400' : 'text-green-400'}>
                  {Math.max(0, motd.stockLimit - (motd.stockSold || 0))}
                </span>
              ) : (
                <span className="text-gray-500">Unlimited</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Media */}
      <div className="bg-dark-surface border border-white/10 rounded-xl p-5 space-y-4">
        <h3 className="font-pixel text-xs text-gray-400 mb-2">MEDIA</h3>
        <div className="flex gap-3 mb-3">
          {['none', 'image', 'video'].map((t) => (
            <button
              key={t}
              onClick={() => set('mediaType', t)}
              className={`px-3 py-1.5 rounded-lg font-pixel text-xs transition-all ${
                motd.mediaType === t
                  ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                  : 'bg-black/30 border border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        {motd.mediaType !== 'none' && (
          <>
            <input
              type="text"
              value={motd.mediaUrl || ''}
              onChange={(e) => set('mediaUrl', e.target.value)}
              placeholder={motd.mediaType === 'video' ? 'https://example.com/video.mp4' : 'https://example.com/image.png'}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50"
            />
            {motd.mediaUrl && (
              <div className="mt-2 max-w-xs">
                {motd.mediaType === 'image' ? (
                  <img src={motd.mediaUrl} alt="Preview" className="rounded-lg border border-white/10 max-h-40 object-cover" />
                ) : (
                  <video src={motd.mediaUrl} muted autoPlay loop playsInline className="rounded-lg border border-white/10 max-h-40" />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Expiry Behavior */}
      <div className="bg-dark-surface border border-white/10 rounded-xl p-5 space-y-3">
        <h3 className="font-pixel text-xs text-gray-400 mb-2">ON EXPIRY</h3>
        <div className="flex gap-3">
          {[
            { value: 'auto-hide', label: 'Auto-Hide Section' },
            { value: 'show-expired', label: 'Show Expired Banner' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => set('expiryBehavior', opt.value)}
              className={`px-4 py-2 rounded-lg font-pixel text-xs transition-all ${
                motd.expiryBehavior === opt.value
                  ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                  : 'bg-black/30 border border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminMOTD;
