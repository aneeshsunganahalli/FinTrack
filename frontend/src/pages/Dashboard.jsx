import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, PiggyBank, Target, Calendar } from 'lucide-react';
import { getDashboard } from '../lib/api';
import { fmt, fmtDate, CHART_COLORS } from '../lib/utils';
import Spinner from '../components/Spinner';
import RecentTransactions from '../components/RecentTransactions';
import ExpenseViabilityCalc from '../components/ExpenseViabilityCalc';

function StatCard({ label, value, sub, subColor, icon: Icon, accent, borderColor }) {
  const dynamicStyle = {};
  if (accent) {
    dynamicStyle.borderColor = 'var(--accent-border)';
    dynamicStyle.background = 'var(--accent-glow)';
  }
  if (borderColor) {
    dynamicStyle.borderColor = borderColor;
  }
  return (
    <div className="stat-card" style={dynamicStyle}>
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
  const invest = data.investments || { total_invested: 0, total_current: 0, gain_loss: 0, stocks: { current: 0 }, mutual_funds: { current: 0 } };

  const allocationData = [
    { name: 'Stocks', value: invest.stocks?.current || 0 },
    { name: 'Mutual Funds', value: invest.mutual_funds?.current || 0 }
  ].filter(a => a.value > 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome Back</h1>
          <p className="page-subtitle">Your financial briefing for today.</p>
        </div>
      </div>

      {/* Low balance alerts */}
      {data.low_balance_alerts && data.low_balance_alerts.length > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: 22, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Low balance:</strong>{' '}
            {data.low_balance_alerts.map(a => `${a.name} (${fmt(a.balance)})`).join(', ')}
          </div>
        </div>
      )}

      {/* SECTION: Cashflow & Expenses */}
      <h2 className="section-title" style={{ marginTop: 10, marginBottom: 16 }}>Cashflow</h2>
      <div className="grid-3" style={{ marginBottom: 22 }}>
        <StatCard label="Total Cash Balance" value={fmt(data.total_balance)} sub="Across all accounts" icon={Wallet} accent />
        <StatCard
          label="This Month Income"
          value={fmt(data.this_month_income)}
          sub={`Savings: ${fmt(data.this_month_income - data.this_month_spend)}`}
          subColor={data.this_month_income - data.this_month_spend >= 0 ? 'var(--green)' : 'var(--red)'}
          icon={TrendingUp}
        />
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
      </div>

      <div className="grid-2" style={{ marginBottom: 40 }}>
        {/* Pie */}
        <div className="card">
          <h3 className="section-title">Spend by Category (This Month)</h3>
          {!data.category_spend || data.category_spend.length === 0 ? (
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
              <Bar dataKey="income" name="Income" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="var(--red)" radius={[3, 3, 0, 0]} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION: Wealth & Investments */}
      <h2 className="section-title" style={{ marginBottom: 16 }}>Wealth & Investments</h2>
      <div className="grid-3" style={{ marginBottom: 22 }}>
        <StatCard
          label="Portfolio Value"
          value={fmt(invest.total_current)}
          sub={
            <span style={{ color: invest.gain_loss >= 0 ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', gap: 3 }}>
              {invest.gain_loss >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {invest.gain_loss >= 0 ? '+' : ''}{fmt(invest.gain_loss)} P&L
            </span>
          }
          icon={PiggyBank}
          borderColor={invest.gain_loss >= 0 ? 'var(--accent-border)' : 'rgba(232, 72, 85, 0.4)'}
        />
        <StatCard
          label="Total Invested"
          value={fmt(invest.total_invested)}
          icon={Target}
        />
        <StatCard
          label="SIPs This Month"
          value={data.sip_calendar?.length || 0}
          sub="Automatically recorded"
          icon={Calendar}
        />
      </div>

      <div className="grid-2" style={{ marginBottom: 40 }}>
        {/* Allocation Pie */}
        <div className="card">
          <h3 className="section-title">Asset Allocation</h3>
          {allocationData.length === 0 ? (
            <div className="empty-state" style={{ padding: '36px 0' }}>
              <span className="empty-text">No active investments</span>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={allocationData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {allocationData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: 8, justifyContent: 'center' }}>
                {allocationData.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                    <div className="color-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* SIP Calendar */}
        <div className="card">
          <h3 className="section-title">Upcoming SIPs</h3>
          {!data.sip_calendar || data.sip_calendar.length === 0 ? (
            <div className="empty-state" style={{ padding: '36px 0' }}>
              <span className="empty-text">No SIPs scheduled</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.sip_calendar.map((sip, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-input)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--accent-border)', borderRadius: 8, width: 40, height: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                      <span style={{ fontSize: 10, textTransform: 'uppercase', opacity: 0.8, marginBottom: -2 }}>{new Date(sip.date).toLocaleString('default', { month: 'short' })}</span>
                      {new Date(sip.date).getDate()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{sip.fund_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sip.platform || 'Mutual Fund'}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent)' }}>
                    {fmt(sip.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
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
