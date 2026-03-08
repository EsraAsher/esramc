import { useState, useEffect } from 'react';
import { fetchAdminAnnouncement, updateAdminAnnouncement } from '../../api';

const AdminAnnouncementBar = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminAnnouncement();
      setConfig(data);
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
      const updated = await updateAdminAnnouncement({
        enabled: config.enabled,
        text: config.text,
        link: config.link,
        bgColor: config.bgColor,
        textColor: config.textColor,
        scrolling: config.scrolling,
      });
      setConfig(updated);
      setMsg({ text: 'Saved successfully!', type: 'success' });
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const set = (key, value) => setConfig((c) => ({ ...c, [key]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500 font-pixel text-sm animate-pulse">Loading announcement config...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12 text-red-400 font-pixel text-xs">
        Failed to load announcement config.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-pixel text-sm text-red-400">ANNOUNCEMENT BAR</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 font-pixel text-xs bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50"
        >
          {saving ? 'SAVING...' : 'SAVE'}
        </button>
      </div>

      {msg.text && (
        <div
          className={`p-3 rounded-lg text-xs font-pixel border ${
            msg.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="bg-dark-surface border border-white/10 rounded-xl p-4 sm:p-6 space-y-5">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <label className="text-gray-300 text-sm">Enable Announcement Bar</label>
          <button
            type="button"
            onClick={() => set('enabled', !config.enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              config.enabled ? 'bg-red-500' : 'bg-gray-700'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                config.enabled ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Announcement text */}
        <div>
          <label className="block text-gray-400 text-xs mb-1">Announcement Text *</label>
          <textarea
            value={config.text || ''}
            onChange={(e) => set('text', e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="e.g. 🎉 Flash sale! 50% off all ranks this weekend."
            className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 resize-none"
          />
          <span className="text-gray-600 text-[10px]">{(config.text || '').length}/500</span>
        </div>

        {/* Link */}
        <div>
          <label className="block text-gray-400 text-xs mb-1">Link (optional)</label>
          <input
            type="text"
            value={config.link || ''}
            onChange={(e) => set('link', e.target.value)}
            placeholder="https://..."
            className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50"
          />
        </div>

        {/* Colors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-xs mb-1">Background Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.bgColor || '#dc2626'}
                onChange={(e) => set('bgColor', e.target.value)}
                className="h-9 w-14 rounded border border-white/10 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={config.bgColor || '#dc2626'}
                onChange={(e) => set('bgColor', e.target.value)}
                className="flex-1 bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-red-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-xs mb-1">Text Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.textColor || '#ffffff'}
                onChange={(e) => set('textColor', e.target.value)}
                className="h-9 w-14 rounded border border-white/10 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={config.textColor || '#ffffff'}
                onChange={(e) => set('textColor', e.target.value)}
                className="flex-1 bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-red-500/50"
              />
            </div>
          </div>
        </div>

        {/* Scrolling toggle */}
        <div className="flex items-center justify-between">
          <label className="text-gray-300 text-sm">Scrolling (marquee)</label>
          <button
            type="button"
            onClick={() => set('scrolling', !config.scrolling)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              config.scrolling ? 'bg-red-500' : 'bg-gray-700'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                config.scrolling ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Live Preview */}
        <div>
          <label className="block text-gray-400 text-xs mb-2">Preview</label>
          <div
            className="rounded-lg overflow-hidden text-sm font-medium"
            style={{ backgroundColor: config.bgColor || '#dc2626' }}
          >
            <div className="flex items-center justify-center px-4 py-2">
              {config.scrolling ? (
                <div className="overflow-hidden whitespace-nowrap w-full">
                  <div className="inline-block animate-marquee whitespace-nowrap">
                    <span style={{ color: config.textColor || '#ffffff' }}>
                      {config.text || 'Announcement text goes here...'}
                    </span>
                    <span className="mx-16" style={{ color: config.textColor || '#ffffff' }}>•</span>
                    <span style={{ color: config.textColor || '#ffffff' }}>
                      {config.text || 'Announcement text goes here...'}
                    </span>
                  </div>
                </div>
              ) : (
                <span style={{ color: config.textColor || '#ffffff' }}>
                  {config.text || 'Announcement text goes here...'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncementBar;
