import { Link } from 'react-router-dom';
import { Eye, MessageSquare } from 'lucide-react';
import { getRenderedContent } from '../utils/newsUtils';

const NewsPost = ({ news, isPreview = true }) => {
  const { title, titleColor, titleSize, author, createdAt, slug, views, commentsCount } = news;

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Get rendered HTML from JSON or legacy HTML
  const renderedHtml = getRenderedContent(news);

  return (
    <div
      className={`bg-dark-blue border border-white/10 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.28)] w-full max-w-275 mx-auto overflow-hidden`}
    >
      <div className={`p-4 md:p-5 ${isPreview ? 'h-full flex flex-col' : ''}`}>
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-2 md:gap-4 mb-3">
          <h2
            className={`font-pixel text-white mb-0 ${isPreview ? 'text-lg md:text-xl' : 'text-2xl md:text-3xl'}`}
            style={{
              ...(titleColor ? { color: titleColor } : {}),
              ...(titleSize ? { fontSize: `${titleSize}px`, lineHeight: 1.2 } : {}),
            }}
          >
            {title}
          </h2>
          <div className="flex items-center gap-3 mt-2 md:mt-0 shrink-0">
            <div className="text-right">
              <p className="text-sky-400 font-pixel text-sm">{author}</p>
              <p className="text-gray-500 text-xs">{formattedDate}</p>
            </div>
            <img
              src={`https://mc-heads.net/avatar/${author}/40`}
              alt={author}
              className="w-10 h-10 rounded-md bg-dark-bg"
              onError={(e) => { e.target.src = `https://mc-heads.net/avatar/Steve/40` }}
            />
          </div>
        </div>

        <hr className="border-white/10 my-3" />

        {isPreview ? (
          <div
            className="news-content news-preview text-sm md:text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        ) : (
          <div
            className="news-content news-render-content max-w-none text-sm md:text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}

        <div className={`flex items-center justify-between gap-3 mt-3 pt-3 border-t border-white/10 ${isPreview ? 'mt-auto' : ''}`}>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {typeof views !== 'undefined' && (
              <div className="flex items-center gap-1.5">
                <Eye size={16} />
                <span>{views}</span>
              </div>
            )}
            {typeof commentsCount !== 'undefined' && (
               <div className="flex items-center gap-1.5">
                <MessageSquare size={16} />
                <span>{commentsCount}</span>
              </div>
            )}
          </div>

          {isPreview && slug && (
            <Link
              to={`/news/${slug}`}
              className="px-4 py-2 bg-sky-blue/10 hover:bg-sky-blue/20 text-sky-blue text-xs font-pixel rounded transition-colors border border-sky-blue/20 hover:border-sky-blue/50 whitespace-nowrap"
            >
              Read Full Post
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsPost;
