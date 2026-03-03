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
    <div className="flex items-center gap-1.5">
      {[
        { val: pad(time.h), label: 'H' },
        { val: pad(time.m), label: 'M' },
        { val: pad(time.s), label: 'S' },
      ].map((u, i) => (
        <div key={u.label} className="flex items-center gap-1.5">
          <div
            className="bg-black/60 border border-white/10 rounded px-2 py-1 min-w-[2.2rem] text-center"
            style={{ borderColor: `${accentColor}33` }}
          >
            <span className="font-pixel text-sm sm:text-base text-white font-bold tabular-nums">{u.val}</span>
            <span className="block text-[9px] text-gray-500 font-pixel -mt-0.5">{u.label}</span>
          </div>
          {i < 2 && <span className="text-gray-500 font-pixel text-xs animate-pulse">:</span>}
        </div>
      ))}
    </div>
  );
}

const LimitedTimeDeal = () => {
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const { addToCart } = useCart();
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
    addToCart({
      id: product._id,
      title: product.title,
      price: product.price,
      image: product.image,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 800);
  };

  const glowColor = accentColor || '#ef4444';

  return (
    <section
      ref={containerRef}
      className="relative mx-auto max-w-5xl px-4 sm:px-6 pt-2"
    >
      {/* Outer glow wrapper */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: bgColor || '#0a0a0a',
          boxShadow: `0 0 40px ${glowColor}22, 0 0 80px ${glowColor}11, inset 0 1px 0 rgba(255,255,255,0.05)`,
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

        <div className="relative z-10 p-4 sm:p-6 md:p-8">
          {/* Top bar: badge + countdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              {badgeText && (
                <span
                  className="font-pixel text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse"
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
                className="font-pixel text-base sm:text-lg md:text-xl text-white font-bold"
                style={{ textShadow: `0 0 20px ${glowColor}33` }}
              >
                {title}
              </h2>
            </div>

            {!expired && endDate && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-pixel text-[10px] uppercase tracking-wide">Ends in</span>
                <CountdownTimer endDate={endDate} accentColor={glowColor} />
              </div>
            )}
          </div>

          {/* Main content: media + product details */}
          <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
            {/* Media / Image area */}
            <div className="md:w-2/5 shrink-0">
              <div
                className="relative rounded-xl overflow-hidden aspect-4/3 bg-black/40 border border-white/5"
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
                    <span className="text-5xl opacity-30">🎮</span>
                  </div>
                )}

                {/* Stock badge overlay */}
                {!expired && stockRemaining !== null && (
                  <div className="absolute top-2 left-2">
                    <span
                      className={`font-pixel text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        soldOut
                          ? 'bg-gray-800 text-gray-400 border border-gray-600'
                          : stockRemaining <= 5
                          ? 'bg-red-600/90 text-white border border-red-400 animate-pulse'
                          : 'bg-black/70 text-white border border-white/20'
                      }`}
                    >
                      {soldOut ? 'SOLD OUT' : `${stockRemaining} LEFT`}
                    </span>
                  </div>
                )}

                {/* Price tag */}
                <div
                  className="absolute top-2 right-2 font-pixel text-xs font-bold px-2.5 py-1 rounded-lg"
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

            {/* Product info + CTA */}
            <div className="flex-1 flex flex-col justify-between min-h-0">
              <div>
                <h3 className="font-pixel text-lg sm:text-xl md:text-2xl text-white font-bold mb-3">
                  {product.title}
                </h3>

                {product.features && product.features.length > 0 && (
                  <ul className="space-y-1.5 mb-4">
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
                <div className="mt-4 py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <span className="font-pixel text-xs text-gray-400">This deal has ended</span>
                </div>
              ) : (
                <button
                  onClick={handleAdd}
                  disabled={soldOut}
                  className={`mt-4 w-full py-3 sm:py-3.5 rounded-xl font-pixel text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
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
                  {soldOut ? '🚫 SOLD OUT' : added ? '✓ ADDED TO CART' : '⚡ GRAB THIS DEAL'}
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
