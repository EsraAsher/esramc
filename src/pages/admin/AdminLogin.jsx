import { getAdminDiscordAuthUrl } from '../../api';

const AdminLogin = () => {
  return (
    <main className="relative z-10 min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-dark-surface border border-red-500/20 rounded-2xl p-8 shadow-[0_0_40px_rgba(255,0,0,0.1)]">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔒</span>
            </div>
            <h1 className="font-pixel text-xl text-red-400 drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]">
              ADMIN ACCESS
            </h1>
          </div>

          <div className="space-y-5">
            <button
              type="button"
              onClick={() => {
                window.location.href = getAdminDiscordAuthUrl();
              }}
              className="w-full py-3 font-pixel text-xs rounded-lg transition-all duration-300 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/30"
            >
              SIGN IN WITH DISCORD
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AdminLogin;
