import { useState, useEffect } from 'react';
import { fetchActiveNews } from '../api';
import NewsPost from '../components/NewsPost';
import Navbar from '../components/Navbar';
import Particles from '../components/Particles';

const NewsPage = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      const data = await fetchActiveNews();
      setNews(data);
    } catch (err) {
      setError('Failed to load news: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 min-h-screen bg-dark-bg text-white">
      <Particles className="absolute inset-0 z-0 opacity-20" />
      <Navbar />

      <main className="relative z-10 pt-24 pb-12 px-4 max-w-7xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-pixel text-transparent bg-clip-text bg-linear-to-r from-sky-blue to-white drop-shadow-[0_0_15px_rgba(58,167,227,0.5)] mb-4">
            LATEST UPDATES
          </h1>
          <p className="text-gray-400 font-pixel text-sm md:text-base max-w-2xl mx-auto">
            Stay tuned with the latest announcements, updates, and events happening on EsraMC.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-sky-blue font-pixel animate-pulse">Loading updates...</div>
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500 font-pixel">
            {error}
          </div>
        ) : news.length === 0 ? (
            <div className="text-center py-20">
            <span className="text-6xl block mb-4">📰</span>
            <p className="text-gray-500 font-pixel">No news available at the moment.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8">
            {news.map((item) => (
              <NewsPost key={item._id} news={item} isPreview={false} />
            ))}
          </div>
        )}
      </main>

      <footer className="py-8 border-t border-white/10 mt-12 text-center text-gray-500 text-xs font-pixel">
        &copy; 2026 EsraMC.
      </footer>
    </div>
  );
};

export default NewsPage;