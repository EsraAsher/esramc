import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchActiveNews } from '../api';
import NewsCard from '../components/NewsCard';

const LandingPage = () => {
  const [copied, setCopied] = useState(false);
  const [news, setNews] = useState([]);

  useEffect(() => {
    // Fetch latest 3 active news
    fetchActiveNews(3)
      .then((newsData) => setNews(newsData))
      .catch((err) => {
        console.error("Failed to fetch news:", err);
        setNews([])
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
      <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 mt-12">
          {/* EsraMC Logo */}
          <img
            src="https://i.postimg.cc/dVxd8gtY/logo-esrasmp-full.png"
            alt="EsraMC"
            className="w-auto h-40 sm:h-48 md:h-56 lg:h-64 mx-auto mb-8 animate-float drop-shadow-[0_0_20px_rgba(58,167,227,0.8)]"
          />
          
          {/* Play Now Button */}
          <button
            onClick={handleCopy}
            className="px-8 py-4 bg-linear-to-r from-sky-blue to-light-blue text-white font-pixel text-sm rounded-lg hover:scale-105 shadow-[0_0_30px_rgba(58,167,227,0.4)] hover:shadow-[0_0_50px_rgba(58,167,227,0.8)] transition-all duration-300"
          >
            {copied ? 'SERVER IP COPIED!' : '🎮 PLAY NOW'}
          </button>
          
          {copied && (
            <p className="mt-4 text-light-blue font-pixel text-xs animate-bounce-in">
              mc.esramc.fun
            </p>
          )}
        </div>
      </div>

      {/* ═══════════════════ WELCOME CARD ═══════════════════ */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-dark-blue border border-sky-blue/20 rounded-2xl p-8 sm:p-12 text-center shadow-[0_0_40px_rgba(58,167,227,0.1)]">
            <h2 className="font-pixel text-lg sm:text-xl text-white mb-6">
              Welcome to EsraMC
            </h2>
            <p className="text-gray-300 text-base sm:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
              Start your adventure on our brand new SMP server. Explore, build, and survive in our friendly community.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleCopy}
                className="px-6 py-3 bg-sky-blue text-white font-pixel text-sm rounded-lg hover:bg-light-blue transition-colors duration-300"
              >
                Play Now
              </button>
              <a
                href="https://discord.gg/wBNMMj2PE4"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-pink-accent text-white font-pixel text-sm rounded-lg hover:scale-105 transition-all duration-300"
              >
                Join Discord
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ LATEST NEWS ═══════════════════ */}
      <section className="py-16 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-pixel text-lg sm:text-xl text-sky-blue mb-4">Latest Updates</h2>
            <p className="text-gray-400 text-sm max-w-lg mx-auto">
              Stay updated with the latest server announcements and community updates.
            </p>
          </div>

          {news.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {news.map((item) => (
                <NewsCard key={item._id} news={item} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-white/5 rounded-xl bg-white/3">
              <p className="text-gray-500 font-pixel text-sm">No updates available yet.</p>
            </div>
          )}

          <div className="text-center mt-12">
            <Link 
              to="/news"
              className="inline-block px-8 py-3 bg-sky-blue/10 border border-sky-blue/30 text-sky-blue font-pixel text-xs rounded hover:bg-sky-blue/20 hover:border-sky-blue/60 transition-all duration-300"
            >
              View All Updates
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════ STORE PREVIEW ═══════════════════ */}
      <section className="py-16 px-4 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-pixel text-lg sm:text-xl text-sky-blue mb-4">Support the Server</h2>
          <p className="text-gray-400 text-base mb-8 max-w-2xl mx-auto">
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
                src="https://i.postimg.cc/3JjMvMM7/ezramc-logo.png"
                alt="EsraMC"
                className="h-8 w-auto"
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