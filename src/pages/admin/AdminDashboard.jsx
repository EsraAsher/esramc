import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminProducts from './AdminProducts';
import AdminCollections from './AdminCollections';
import AdminTickets from './AdminTickets';
import AdminAnalytics from './AdminAnalytics';
import AdminVotingLinks from './AdminVotingLinks';
import AdminReferrals from './AdminReferrals';
import AdminPayouts from './AdminPayouts';
import AdminMOTD from './AdminMOTD';

const tabs = [
  { id: 'analytics', label: 'Analytics', icon: '💰' },
  { id: 'motd', label: 'MOTD', icon: '🔥' },
  { id: 'products', label: 'Products', icon: '📦' },
  { id: 'collections', label: 'Collections', icon: '🗂️' },
  { id: 'tickets', label: 'Tickets', icon: '🎫' },
  { id: 'voting', label: 'Voting Links', icon: '🗳️' },
  { id: 'referrals', label: 'Referrals', icon: '🤝' },
  { id: 'payouts', label: 'Payouts', icon: '💸' },
];

const AdminDashboard = () => {
  const { admin, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');

  return (
    <main className="relative z-10 pt-20 pb-12 px-4 md:px-6 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="font-pixel text-lg sm:text-2xl text-red-400 drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]">
            ADMIN PANEL
          </h1>
          <p className="text-gray-500 text-sm mt-1">Welcome, {admin?.displayName || admin?.discordId || admin?.username || 'Admin'}</p>
        </div>
        <button
          onClick={logout}
          className="self-start md:self-auto px-4 py-2 font-pixel text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
        >
          LOGOUT
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 font-pixel text-xs rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-red-500/20 border border-red-500/50 text-red-400 shadow-[0_0_10px_rgba(255,0,0,0.2)]'
                : 'bg-dark-surface border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'analytics' && <AdminAnalytics />}
      {activeTab === 'motd' && <AdminMOTD />}
      {activeTab === 'products' && <AdminProducts />}
      {activeTab === 'collections' && <AdminCollections />}
      {activeTab === 'tickets' && <AdminTickets />}
      {activeTab === 'voting' && <AdminVotingLinks />}
      {activeTab === 'referrals' && <AdminReferrals />}
      {activeTab === 'payouts' && <AdminPayouts />}
    </main>
  );
};

export default AdminDashboard;
