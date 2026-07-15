import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getDashboard } from '../lib/api';
import { fmt, CHART_COLORS } from '../lib/utils';
import Spinner from '../components/Spinner';
import RecentTransactions from '../components/RecentTransactions';
import ExpenseViabilityCalc from '../components/ExpenseViabilityCalc';

function StatCard({ label, value, sub, subColor, icon: Icon, accent }) {
  return (
    <div className="stat-card" style={accent ? { borderColor: 'var(--accent-border)', background: 'var(--accent-glow)' } : {}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="stat-label">{label}</span>
        {Icon && (
          <div style={{ padding: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 4, border: '1px solid var(--border)' }}>
            <Icon size={13} color="var(--text-muted)" />
          </div>
        )}
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub" style={subColor ? { color: subColor } : {}}>{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-strong)', borderRadius: 4, padding: '9px 13px', boxShadow: 'var(--brutal-shadow)' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{payload[0].name}</p>
      <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 14, fontFamily: "'Merriweather', serif" }}>{fmt(payload[0].value)}</p>
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <Spinner size={32} />
    </div>
  );

  if (!data) return <div className="alert alert-danger">Failed to load dashboard.</div>;

  const spendDiff = data.this_month_spend - data.prev_month_spend;
  const spendPct = data.prev_month_spend > 0 ? ((spendDiff / data.prev_month_spend) * 100).toFixed(1) : 0;
  const invest = data.investments;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your financial overview</p>
        </div>
      </div>

      {/* Low balance alerts */}
      {data.low_balance_alerts.length > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: 22, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Low balance:</strong>{' '}
            {data.low_balance_alerts.map(a => `${a.name} (${fmt(a.balance)})`).join(', ')}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid-4" style={{ marginBottom: 22 }}>
        <StatCard label="Total Balance" value={fmt(data.total_balance)} sub="Across all accounts" icon={Wallet} accent />
        <StatCard
          label="This Month Spend"
          value={fmt(data.this_month_spend)}
          sub={
            <span style={{ color: spendDiff > 0 ? 'var(--red)' : 'var(--green)', display: 'flex', alignItems: 'center', gap: 3 }}>
              {spendDiff > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(spendPct)}% vs last month
            </span>
          }
          icon={TrendingDown}
        />
        <StatCard
          label="This Month Income"
          value={fmt(data.this_month_income)}
          sub={`Savings: ${fmt(data.this_month_income - data.this_month_spend)}`}
          subColor={data.this_month_income - data.this_month_spend >= 0 ? 'var(--green)' : 'var(--red)'}
          icon={TrendingUp}
        />
        <StatCard
          label="Portfolio Value"
          value={fmt(invest.total_current || invest.total_invested)}
          sub={<span style={{ color: invest.gain_loss >= 0 ? 'var(--green)' : 'var(--red)' }}>{invest.gain_loss >= 0 ? '+' : ''}{fmt(invest.gain_loss)} P&L</span>}
          icon={TrendingUp}
        />
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ marginBottom: 22 }}>
        {/* Pie */}
        <div className="card">
          <h3 className="section-title">Spend by Category — This Month</h3>
          {data.category_spend.length === 0 ? (
            <div className="empty-state" style={{ padding: '36px 0' }}>
              <span className="empty-text">No transactions this month</span>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={data.category_spend} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {data.category_spend.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8 }}>
                {data.category_spend.slice(0, 6).map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                    <div className="color-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{c.category}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(c.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bar trend */}
        <div className="card">
          <h3 className="section-title">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.monthly_trend} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="income" name="Income" fill="var(--accent)" radius={[3,3,0,0]} />
              <Bar dataKey="expense" name="Expense" fill="var(--red)" radius={[3,3,0,0]} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row: Recent Transactions + Expense Calculator */}
      <div className="grid-2">
        <div className="card">
          <RecentTransactions limit={6} title="Recent Transactions" />
        </div>
        <ExpenseViabilityCalc />
      </div>
    </div>
  );
}
