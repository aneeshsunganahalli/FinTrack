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
  { to: '/ai', icon: Bot, label: 'AI Insights' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Wallet size={17} color="#fff" strokeWidth={2.5} />
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

      <div style={{ marginTop: 'auto', padding: '14px 18px 0', borderTop: '1.5px solid var(--border)' }}>
        <p style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.8, textTransform: 'uppercase', letterSpacing: '1px' }}>
          FinTrack v1.0 · All data stored locally
        </p>
      </div>
    </nav>
  );
}
