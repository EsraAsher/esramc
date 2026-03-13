import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { fetchCollections } from '../api';

const Navbar = ({ username }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [collections, setCollections] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const mobileDropdownRef = useRef(null);
  const { cartCount, setCartOpen, justAdded } = useCart();
  const location = useLocation();
  const isHomepage = location.pathname === '/';

  // Check if we're on the store or a store-related page
  const isStorePage = location.pathname === '/store' || location.pathname.startsWith('/collection/');

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  // Scroll detection for blur effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetchCollections()
      .then(setCollections)
      .catch(() => setCollections([]));
  }, []);

  // Close mobile dropdown when clicking outside (non-store pages)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileDropdownRef.current && mobileDropdownRef.current.contains(e.target)) return;
      setMoreOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const handleServerCopy = async () => {
    const serverIp = 'play.esramc.com';
    try {
      await navigator.clipboard.writeText(serverIp);
    } catch {
      const tempInput = document.createElement('input');
      tempInput.value = serverIp;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
    }
    setServerModalOpen(true);
  };

  /* ═══════════════════ STORE NAVBAR ═══════════════════ */
  if (isStorePage) {
    return (
      <>
        <nav className={`fixed w-full z-40 top-0 left-0 p-3 sm:p-4 md:p-6 transition-all duration-300 ${scrolled ? 'bg-dark-bg/70 backdrop-blur-md shadow-[0_2px_20px_rgba(0,0,0,0.5)]' : 'bg-transparent'}`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Left - Hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="text-gray-300 hover:text-red-400 transition-colors p-1"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Right - Username + Cart */}
            <div className="flex items-center gap-2 sm:gap-4">
              {username && (
                <span className="hidden sm:inline-block text-red-400 font-mono text-xs border border-red-500/30 px-3 py-1 rounded bg-black/50">
                  <span className="text-gray-400 mr-2">User:</span>
                  {username}
                </span>
              )}
              <button
                onClick={() => setCartOpen(true)}
                className={`font-pixel text-[10px] sm:text-xs px-3 py-1.5 sm:px-4 sm:py-2 rounded transition-all duration-300 ${
                  justAdded
                    ? 'bg-sky-blue text-black shadow-[0_0_20px_rgba(58,167,227,0.6)] scale-110'
                    : 'bg-sky-blue text-black hover:bg-white'
                }`}
              >
                CART ({cartCount})
              </button>
            </div>
          </div>
        </nav>

        {/* Off-canvas backdrop */}
        <div
          className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setDrawerOpen(false)}
        />

        {/* Off-canvas drawer */}
        <aside
          className={`fixed top-0 left-0 z-50 h-full w-72 sm:w-80 bg-dark-surface border-r border-white/10 shadow-[5px_0_30px_rgba(0,0,0,0.5)] transform transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <Link
              to="/"
              onClick={() => setDrawerOpen(false)}
              className="font-pixel text-xs text-gray-300 hover:text-sky-blue transition-colors"
            >
              HOME
            </Link>
            <button
              onClick={() => setDrawerOpen(false)}
              className="text-gray-400 hover:text-white transition-colors p-1"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer navigation */}
          <nav className="flex flex-col py-4 overflow-y-auto h-[calc(100%-65px)]">
            {/* Main links */}
            <Link
              to="/store"
              className="px-6 py-3.5 text-gray-300 hover:text-white hover:bg-sky-blue/10 transition-all font-pixel text-sm border-l-2 border-transparent hover:border-sky-blue"
              onClick={() => setDrawerOpen(false)}
            >
              🛒 STORE
            </Link>
            <Link
              to="/vote"
              className="px-6 py-3.5 text-gray-300 hover:text-white hover:bg-sky-blue/10 transition-all font-pixel text-sm border-l-2 border-transparent hover:border-sky-blue"
              onClick={() => setDrawerOpen(false)}
            >
              🗳️ VOTE
            </Link>

            {/* Collections divider */}
            {collections.length > 0 && (
              <>
                <div className="px-6 pt-5 pb-2">
                  <span className="font-pixel text-[10px] text-gray-500 tracking-widest uppercase">Collections</span>
                </div>
                {collections.map((col) => (
                  <Link
                    key={col._id}
                    to={`/collection/${col.slug}`}
                    className={`px-6 py-3 text-sm transition-all font-pixel border-l-2 ${
                      location.pathname === `/collection/${col.slug}`
                        ? 'text-sky-blue bg-sky-blue/10 border-sky-blue'
                        : 'text-gray-400 hover:text-white hover:bg-sky-blue/10 border-transparent hover:border-sky-blue'
                    }`}
                    onClick={() => setDrawerOpen(false)}
                  >
                    {col.name.toUpperCase()}
                  </Link>
                ))}
              </>
            )}

            {/* Other links divider */}
            <div className="px-6 pt-5 pb-2">
              <span className="font-pixel text-[10px] text-gray-500 tracking-widest uppercase">More</span>
            </div>
            <Link
              to="/help"
              className="px-6 py-3.5 text-gray-300 hover:text-white hover:bg-sky-blue/10 transition-all font-pixel text-sm border-l-2 border-transparent hover:border-sky-blue"
              onClick={() => setDrawerOpen(false)}
            >
              🎫 HELP
            </Link>
            <a
              href="https://discord.gg/wBNMMj2PE4"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 text-gray-300 hover:text-white hover:bg-sky-blue/10 transition-all font-pixel text-sm border-l-2 border-transparent hover:border-sky-blue"
              onClick={() => setDrawerOpen(false)}
            >
              💬 DISCORD ↗
            </a>
          </nav>
        </aside>
      </>
    );
  }

  /* ═══════════════════ DEFAULT NAVBAR (non-store) ═══════════════════ */
  return (
    <nav className={`${isHomepage ? 'absolute' : 'fixed'} w-full z-40 top-0 left-0 p-3 sm:p-4 md:p-6 transition-all duration-300 ${scrolled ? 'bg-dark-bg/70 backdrop-blur-md shadow-[0_2px_20px_rgba(0,0,0,0.5)]' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative md:hidden" ref={mobileDropdownRef}>
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 active:bg-white/20 transition-colors flex items-center justify-center text-gray-200"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {moreOpen && (
              <div className="absolute top-full left-0 mt-3 w-52 bg-dark-surface border border-sky-blue/30 rounded-lg shadow-[0_0_20px_rgba(58,167,227,0.15)] overflow-hidden">
                <Link to="/store" className="block px-6 py-3.5 text-gray-300 hover:text-white hover:bg-sky-blue/10 transition-all font-pixel text-sm border-b border-white/5" onClick={() => setMoreOpen(false)}>
                  🛒 STORE
                </Link>
                <Link to="/vote" className="block px-6 py-3.5 text-gray-300 hover:text-white hover:bg-sky-blue/10 transition-all font-pixel text-sm border-b border-white/5" onClick={() => setMoreOpen(false)}>
                  🗳️ VOTE
                </Link>
                <a href="https://discord.gg/wBNMMj2PE4" target="_blank" rel="noopener noreferrer" className="block px-6 py-3.5 text-gray-300 hover:text-white hover:bg-sky-blue/10 transition-all font-pixel text-sm" onClick={() => setMoreOpen(false)}>
                  💬 DISCORD ↗
                </a>
              </div>
            )}
          </div>

          {isHomepage ? (
            <div className="hidden md:block w-12" aria-hidden="true" />
          ) : (
            <Link
              to="/"
              className="hidden md:inline-flex font-pixel text-xs text-gray-300 hover:text-sky-blue transition-colors"
            >
              HOME
            </Link>
          )}
        </div>

        <div className="hidden md:flex gap-8 font-pixel text-xs text-gray-300 items-center">
          <Link to="/vote" className="hover:text-sky-blue transition-colors">VOTE</Link>
          <Link to="/store" className="hover:text-sky-blue transition-colors">STORE</Link>
          <a href="https://discord.gg/wBNMMj2PE4" target="_blank" rel="noopener noreferrer" className="hover:text-sky-blue transition-colors">DISCORD</a>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={handleServerCopy}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 active:bg-white/20 transition-colors flex items-center justify-center text-gray-200"
            aria-label="Copy server IP"
          >
            <Gamepad2 className="w-5 h-5" />
          </button>

          <a
            href="https://discord.gg/esramc"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 active:bg-white/20 transition-colors flex items-center justify-center text-gray-200"
            aria-label="Open Discord"
          >
            <img
              src="https://cdn.simpleicons.org/discord/ffffff"
              alt="Discord"
              className="w-5 h-5"
            />
          </a>
        </div>
      </div>

      {serverModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 md:hidden">
          <div className="w-full max-w-sm bg-dark-surface border border-white/10 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.45)] p-5 text-center">
            <h3 className="font-pixel text-base text-white mb-2">Server IP copied!</h3>
            <p className="text-gray-300 text-sm mb-1">Server IP: play.esramc.com</p>
            <p className="text-gray-300 text-sm mb-4">Bedrock Port: 7777</p>
            <button
              onClick={() => setServerModalOpen(false)}
              className="px-5 py-2 bg-sky-blue/10 border border-sky-blue/30 text-sky-blue font-pixel text-xs rounded hover:bg-sky-blue/20 hover:border-sky-blue/60 transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
