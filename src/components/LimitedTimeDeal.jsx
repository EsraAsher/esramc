import { useState, useEffect, useRef } from 'react';
import { fetchActiveMOTD } from '../api';
import { useCart } from '../context/CartContext';

function getTimeLeft(endDate) {
  const diff = new Date(endDate) - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { h, m, s, total: diff };
}

function CountdownTimer({ endDate, accentColor }) {
  const [time, setTime] = useState(() => getTimeLeft(endDate));

  useEffect(() => {
    const id = setInterval(() => {
      const t = getTimeLeft(endDate);
      if (!t) clearInterval(id);
      setTime(t);
    }, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  if (!time) return <span className="font-pixel text-xs text-red-400">EXPIRED</span>;

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-1">
      {[
        { val: pad(time.h), label: 'H' },
        { val: pad(time.m), label: 'M' },
        { val: pad(time.s), label: 'S' },
      ].map((u, i) => (
        <div key={u.label} className="flex items-center gap-1">
          <div
            className="bg-black/60 border border-white/10 rounded px-1.5 py-0.5 sm:px-2 sm:py-1 min-w-[1.6rem] sm:min-w-[2.2rem] text-center"
            style={{ borderColor: `${accentColor}33` }}
          >
            <span className="font-pixel text-[10px] sm:text-base text-white font-bold tabular-nums">{u.val}</span>
            <span className="hidden sm:block text-[9px] text-gray-500 font-pixel -mt-0.5">{u.label}</span>
          </div>
          {i < 2 && <span className="text-gray-500 font-pixel text-[10px] animate-pulse">:</span>}
        </div>
      ))}
    </div>
  );
}

const LimitedTimeDeal = () => {
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const { addToCart, setCartOpen } = useCart();
  const containerRef = useRef(null);

  useEffect(() => {
    fetchActiveMOTD()
      .then((data) => {
        if (data?.active) setDeal(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !deal) return null;

  const { title, badgeText, bgColor, accentColor, endDate, stockRemaining, soldOut, expired, mediaType, mediaUrl, product } = deal;

  const handleAdd = () => {
    if (soldOut || expired) return;
    const ok = addToCart({
      id: product._id,
      title: product.title,
      price: product.price,
      image: product.image,
      maxQuantityPerOrder: product.maxQuantityPerOrder,
    });
    if (ok === false) return; // blocked by limit
    setAdded(true);
    setCartOpen(true);
    setTimeout(() => setAdded(false), 800);
  };

  const glowColor = accentColor || '#ef4444';

  return (
    <section
      ref={containerRef}
      className="relative mx-auto max-w-5xl px-3 sm:px-6 pt-2"
    >
      {/* Outer glow wrapper */}
      <div
        className="relative rounded-xl sm:rounded-2xl overflow-hidden"
        style={{
          background: bgColor || '#0a0a0a',
          boxShadow: `0 0 20px ${glowColor}15, inset 0 1px 0 rgba(255,255,255,0.05)`,
        }}
      >
        {/* Animated border glow */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            border: `1.5px solid ${glowColor}44`,
            boxShadow: `inset 0 0 30px ${glowColor}08`,
          }}
        />

        {/* Scanline overlay for texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
          }}
        />

        <div className="relative z-10 p-3 sm:p-6 md:p-8">
          {/* Top bar: badge + title + countdown — single row on mobile */}
          <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-6">
            <div className="flex items-center gap-2 min-w-0">
              {badgeText && (
                <span
                  className="font-pixel text-[8px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full uppercase tracking-wider animate-pulse shrink-0"
                  style={{
                    background: `${glowColor}22`,
                    color: glowColor,
                    border: `1px solid ${glowColor}44`,
                    textShadow: `0 0 8px ${glowColor}88`,
                  }}
                >
                  {badgeText}
                </span>
              )}
              <h2
                className="font-pixel text-xs sm:text-lg md:text-xl text-white font-bold truncate"
                style={{ textShadow: `0 0 20px ${glowColor}33` }}
              >
                {title}
              </h2>
            </div>

            {!expired && endDate && (
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <span className="hidden sm:inline text-gray-500 font-pixel text-[10px] uppercase tracking-wide">Ends in</span>
                <CountdownTimer endDate={endDate} accentColor={glowColor} />
              </div>
            )}
          </div>

          {/* Main content: horizontal card on mobile, side-by-side on desktop */}
          <div className="flex gap-2.5 sm:gap-6">
            {/* Media / Image — small square on mobile, larger on desktop */}
            <div className="w-24 h-24 sm:w-auto sm:h-auto sm:aspect-4/3 md:w-2/5 shrink-0">
              <div
                className="relative rounded-lg sm:rounded-xl overflow-hidden w-full h-full bg-black/40 border border-white/5"
                style={{ boxShadow: `0 0 20px ${glowColor}11` }}
              >
                {mediaType === 'video' && mediaUrl ? (
                  <video
                    src={mediaUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (mediaType === 'image' && mediaUrl) || product.image ? (
                  <img
                    src={mediaUrl || product.image}
                    alt={product.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-3xl sm:text-5xl opacity-30">🎮</span>
                  </div>
                )}

                {/* Price tag — small on mobile */}
                <div
                  className="absolute top-1 right-1 sm:top-2 sm:right-2 font-pixel text-[10px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded sm:rounded-lg"
                  style={{
                    background: `${glowColor}dd`,
                    color: '#fff',
                    boxShadow: `0 0 12px ${glowColor}66`,
                  }}
                >
                  ₹{product.price}
                </div>
              </div>
            </div>

            {/* Product info + CTA — right side on mobile */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div className="min-w-0">
                <h3 className="font-pixel text-sm sm:text-xl md:text-2xl text-white font-bold mb-1 sm:mb-3 truncate">
                  {product.title}
                </h3>

                {/* Stock badge inline on mobile */}
                {!expired && stockRemaining !== null && (
                  <div className="mb-1.5 sm:mb-2">
                    <span
                      className={`font-pixel text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold inline-block ${
                        soldOut
                          ? 'bg-gray-800 text-gray-400 border border-gray-600'
                          : stockRemaining <= 5
                          ? 'bg-red-600/90 text-white border border-red-400 animate-pulse'
                          : 'bg-black/70 text-white border border-white/20'
                      }`}
                    >
                      {soldOut ? 'SOLD OUT' : `Only ${stockRemaining} left`}
                    </span>
                  </div>
                )}

                {/* Features — hidden on mobile, shown on sm+ */}
                {product.features && product.features.length > 0 && (
                  <ul className="hidden sm:block space-y-1.5 mb-4">
                    {product.features.map((f, i) => (
                      <li key={i} className="flex items-start text-gray-300 text-xs sm:text-sm">
                        <span style={{ color: glowColor }} className="mr-2 mt-0.5 shrink-0">◆</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Expired state */}
              {expired ? (
                <div className="mt-1.5 sm:mt-4 py-2 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-center">
                  <span className="font-pixel text-[10px] sm:text-xs text-gray-400">Deal ended</span>
                </div>
              ) : (
                <button
                  onClick={handleAdd}
                  disabled={soldOut}
                  className={`mt-1.5 sm:mt-4 w-full py-2 sm:py-3.5 rounded-lg sm:rounded-xl font-pixel text-[10px] sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
                    soldOut
                      ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                      : added
                      ? 'bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)]'
                      : 'text-white hover:brightness-110 active:scale-[0.98]'
                  }`}
                  style={
                    !soldOut && !added
                      ? {
                          background: `linear-gradient(135deg, ${glowColor}cc, ${glowColor}99)`,
                          boxShadow: `0 0 20px ${glowColor}44, 0 4px 12px rgba(0,0,0,0.4)`,
                          border: `1px solid ${glowColor}66`,
                        }
                      : undefined
                  }
                >
                  {soldOut ? '🚫 SOLD OUT' : added ? '✓ ADDED' : '⚡ GRAB DEAL'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LimitedTimeDeal;
