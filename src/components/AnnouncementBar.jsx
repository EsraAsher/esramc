import { useState, useEffect } from 'react';
import { fetchAnnouncement } from '../api';

const AnnouncementBar = () => {
  const [data, setData] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchAnnouncement()
      .then((d) => { if (d.active) setData(d); })
      .catch(() => {});
  }, []);

  if (!data || dismissed) return null;

  const content = (
    <span style={{ color: data.textColor }}>
      {data.text}
    </span>
  );

  const inner = data.link ? (
    <a
      href={data.link}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline"
      style={{ color: data.textColor }}
    >
      {data.text}
    </a>
  ) : content;

  return (
    <div
      className="relative w-full z-50 text-sm font-medium overflow-hidden"
      style={{ backgroundColor: data.bgColor }}
    >
      <div className="flex items-center justify-center px-8 py-2">
        {data.scrolling ? (
          <div className="overflow-hidden whitespace-nowrap w-full">
            <div className="inline-block animate-marquee whitespace-nowrap">
              {inner}
              <span className="mx-16" style={{ color: data.textColor }}>•</span>
              {inner}
              <span className="mx-16" style={{ color: data.textColor }}>•</span>
              {inner}
              <span className="mx-16" style={{ color: data.textColor }}>•</span>
              {inner}
            </div>
          </div>
        ) : (
          <div className="text-center truncate">{inner}</div>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity text-xs px-1"
        style={{ color: data.textColor }}
        aria-label="Dismiss announcement"
      >
        ✕
      </button>
    </div>
  );
};

export default AnnouncementBar;
