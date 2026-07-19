import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import Sidebar from './components/Sidebar';
import { ToastProvider } from './components/Toast';
import { Wallet } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Wishlist from './pages/Wishlist';
import Investments from './pages/Investments';
import Subscriptions from './pages/Subscriptions';
import Analytics from './pages/Analytics';
import Debts from './pages/Debts';
import AIInsights from './pages/AIInsights';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="app-shell">
          {/* Mobile Top Header */}
          <div className="mobile-header">
            <div className="logo-icon">
              <img src="/Favicon.png" alt="Jarvis logo" width={20} height={20} style={{ objectFit: 'contain' }} />
            </div>
            <span>Jarvis</span>
          </div>
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/debts" element={<Debts />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/ai" element={<AIInsights />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
