import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getInvestments, createInvestment, updateInvestment, deleteInvestment, searchInvestments, refreshInvestmentPrices } from '../lib/api';
import { fmt, fmtDate } from '../lib/utils';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import RecentTransactions from '../components/RecentTransactions';
import { useToast } from '../components/Toast';

const EMPTY = { platform: 'Groww', instrument_name: '', amount_invested: '', units: '', date_invested: '', current_value: '', notes: '' };

function InvestmentForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const toast = useToast();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (form.instrument_name.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      searchInvestments(form.instrument_name)
        .then(r => setSearchResults(r.data))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [form.instrument_name]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        amount_invested: parseFloat(form.amount_invested) || 0,
        units: form.units ? parseFloat(form.units) : null,
        current_value: form.current_value ? parseFloat(form.current_value) : null,
      });
      toast('Investment saved!');
      onClose();
    } catch {
      toast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="grid-2">
        <div className="form-group" style={{ position: 'relative' }}>
          <label className="form-label">Instrument Name</label>
          <input className="form-input" placeholder="e.g. AAPL or Nifty" value={form.instrument_name} onChange={e => set('instrument_name', e.target.value)} required />
          {searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', zIndex: 10, borderRadius: 4, maxHeight: 150, overflowY: 'auto' }}>
              {searchResults.map(res => (
                <div key={`${res.symbol}-${res.exchange}`} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }} onClick={() => { set('instrument_name', res.symbol); setSearchResults([]); }}>
                  {res.symbol} - {res.instrument_name} ({res.exchange})
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Platform / Broker</label>
          <input className="form-input" placeholder="e.g. Zerodha" value={form.platform} onChange={e => set('platform', e.target.value)} />
        </div>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Amount Invested (₹)</label>
          <input type="number" step="0.01" className="form-input" value={form.amount_invested} onChange={e => set('amount_invested', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Current Value (₹)</label>
          <input type="number" step="0.01" className="form-input" placeholder="Leave blank if unknown" value={form.current_value} onChange={e => set('current_value', e.target.value)} />
        </div>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Units</label>
          <input type="number" step="0.0001" className="form-input" placeholder="Optional" value={form.units} onChange={e => set('units', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Date Invested</label>
          <input type="date" className="form-input" value={form.date_invested} onChange={e => set('date_invested', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <Spinner size={16} /> : null} Save Investment
        </button>
      </div>
    </form>
  );
}

export default function Investments() {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    getInvestments().then(r => setInvestments(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data) {
    if (modal && modal.id) {
      await updateInvestment(modal.id, data);
    } else {
      await createInvestment(data);
    }
    load();
  }

  async function handleDelete(inv) {
    if (!confirm(`Delete "${inv.instrument_name}"?`)) return;
    await deleteInvestment(inv.id);
    toast('Deleted');
    load();
  }

  async function handleRefresh() {
    setLoading(true);
    try {
      await refreshInvestmentPrices();
      toast('Prices updated!');
      load();
    } catch {
      toast('Failed to refresh prices', 'error');
      setLoading(false);
    }
  }

  const totalInvested = investments.reduce((s, i) => s + i.amount_invested, 0);
  const totalCurrent = investments.reduce((s, i) => s + (i.current_value || i.amount_invested), 0);
  const gainLoss = totalCurrent - totalInvested;
  const gainPct = totalInvested > 0 ? ((gainLoss / totalInvested) * 100).toFixed(2) : 0;

  const chartData = investments.map(i => ({
    name: i.instrument_name.length > 16 ? i.instrument_name.slice(0, 16) + '…' : i.instrument_name,
    invested: i.amount_invested,
    current: i.current_value || i.amount_invested,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Investments</h1>
          <p className="page-subtitle">{investments.length} holdings</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={handleRefresh} disabled={loading}>
            Refresh Prices
          </button>
          <button className="btn btn-primary" onClick={() => setModal('add')}>
            <Plus size={15} /> Add Investment
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <span className="stat-label">Total Invested</span>
          <div className="stat-value">{fmt(totalInvested)}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Current Value</span>
          <div className="stat-value">{fmt(totalCurrent)}</div>
        </div>
        <div className="stat-card" style={gainLoss >= 0 ? { borderColor: 'var(--accent-border)' } : { borderColor: 'rgba(232,72,85,0.4)' }}>
          <span className="stat-label">Overall P&L</span>
          <div className="stat-value" style={{ color: gainLoss >= 0 ? 'var(--accent-light)' : 'var(--red)' }}>
            {gainLoss >= 0 ? '+' : ''}{fmt(gainLoss)}
          </div>
          <div className="stat-sub" style={{ color: gainLoss >= 0 ? 'var(--accent-light)' : 'var(--red)' }}>
            {gainLoss >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {gainPct}%
          </div>
        </div>
      </div>

      {/* Bar chart */}
      {investments.length > 0 && (
        <div className="card" style={{ marginBottom: 28 }}>
          <h3 className="section-title">Holdings Breakdown</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [fmt(v)]} contentStyle={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-strong)', borderRadius: 4 }} />
              <Bar dataKey="invested" name="Invested" fill="#6B8FF0" radius={[3,3,0,0]} />
              <Bar dataKey="current" name="Current" fill="var(--accent)" radius={[3,3,0,0]} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table + Recent Investment Transactions */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}><Spinner size={28} /></div>
          ) : investments.length === 0 ? (
            <div className="empty-state"><span className="empty-icon">📈</span><span className="empty-text">No investments yet</span></div>
          ) : (
            <div className="table-wrap" style={{ border: 'none', borderRadius: 6 }}>
              <table>
                <thead>
                  <tr>
                    <th>Instrument</th>
                    <th>Platform</th>
                    <th style={{ textAlign: 'right' }}>Invested</th>
                    <th style={{ textAlign: 'right' }}>P&L</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {investments.map(inv => {
                    const cv = inv.current_value ?? inv.amount_invested;
                    const pl = cv - inv.amount_invested;
                    return (
                      <tr key={inv.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{inv.instrument_name}</div>
                          {inv.units && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{inv.units} units · {fmtDate(inv.date_invested)}</div>}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{inv.platform || '—'}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{fmt(inv.amount_invested)}</td>
                        <td style={{ textAlign: 'right', color: pl >= 0 ? 'var(--accent-light)' : 'var(--red)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
                          {inv.current_value ? `${pl >= 0 ? '+' : ''}${fmt(pl)}` : '—'}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal(inv)}><Pencil size={12} /></button>
                            <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(inv)}><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent investment-related transactions */}
        <div className="card">
          <RecentTransactions
            limit={7}
            title="Recent Investment Transactions"
            category="Investments"
          />
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.5, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Showing all recent transactions · Filter by category in Transactions
          </p>
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Investment' : 'Edit Investment'} onClose={() => setModal(null)}>
          <InvestmentForm initial={modal === 'add' ? {} : modal} onSave={handleSave} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}
