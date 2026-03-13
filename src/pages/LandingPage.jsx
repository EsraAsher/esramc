import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchActiveNews } from '../api';
import NewsPost from '../components/NewsPost';

const LandingPage = () => {
  const [copied, setCopied] = useState(false);
  const [latestNews, setLatestNews] = useState(null);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    // Fetch latest active news
    fetchActiveNews(1)
      .then((newsData) => {
        if (newsData && newsData.length > 0) {
          setLatestNews(newsData[0]);
        } else {
          setLatestNews(null);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch news:", err);
        setLatestNews(null);
      })
      .finally(() => {
        setNewsLoading(false);
      });
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText('mc.esramc.fun');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="relative z-10 w-full">
      {/* ═══════════════════ HERO SECTION ═══════════════════ */}
      <div className="relative flex items-center justify-center overflow-hidden pt-14 sm:pt-16">
        <div className="relative z-10 flex items-center justify-center w-full px-4">

          {/* ─── Left Widget: Server IP (desktop only) ─── */}
          <div
            onClick={handleCopy}
            className="hidden lg:flex items-center gap-3 cursor-pointer transition-transform duration-300 hover:scale-105 absolute left-[8%] xl:left-[12%]"
          >
            <div className="w-15 h-15 bg-white rounded-full flex items-center justify-center shrink-0">
              <svg className="w-6.5 h-6.5 text-gray-900 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="8,5 19,12 8,19" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm tracking-wide">MC.ESRAMC.COM</span>
              <span className="text-gray-400 text-xs">
                {copied ? 'Copied!' : 'Click to copy'}
              </span>
            </div>
          </div>

          {/* ─── Center: Logo ─── */}
          <div className="text-center">
            <img
              src="https://i.postimg.cc/dVxd8gtY/logo-esrasmp-full.png"
              alt="EsraMC"
              className="w-auto h-40 sm:h-48 md:h-56 lg:h-64 mx-auto animate-float drop-shadow-[0_0_20px_rgba(58,167,227,0.8)]"
            />
          </div>

          {/* ─── Right Widget: Discord (desktop only) ─── */}
          <a
            href="https://discord.gg/wBNMMj2PE4"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-3 transition-transform duration-300 hover:scale-105 absolute right-[8%] xl:right-[12%]"
          >
            <div className="flex flex-col text-right">
              <span className="text-white font-bold text-sm tracking-wide">JOIN OUR DISCORD</span>
              <span className="text-gray-400 text-xs">Click to join</span>
            </div>
            <div className="w-15 h-15 bg-white rounded-full flex items-center justify-center shrink-0">
              <svg className="w-7.5 h-7.5 text-gray-900" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
            </div>
          </a>

        </div>
      </div>

      {/* ═══════════════════ ANNOUNCEMENT BANNER ═══════════════════ */}
      <section className="px-4 mt-5 md:mt-7">
        <div className="max-w-275 mx-auto">
          <div
            className="w-full min-h-30 max-h-55 px-4 md:px-5 py-4 md:py-5 bg-dark-blue border border-white/10 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.28)] overflow-hidden"
          >
            <div className="h-full flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-5">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 text-center sm:text-left">
                <img
                  src="https://mc-heads.net/avatar/eas3r"
                  alt="psd1"
                  className="w-12 h-12 md:w-14 md:h-14 rounded-md shrink-0"
                />
                <div>
                  <h2 className="font-pixel text-white text-base md:text-xl mb-1">
                    Welcome to EsraMC Official Website!
                  </h2>
                  <p className="text-gray-300 text-sm md:text-base line-clamp-2">
                    Join our community and start your SMP adventure today.
                  </p>
                </div>
              </div>

              <div className="flex flex-row flex-wrap items-center justify-center md:justify-end gap-2 w-full md:w-auto mt-auto md:mt-0">
                <a
                  href="https://discord.gg/xur9BYghZu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center px-4 py-2 bg-sky-blue/10 border border-sky-blue/30 text-sky-blue font-pixel text-xs md:text-sm rounded hover:bg-sky-blue/20 hover:border-sky-blue/60 transition-all duration-300 whitespace-nowrap"
                >
                  Join Discord
                </a>
                <Link
                  to="/store"
                  className="text-center px-4 py-2 bg-linear-to-r from-sky-blue to-light-blue text-white font-pixel text-xs md:text-sm rounded hover:scale-105 shadow-[0_0_20px_rgba(58,167,227,0.25)] hover:shadow-[0_0_30px_rgba(58,167,227,0.45)] transition-all duration-300 whitespace-nowrap"
                >
                  Visit Store
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ═══════════════════ LATEST NEWS ═══════════════════ */}
      <section className="pt-6 md:pt-8 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {newsLoading ? (
            <div className="flex justify-center py-12">
              <div className="text-sky-blue font-pixel text-sm animate-pulse">Loading updates...</div>
            </div>
          ) : latestNews ? (
            <div className="flex justify-center">
              <NewsPost news={latestNews} />
            </div>
          ) : (
            <div className="text-center py-12 border border-white/5 rounded-xl bg-white/3">
              <p className="text-gray-500 font-pixel text-sm">No updates available yet.</p>
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to="/news"
              className="inline-block px-8 py-3 bg-sky-blue/10 border border-sky-blue/50 text-sky-blue font-pixel text-sm rounded hover:bg-sky-blue/20 hover:border-sky-blue/60 transition-all duration-300"
            >
              View All Updates
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════ STORE PREVIEW ═══════════════════ */}
      <section className="py-16 px-4 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-pixel text-xl sm:text-2xl text-sky-blue mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Support the Server</h2>
          <p className="text-gray-300 text-base mb-8 max-w-2xl mx-auto drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Visit our store to unlock special ranks and perks to enhance your gameplay experience.
          </p>

          <Link
            to="/store"
            className="inline-block px-8 py-4 bg-linear-to-r from-sky-blue to-light-blue text-white font-pixel text-sm rounded-lg hover:scale-105 shadow-[0_0_25px_rgba(58,167,227,0.3)] hover:shadow-[0_0_40px_rgba(58,167,227,0.6)] transition-all duration-300"
          >
            Visit Store
          </Link>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="border-t border-white/10 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src="https://i.postimg.cc/kGFcyCTX/esramc-footerlogo.png"
                alt="EsraMC"
                className="h-16 w-auto"
              />
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 font-pixel text-xs text-gray-400">
              <Link to="/store" className="hover:text-sky-blue transition-colors">Store</Link>
              <Link to="/vote" className="hover:text-sky-blue transition-colors">Vote</Link>
              <Link to="/help" className="hover:text-sky-blue transition-colors">Support</Link>
              <a
                href="https://discord.gg/wBNMMj2PE4"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-sky-blue transition-colors"
              >
                Discord
              </a>
            </div>
          </div>

          {/* Copyright and Disclaimer */}
          <div className="text-center mt-8 pt-8 border-t border-white/5">
            <p className="text-gray-500 text-xs mb-2">
              © 2024 EsraMC. All rights reserved.
            </p>
            <p className="text-gray-600 text-xs">
              Not affiliated with Mojang AB.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default LandingPage;