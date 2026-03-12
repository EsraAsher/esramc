import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchNewsBySlug } from '../api';
import Navbar from '../components/Navbar';
import Particles from '../components/Particles';

// Simple markdown parser or just render text with line breaks
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

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center font-pixel text-sky-blue animate-pulse">
        Loading...
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex flex-col items-center justify-center">
        <h1 className="text-4xl font-pixel text-red-500 mb-4">Error 404</h1>
        <p className="text-gray-400 mb-8">{error || 'Post not found'}</p>
        <Link to="/news" className="px-6 py-3 bg-sky-blue text-dark-bg font-pixel rounded shadow-lg hover:shadow-sky-blue/50 transition-all">
          Back to News
        </Link>
      </div>
    );
  }

  const formattedDate = new Date(news.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="relative z-10 min-h-screen bg-dark-bg text-white font-sans">
      <Particles className="fixed inset-0 z-0 opacity-10 pointer-events-none" />
      <Navbar />

      <main className="relative z-10 pt-24 pb-20 px-4 max-w-4xl mx-auto">
        <Link to="/news" className="inline-flex items-center text-sky-blue hover:text-white transition-colors mb-8 font-pixel text-sm">
          &larr; Back to News
        </Link>

        <article className="bg-dark-surface border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
          
          {/* Header Image */}
          {news.image && (
            <div className="w-full h-64 md:h-96 relative overflow-hidden">
              <img 
                src={news.image} 
                alt={news.title} 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-linear-to-t from-dark-surface to-transparent opacity-80"></div>
            </div>
          )}

          <div className="p-8 md:p-12 relative -mt-20 z-20">
            {/* Title Block */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight drop-shadow-md">
                {news.title}
              </h1>
              
              {/* Author Meta */}
              <div className="flex items-center gap-4 mt-6 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm w-fit">
                <img 
                  src={`https://mc-heads.net/avatar/${news.author}`} 
                  alt={news.author}
                  className="w-10 h-10 rounded shadow-sm bg-dark-bg"
                />
                <div>
                  <p className="text-sky-blue font-pixel text-sm">{news.author}</p>
                  <p className="text-gray-400 text-xs">{formattedDate}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-invert prose-lg max-w-none prose-headings:text-sky-blue prose-a:text-sky-blue prose-code:text-pink-400">
              {/* Use whitespace-pre-wrap to preserve newlines if standard text */}
              <div className="whitespace-pre-wrap leading-relaxed text-gray-300">
                {news.content}
              </div>
            </div>
          </div>
        </article>
      </main>

      <footer className="py-8 text-center text-gray-600 font-pixel text-xs">
        EsraMC News Portal
      </footer>
    </div>
  );
};

export default NewsPostPage;