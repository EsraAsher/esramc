const API_BASE = import.meta.env.VITE_API_URL
  || (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? '/api'
    : 'https://esramc-api.onrender.com/api');

const ACTIVE_NEWS_CACHE_TTL_MS = 60 * 1000;
const activeNewsCache = new Map();
const activeNewsInFlight = new Map();

// ─── Helper ───────────────────────────────────────────────
async function request(url, options = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  } catch {
    throw new Error('Cannot connect to server. Make sure the backend is running on port 5000.');
  }

  // Handle empty responses (e.g. server crash, proxy not connected)
  const text = await res.text();
  if (!text) {
    throw new Error('Server returned an empty response. Check the backend is running.');
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Server returned invalid response. Check the backend logs.');
  }

  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ─── Public ───────────────────────────────────────────────
export const fetchHomepageProducts = () => request('/products/homepage');
export const fetchProducts = (params = '') => request(`/products${params ? `?${params}` : ''}`);
export const fetchProduct = (id) => request(`/products/${id}`);
export const fetchCollections = () => request('/collections');
export const fetchCollectionBySlug = (slug) => request(`/collections/${slug}`);

// ─── Admin Auth ───────────────────────────────────────────
export const getAdminDiscordAuthUrl = () => `${API_BASE}/admin/auth/discord`;

export const adminVerify = () => request('/admin/me');

// ─── Admin Products ───────────────────────────────────────
export const fetchAllProducts = () => request('/products/admin/all');

export const createProduct = (data) =>
  request('/products', { method: 'POST', body: JSON.stringify(data) });

export const updateProduct = (id, data) =>
  request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteProduct = (id) =>
  request(`/products/${id}`, { method: 'DELETE' });

export const toggleProduct = (id) =>
  request(`/products/${id}/toggle`, { method: 'PATCH' });

// ─── Admin Collections ───────────────────────────────────
export const fetchAllCollections = () => request('/collections/admin/all');

export const createCollection = (data) =>
  request('/collections', { method: 'POST', body: JSON.stringify(data) });

