import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { getAnalytics, getDashboard } from '../lib/api';
import { fmt, CHART_COLORS } from '../lib/utils';
import Spinner from '../components/Spinner';

const PERIODS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_3', label: 'Last 3 Months' },
  { value: 'all', label: 'All Time' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
      {label && <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || 'var(--text-primary)', fontWeight: 600 }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [period, setPeriod] = useState('this_month');
  const [analytics, setAnalytics] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getAnalytics({ period }), getDashboard()])
      .then(([ar, dr]) => {
        setAnalytics(ar.data);
        setTrend(dr.data.monthly_trend || []);
      })
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Visual breakdown of your finances</p>
        </div>
        <div className="tabs">
          {PERIODS.map(p => (
            <button key={p.value} className={`tab ${period === p.value ? 'active' : ''}`} onClick={() => setPeriod(p.value)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spinner size={32} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Pie chart */}
          <div className="grid-2">
            <div className="card">
              <h3 className="section-title">Spend by Category</h3>
              {analytics?.category_spend?.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <span className="empty-text">No expense data for this period</span>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={analytics?.category_spend}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%" cy="50%"
                        innerRadius={70} outerRadius={110}
                        paddingAngle={3}
                      >
                        {analytics?.category_spend?.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {analytics?.category_spend?.map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="color-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{c.category}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(c.amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Top categories table */}
            <div className="card">
              <h3 className="section-title">Category Breakdown</h3>
              {analytics?.category_spend?.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <span className="empty-text">No data yet</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                  {analytics?.category_spend
                    ?.slice()
                    .sort((a, b) => b.amount - a.amount)
                    .map((c, i) => {
                      const total = analytics.category_spend.reduce((s, x) => s + x.amount, 0);
                      const pct = total > 0 ? (c.amount / total) * 100 : 0;
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="color-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                              {c.category}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{pct.toFixed(1)}%</span>
                          </div>
                          <div className="progress-bar-wrap">
                            <div className="progress-bar" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Monthly trend line chart */}
          <div className="card">
            <h3 className="section-title">Monthly Income vs Expense</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="income" name="Income" stroke="var(--accent)" strokeWidth={2.5} dot={{ fill: 'var(--accent)', strokeWidth: 0, r: 4 }} />
                <Line type="monotone" dataKey="expense" name="Expense" stroke="var(--red)" strokeWidth={2.5} dot={{ fill: 'var(--red)', strokeWidth: 0, r: 4 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
