import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchNewsBySlug } from '../api';
import Navbar from '../components/Navbar';
import Particles from '../components/Particles';
import NewsPost from '../components/NewsPost';

const NewsPostPage = () => {
  const { slug } = useParams();
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadNews();
  }, [slug]);

  const loadNews = async () => {
    try {
      const data = await fetchNewsBySlug(slug);
      setNews(data);
    } catch (err) {
      setError(err.message || 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 min-h-screen bg-dark-bg text-white">
      <Particles className="fixed inset-0 z-0 opacity-10 pointer-events-none" />
      <Navbar />

      <main className="relative z-10 pt-24 pb-20 px-4 max-w-7xl mx-auto">
        <div className="mb-8">
          <Link to="/news" className="inline-flex items-center text-sky-blue hover:text-white transition-colors font-pixel text-sm">
            &larr; Back to all news
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-sky-blue font-pixel animate-pulse">Loading post...</div>
          </div>
        ) : error || !news ? (
          <div className="text-center py-20">
            <h1 className="text-4xl font-pixel text-red-500 mb-4">Error 404</h1>
            <p className="text-gray-400 mb-8">{error || 'Post not found'}</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <NewsPost news={news} isPreview={false} />
          </div>
        )}
      </main>

      <footer className="py-8 border-t border-white/10 mt-12 text-center text-gray-500 text-xs font-pixel">
        &copy; 2026 EsraMC.
      </footer>
    </div>
  );
};

export default NewsPostPage;