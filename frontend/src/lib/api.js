import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const user = localStorage.getItem('active_user') || 'Aneesh';
  config.headers['X-User-Id'] = user;
  return config;
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboard = () => api.get('/dashboard');
export const getAnalytics = (params) => api.get('/dashboard/analytics', { params });

// ─── Transactions ─────────────────────────────────────────────────────────────
export const getTransactions = (params) => api.get('/transactions', { params });
export const createTransaction = (data) => api.post('/transactions', data);
export const createTransactionsBulk = (transactions) => api.post('/transactions/bulk', { transactions });
export const updateTransaction = (id, data) => api.patch(`/transactions/${id}`, data);
export const deleteTransaction = (id) => api.delete(`/transactions/${id}`);

// ─── Bank Accounts ────────────────────────────────────────────────────────────
export const getAccounts = () => api.get('/accounts');
export const createAccount = (data) => api.post('/accounts', data);
export const updateAccount = (id, data) => api.patch(`/accounts/${id}`, data);
export const deleteAccount = (id) => api.delete(`/accounts/${id}`);

// ─── Wishlist ─────────────────────────────────────────────────────────────────
export const getWishlist = (purchased = false) => api.get('/wishlist', { params: { purchased } });
export const createWishlistItem = (data) => api.post('/wishlist', data);
export const updateWishlistItem = (id, data) => api.patch(`/wishlist/${id}`, data);
export const deleteWishlistItem = (id) => api.delete(`/wishlist/${id}`);
export const previewUrl = (url) => api.post('/wishlist/preview-url', { url });

// ─── Investments ──────────────────────────────────────────────────────────────
export const getInvestments = () => api.get('/investments');
export const createInvestment = (data) => api.post('/investments', data);
export const updateInvestment = (id, data) => api.patch(`/investments/${id}`, data);
export const deleteInvestment = (id) => api.delete(`/investments/${id}`);
export const searchInvestments = (q) => api.get('/investments/search', { params: { q } });
export const refreshInvestmentPrices = () => api.post('/investments/refresh-prices');

// ─── Mutual Funds ─────────────────────────────────────────────────────────────
export const getMutualFunds = () => api.get('/mutual-funds');
export const createMutualFund = (data) => api.post('/mutual-funds', data);
export const updateMutualFund = (id, data) => api.patch(`/mutual-funds/${id}`, data);
export const deleteMutualFund = (id) => api.delete(`/mutual-funds/${id}`);
export const searchMutualFunds = (q) => api.get('/mutual-funds/search', { params: { q } });
export const getMutualFundInfo = (schemeCode) => api.get(`/mutual-funds/info/${schemeCode}`);
export const refreshMutualFundPrices = () => api.post('/mutual-funds/refresh-prices');

export const getMutualFundTransactions = (fundId) => api.get(`/mutual-funds/${fundId}/transactions`);
export const createMutualFundTransaction = (fundId, data) => api.post(`/mutual-funds/${fundId}/transactions`, data);
export const deleteMutualFundTransaction = (fundId, txId) => api.delete(`/mutual-funds/${fundId}/transactions/${txId}`);

// ─── Subscriptions ────────────────────────────────────────────────────────────
export const getSubscriptions = () => api.get('/subscriptions');
export const createSubscription = (data) => api.post('/subscriptions', data);
export const updateSubscription = (id, data) => api.patch(`/subscriptions/${id}`, data);
export const deleteSubscription = (id) => api.delete(`/subscriptions/${id}`);
export const testProcessSubscriptions = () => api.post('/subscriptions/test-process');

// ─── Categories ───────────────────────────────────────────────────────────────
export const getCategories = () => api.get('/categories');
export const createCategory = (data) => api.post('/categories', data);
export const updateCategory = (id, data) => api.patch(`/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);

// ─── Settings ─────────────────────────────────────────────────────────────────
export const getSettings = () => api.get('/settings');
export const saveSettings = (settings) => api.post('/settings', { settings });

// ─── LLM ──────────────────────────────────────────────────────────────────────
export const getLLMStatus = () => api.get('/llm/status');
export const chatWithLLM = (message, include_summary = true) =>
  api.post('/llm/chat', { message, include_summary });

// ─── Import ───────────────────────────────────────────────────────────────────
export const previewTransactionsCSV = (file) => {
  const fd = new FormData(); fd.append('file', file);
  return api.post('/import/preview/transactions', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const commitTransactionsCSV = (file) => {
  const fd = new FormData(); fd.append('file', file);
  return api.post('/import/commit/transactions', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const commitAccountsCSV = (file) => {
  const fd = new FormData(); fd.append('file', file);
  return api.post('/import/commit/accounts', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const commitInvestmentsCSV = (file) => {
  const fd = new FormData(); fd.append('file', file);
  return api.post('/import/commit/investments', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// ─── Debts / IOUs ─────────────────────────────────────────────────────────────
export const getDebts = (params) => api.get('/debts', { params });
export const createDebt = (data) => api.post('/debts', data);
export const updateDebt = (id, data) => api.patch(`/debts/${id}`, data);
export const deleteDebt = (id) => api.delete(`/debts/${id}`);
export const markDebtPaid = (id) => api.post(`/debts/${id}/mark-paid`);
