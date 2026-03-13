import { Link } from 'react-router-dom';
import { Eye, MessageSquare } from 'lucide-react';

const NewsPost = ({ news, isPreview = true }) => {
  const { title, content, summary, author, createdAt, slug, views, commentsCount } = news;

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const contentToShow = isPreview ? summary : content;
  const previewText = String(contentToShow || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  return (
    <div
      className={`bg-dark-blue border border-white/10 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.28)] w-full max-w-275 mx-auto overflow-hidden ${
        isPreview ? 'min-h-30 max-h-55' : ''
      }`}
    >
      <div className={`p-4 md:p-5 ${isPreview ? 'h-full flex flex-col' : ''}`}>
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-2 md:gap-4 mb-3">
          <h2 className={`font-pixel text-white mb-0 ${isPreview ? 'text-lg md:text-xl' : 'text-2xl md:text-3xl'}`}>
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
          <p className="text-gray-300 text-sm md:text-base leading-relaxed line-clamp-2">
            {previewText}
          </p>
        ) : (
          <div
            className="prose prose-invert prose-sm md:prose-base max-w-none text-gray-300 leading-relaxed prose-headings:text-white prose-headings:font-pixel prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-300 prose-strong:text-white prose-em:text-gray-200 prose-a:text-sky-blue hover:prose-a:text-light-blue prose-ul:my-3 prose-ol:my-3 prose-li:my-1"
            dangerouslySetInnerHTML={{ __html: contentToShow }}
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
