import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

const NewsCard = ({ news }) => {
  const { title, summary, image, author, createdAt, slug } = news;
  
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    dateStyle: 'long'
  });

  return (
    <div className="bg-dark-surface border border-white/10 rounded-xl overflow-hidden shadow-lg hover:shadow-sky-blue/10 hover:border-sky-blue/30 transition-all duration-300 flex flex-col h-full group">
      {/* Optional Image Banner */}
      {image && (
        <div className="h-48 w-full overflow-hidden relative">
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-linear-to-t from-dark-surface to-transparent opacity-60"></div>
        </div>
      )}

      <div className="p-6 flex flex-col grow relative">
        {/* Title */}
        <h3 className="font-pixel text-lg md:text-xl text-white mb-3 group-hover:text-sky-blue transition-colors">
          {title}
        </h3>
        
        {/* Short Description */}
        <p className="text-gray-400 text-sm mb-6 grow leading-relaxed">
          {summary}
        </p>
        
        {/* Meta Section */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
          {/* Author */}
          <div className="flex items-center gap-3">
            <img 
              src={`https://mc-heads.net/avatar/${author}`} 
              alt={author}
              className="w-8 h-8 rounded bg-dark-bg"
              onError={(e) => { e.target.src = `https://mc-heads.net/avatar/Steve` }}
            />
            <div className="flex flex-col">
              <span className="text-xs text-sky-blue font-pixel">{author}</span>
              <span className="text-[10px] text-gray-500">{formattedDate}</span>
            </div>
          </div>

          {/* Read More Button */}
          <Link 
            to={`/news/${slug}`}
            className="px-4 py-2 bg-sky-blue/10 hover:bg-sky-blue/20 text-sky-blue text-xs font-pixel rounded transition-colors border border-sky-blue/20 hover:border-sky-blue/50"
          >
            Read More
          </Link>
        </div>
      </div>
    </div>
  );
};

NewsCard.propTypes = {
  news: PropTypes.shape({
    title: PropTypes.string.isRequired,
    summary: PropTypes.string.isRequired,
    image: PropTypes.string,
    author: PropTypes.string.isRequired,
    createdAt: PropTypes.string.isRequired,
    slug: PropTypes.string.isRequired,
  }).isRequired,
};

export default NewsCard;