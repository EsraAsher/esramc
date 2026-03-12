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

  return (
    <div className="bg-dark-surface border border-white/10 rounded-xl shadow-lg w-full max-w-275 mx-auto overflow-hidden">
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between md:items-start mb-4">
          <h2 className="font-pixel text-2xl md:text-3xl text-white mb-2 md:mb-0">{title}</h2>
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

        <hr className="border-white/10 my-4" />

        <div 
          className="prose prose-invert prose-sm md:prose-base max-w-none text-gray-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: contentToShow }}
        />

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center gap-4 text-sm text-gray-500">
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
              className="px-4 py-2 bg-sky-blue/10 hover:bg-sky-blue/20 text-sky-blue text-xs font-pixel rounded transition-colors border border-sky-blue/20 hover:border-sky-blue/50"
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
