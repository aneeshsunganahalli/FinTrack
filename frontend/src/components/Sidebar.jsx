import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Building2, Heart,
  TrendingUp, BarChart2, Bot, Settings, Wallet, Repeat, HandCoins,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/accounts', icon: Building2, label: 'Bank Accounts' },
  { to: '/debts', icon: HandCoins, label: 'IOUs' },
  { to: '/subscriptions', icon: Repeat, label: 'Subscriptions' },
  { to: '/wishlist', icon: Heart, label: 'Wishlist' },
  { to: '/investments', icon: TrendingUp, label: 'Investments' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/ai', icon: Bot, label: 'Ollama' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="">
          <img src="/Favicon.png" alt="Jarvis logo" width={35} height={35} style={{ objectFit: 'contain' }} />
        </div>
        <span>Jarvis</span>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Navigation</div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={14} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
