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
import PiggyBank from './pages/PiggyBank';
import PiggyBankWidget from './components/PiggyBankWidget';
import { useEffect, useState } from 'react';

export default function App() {
  const [activeUser, setActiveUser] = useState(localStorage.getItem('active_user') || 'Aneesh');

  useEffect(() => {
    if (activeUser === 'Pragya') {
      document.body.classList.add('theme-pink');
    } else {
      document.body.classList.remove('theme-pink');
    }
  }, [activeUser]);

  const switchUser = () => {
    const newUser = activeUser === 'Aneesh' ? 'Pragya' : 'Aneesh';
    localStorage.setItem('active_user', newUser);
    setActiveUser(newUser);
    window.location.reload();
  };

  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="app-shell">
          {/* Mobile Top Header */}
          <div className="mobile-header">
            <div className="">
              <img src="/Favicon.png" alt="Jarvis logo" width={35} height={35} style={{ objectFit: 'contain' }} />
            </div>
            <span>Jarvis</span>
            <button
              className="mobile-user-avatar"
              onClick={switchUser}
              title={`Switch from ${activeUser}`}
            >
              {activeUser[0]}
            </button>
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
              <Route path="/piggy-bank" element={<PiggyBank />} />
            </Routes>
          </main>
          <PiggyBankWidget />
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