export const updateCollection = (id, data) =>
  request(`/collections/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteCollection = (id) =>
  request(`/collections/${id}`, { method: 'DELETE' });

// ─── Analytics ────────────────────────────────────────────
export const fetchAnalyticsOverview = () => request('/analytics/overview');
export const fetchAnalyticsProducts = () => request('/analytics/products');
export const fetchRecentOrders = () => request('/analytics/recent-orders');
export const fetchRevenueAnalytics = () => request('/analytics/revenue');
export const fetchSalesLogs = () => request('/analytics/sales');

// ─── Store Code ───────────────────────────────────────────
export const verifyStoreCode = (username, code) =>
  request('/storecode/verify', {
    method: 'POST',
    body: JSON.stringify({ username, code }),
  });

export const validateReferralCode = (code) =>
  request(`/referrals/validate-code/${encodeURIComponent(code)}`);

// ─── Payments (Razorpay) ──────────────────────────────────
export const createPaymentOrder = (mcUsername, email, items, storeCode, referralCode) =>
  request('/payments/create-order', {
    method: 'POST',
    body: JSON.stringify({ mcUsername, email, items, storeCode, ...(referralCode ? { referralCode } : {}) }),
  });

// verifyPayment REMOVED — frontend must NEVER confirm payment status.
// Only Razorpay webhook can mark orders as paid.

export const getOrderStatus = (orderId) => request(`/payments/order/${orderId}`);

// ─── Support Tickets ──────────────────────────────────────
export const createTicket = (email, username, category, message) =>
  request('/tickets/create', {
    method: 'POST',
    body: JSON.stringify({ email, username, category, message }),
  });

export const fetchAdminTickets = () => request('/tickets/admin');

export const updateTicketStatus = (id, status) =>
  request(`/tickets/admin/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

// ─── Voting Sites ─────────────────────────────────────────
export const fetchVotingSites = () => request('/voting');
export const fetchAllVotingSites = () => request('/voting/admin/all');

export const createVotingSite = (data) =>
  request('/voting', { method: 'POST', body: JSON.stringify(data) });

export const updateVotingSite = (id, data) =>
  request(`/voting/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const toggleVotingSite = (id) =>
  request(`/voting/${id}/toggle`, { method: 'PATCH' });

export const deleteVotingSite = (id) =>
  request(`/voting/${id}`, { method: 'DELETE' });

// ─── Referral Program ─────────────────────────────────────
export const submitReferralApplication = (data) =>
  request('/referrals/apply', { method: 'POST', body: JSON.stringify(data) });

export const fetchAdminApplications = () => request('/referrals/admin/applications');

export const fetchAdminPartners = () => request('/referrals/admin/partners');

export const approveReferral = (id, data) =>
  request(`/referrals/admin/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const rejectReferral = (id, reviewReason = '') =>
  request(`/referrals/admin/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reviewReason }),
  });

// ─── Partner Management (S3) ─────────────────────────────
export const updatePartner = (id, data) =>
  request(`/referrals/admin/partner/${id}/update`, { method: 'PATCH', body: JSON.stringify(data) });

export const updatePartnerStatus = (id, status) =>
  request(`/referrals/admin/partner/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

export const adjustPartnerCommission = (id, amount, note = '') =>
  request(`/referrals/admin/partner/${id}/adjust-commission`, {
    method: 'PATCH',
    body: JSON.stringify({ amount, ...(note ? { note } : {}) }),
  });

export const fetchReferralAnalytics = () => request('/referrals/admin/analytics');

// ─── Payouts ──────────────────────────────────────────────
export const fetchEligiblePayouts = () => request('/payouts/eligible');
export const fetchPayoutHistory = (partnerId = '') =>
  request(`/payouts/history${partnerId ? `?partnerId=${partnerId}` : ''}`);
export const processPayout = (partnerId, amount, note = '') =>
  request('/payouts/process', {
    method: 'POST',
    body: JSON.stringify({ partnerId, amount, ...(note ? { note } : {}) }),
  });

// ─── Payout Requests (Admin) ──────────────────────────────
export const fetchPayoutRequests = (status = 'pending,processing') =>
  request(`/payouts/requests?status=${status}`);
export const markPayoutRequestProcessing = (id) =>
  request(`/payouts/requests/${id}/processing`, { method: 'PATCH' });
export const completePayoutRequest = (id, transactionId) =>
  request(`/payouts/requests/${id}/complete`, { method: 'PATCH', body: JSON.stringify({ transactionId }) });
export const rejectPayoutRequest = (id, reason = '') =>
  request(`/payouts/requests/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) });

// ─── Audit Logs (superadmin only) ────────────────────────
export const fetchAuditLogs = (params = {}) =>
  request(`/admin/audit-logs?${new URLSearchParams(params)}`);

// ─── Manual Orders (Admin) ───────────────────────────────
export const createManualOrder = (data) =>
  request('/admin/manual-orders', { method: 'POST', body: JSON.stringify(data) });

export const fetchManualOrders = (params = {}) =>
  request(`/admin/manual-orders?${new URLSearchParams(params)}`);

// ─── Settings (Admin) ────────────────────────────────────
export const fetchPublicSettings = () => request('/settings/public');
export const fetchSettings = () => request('/settings');
export const updateSettings = (data) =>
  request('/settings', { method: 'PATCH', body: JSON.stringify(data) });

// ─── Creator Dashboard ───────────────────────────────
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return !payload.exp || payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function creatorRequest(url, options = {}) {
  const token = localStorage.getItem('creator_token');
  if (token && isTokenExpired(token)) {
    localStorage.removeItem('creator_token');
    window.dispatchEvent(new Event('creator_token_expired'));
    return Promise.reject(new Error('Session expired. Please sign in again.'));
  }
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API_BASE}${url}`, { ...options, headers }).then(async (res) => {
    const text = await res.text();
    if (!text) throw new Error('Empty response');
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  });
}

export const creatorVerify = () => creatorRequest('/creator/verify');
export const fetchCreatorDashboard = () => creatorRequest('/creator/me');
export const fetchCreatorInsights = () => creatorRequest('/creator/me/insights');

// ─── Creator Payout Requests ─────────────────────────────
export const submitCreatorPayoutRequest = (data) =>
  creatorRequest('/creator/me/payout-request', { method: 'POST', body: JSON.stringify(data) });
export const fetchCreatorPayoutStatus = () =>
  creatorRequest('/creator/me/payout-request');

// ─── Announcement Bar ─────────────────────────────────────
export const fetchAnnouncement = () => request('/announcement');
export const fetchAdminAnnouncement = () => request('/announcement/admin');
export const updateAdminAnnouncement = (data) =>
  request('/announcement/admin', { method: 'PUT', body: JSON.stringify(data) });

// ─── MOTD (Limited Time Deal) ─────────────────────────────
export const fetchActiveMOTD = () => request('/motd');
export const fetchAdminMOTD = () => request('/motd/admin');
export const updateAdminMOTD = (data) =>
  request('/motd/admin', { method: 'PUT', body: JSON.stringify(data) });
export const resetMOTDStock = () =>
  request('/motd/admin/reset-stock', { method: 'POST' });

// ─── News ─────────────────────────────────────────────────
export const fetchActiveNews = (limit = 0, options = {}) => {
  const { force = false } = options;
  const cacheKey = String(limit);
  const cached = activeNewsCache.get(cacheKey);
  const isFresh = cached && Date.now() - cached.timestamp < ACTIVE_NEWS_CACHE_TTL_MS;

  if (!force && isFresh) {
    return Promise.resolve(cached.data);
  }

  if (!force && activeNewsInFlight.has(cacheKey)) {
    return activeNewsInFlight.get(cacheKey);
  }

  const requestPromise = request(`/news?limit=${limit}`)
    .then((data) => {
      activeNewsCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
      return data;
    })
    .finally(() => {
      activeNewsInFlight.delete(cacheKey);
    });

  activeNewsInFlight.set(cacheKey, requestPromise);
  return requestPromise;
};

export const preloadActiveNews = (limit = 1) => {
  fetchActiveNews(limit).catch(() => null);
};

export const fetchNewsBySlug = (slug) => request(`/news/post/${slug}`);
export const fetchAllNews = () => request('/news/admin/all');
export const createNews = (data) => request('/news', { method: 'POST', body: JSON.stringify(data) });
export const updateNews = (id, data) => request(`/news/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteNews = (id) => request(`/news/${id}`, { method: 'DELETE' });
