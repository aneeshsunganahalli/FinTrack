import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, List, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { 
  getInvestments, createInvestment, updateInvestment, deleteInvestment, searchInvestments, refreshInvestmentPrices,
  getMutualFunds, createMutualFund, updateMutualFund, deleteMutualFund, searchMutualFunds, getMutualFundInfo, refreshMutualFundPrices,
  getMutualFundTransactions, createMutualFundTransaction, deleteMutualFundTransaction, getAccounts
} from '../lib/api';
import { fmt, fmtDate } from '../lib/utils';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import RecentTransactions from '../components/RecentTransactions';
import { useToast } from '../components/Toast';

const EMPTY_INV = { platform: 'Groww', instrument_name: '', amount_invested: '', units: '', date_invested: '', current_value: '', notes: '', account_id: '' };
const EMPTY_MF = { fund_name: '', platform: 'Groww', category: 'Equity', scheme_code: '', notes: '' };
const EMPTY_MF_TX = { date: new Date().toISOString().slice(0, 10), type: 'buy', amount: '', nav: '', units: '', account_id: '' };

function guessCategoryFromName(name) {
  const n = name.toLowerCase();
  if (n.includes('liquid') || n.includes('overnight') || n.includes('money market')) return 'Liquid';
  if (n.includes('index') || n.includes('nifty') || n.includes('sensex') || n.includes('etf')) return 'Index';
  if (n.includes('hybrid') || n.includes('balanced') || n.includes('arbitrage') || n.includes('multi asset')) return 'Hybrid';
  if (n.includes('debt') || n.includes('bond') || n.includes('gilt') || n.includes('fmp') || n.includes('corporate') || n.includes('short term')) return 'Debt';
  return 'Equity';
}

function InvestmentForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_INV, ...initial });
  const [saving, setSaving] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const toast = useToast();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    getAccounts().then(r => setAccounts(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (form.instrument_name.length < 2) {
      setSearchResults([]);
      return;
    }
    let ignore = false;
    const timer = setTimeout(() => {
      setSearching(true);
      searchInvestments(form.instrument_name)
        .then(r => { if (!ignore) setSearchResults(r.data); })
        .catch(() => { if (!ignore) setSearchResults([]); })
        .finally(() => { if (!ignore) setSearching(false); });
    }, 200);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
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
        account_id: form.account_id ? parseInt(form.account_id) : null,
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
        <div className="form-group">
          <label className="form-label">Instrument Name</label>
          <input className="form-input" placeholder="e.g. AAPL or Nifty" value={form.instrument_name} onChange={e => set('instrument_name', e.target.value)} required />
          {searching && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Searching...</div>}
          {searchResults.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {searchResults.map(res => (
                <button
                  key={`${res.symbol}-${res.exchange}`}
                  type="button"
                  onClick={() => { set('instrument_name', res.symbol); setSearchResults([]); }}
                  style={{
                    padding: '4px 10px', fontSize: 11, background: 'var(--bg-input)', border: '1px solid var(--border-strong)',
                    borderRadius: 99, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <strong>{res.symbol}</strong> <span style={{ opacity: 0.8 }}>{res.instrument_name}</span>
                </button>
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
          <input type="date" className="form-input" value={form.date_invested || ''} onChange={e => set('date_invested', e.target.value)} />
        </div>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
        </div>
        {!initial?.id && (
          <div className="form-group">
            <label className="form-label">Linked Bank Account</label>
            <select className="form-select" value={form.account_id || ''} onChange={e => set('account_id', e.target.value)}>
              <option value="">-- Do not deduct --</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmt(a.current_balance)})</option>)}
            </select>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Automatically logs an expense transaction</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <Spinner size={16} /> : null} Save
        </button>
      </div>
    </form>
  );
}

function StocksTab() {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    getInvestments().then(r => setInvestments(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data) {
    if (modal && modal.id) await updateInvestment(modal.id, data);
    else await createInvestment(data);
    load();
  }

  async function handleDelete(inv) {
    setConfirmModal({
      title: 'Delete Investment',
      message: `Are you sure you want to delete "${inv.instrument_name}"?`,
      onConfirm: async () => {
        await deleteInvestment(inv.id);
        toast('Deleted');
        setConfirmModal(null);
        load();
      }
    });
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <input 
          type="text" 
          className="form-input" 
          placeholder="Search stocks..." 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          style={{ maxWidth: 250 }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={handleRefresh} disabled={loading}>Refresh Prices</button>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('add')}><Plus size={14} /> Add Stock/Direct</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <span className="stat-label">Total Invested (Stocks)</span>
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
            {gainLoss >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {gainPct}%
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
            <div className="empty-state"><span className="empty-icon">📈</span><span className="empty-text">No stocks yet</span></div>
          ) : (
            <div className="grid-2">
              {investments.filter(inv => inv.instrument_name.toLowerCase().includes(searchQuery.toLowerCase()) || (inv.platform && inv.platform.toLowerCase().includes(searchQuery.toLowerCase()))).map(inv => {
                const cv = inv.current_value ?? inv.amount_invested;
                const pl = cv - inv.amount_invested;
                const plPct = inv.amount_invested > 0 ? (pl / inv.amount_invested * 100) : 0;
                return (
                  <div key={inv.id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{inv.instrument_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{inv.platform || '—'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal(inv)}><Pencil size={13} /></button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(inv)}><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Invested</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(inv.amount_invested)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: pl >= 0 ? 'var(--accent-light)' : 'var(--red)' }}>
                          {inv.current_value ? fmt(inv.current_value) : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="card">
          <RecentTransactions limit={7} title="Recent Investment Transactions" category="Investments" />
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Stock' : 'Edit Stock'} onClose={() => setModal(null)}>
          <InvestmentForm initial={modal === 'add' ? {} : modal} onSave={handleSave} onClose={() => setModal(null)} />
        </Modal>
      )}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title} message={confirmModal.message}
          onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)}
          confirmText="Delete"
        />
      )}
    </div>
  );
}

function MutualFundForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({ 
    ...EMPTY_MF, 
    amount: '', nav: '', units: '', date: new Date().toISOString().slice(0, 10),
    ...initial 
  });
  const [saving, setSaving] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [mfSearchQuery, setMfSearchQuery] = useState('');
  const [accounts, setAccounts] = useState([]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    getAccounts().then(r => setAccounts(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (form.amount && form.nav) {
      set('units', (parseFloat(form.amount) / parseFloat(form.nav)).toFixed(4));
    }
  }, [form.amount, form.nav]);

  async function handleSearch(e) {
    if (e) e.preventDefault();
    if (mfSearchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    setSearchResults([]);
    try {
      const r = await searchMutualFunds(mfSearchQuery);
      setSearchResults(r.data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="form-group">
        <label className="form-label">Search mutual funds...</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" placeholder="e.g. HDFC Index Fund" value={mfSearchQuery} onChange={e => setMfSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch(e)} />
          <button type="button" className="btn btn-secondary" onClick={handleSearch} disabled={searching || mfSearchQuery.length < 3}>
            {searching ? '...' : 'Search'}
          </button>
        </div>
        {searchResults.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, maxHeight: 180, overflowY: 'auto', background: 'var(--bg-input)', padding: 8, borderRadius: 6, border: '1px solid var(--border)' }}>
            {searchResults.map(res => (
              <button
                key={res.schemeCode}
                type="button"
                onClick={async () => { 
                  set('fund_name', res.schemeName); 
                  set('scheme_code', String(res.schemeCode)); 
                  set('category', guessCategoryFromName(res.schemeName));
                  setSearchResults([]); 
                  setMfSearchQuery('');
                  try {
                    const r = await getMutualFundInfo(res.schemeCode);
                    const navData = r.data;
                    if (navData.data && navData.data.length > 0) {
                      set('nav', navData.data[0].nav);
                    }
                    if (navData.meta && navData.meta.scheme_category) {
                      set('category', guessCategoryFromName(res.schemeName + ' ' + navData.meta.scheme_category));
                    }
                  } catch (e) {
                    console.error("Failed to fetch NAV", e);
                  }
                }}
                style={{
                  padding: '6px 10px', fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
                  borderRadius: 4, color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left'
                }}
              >
                <strong>{res.schemeCode}</strong> <span style={{ opacity: 0.8, marginLeft: 6 }}>{res.schemeName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Fund Name</label>
        <input className="form-input" placeholder="e.g. HDFC Index Fund" value={form.fund_name} onChange={e => set('fund_name', e.target.value)} required />
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Platform</label>
          <input className="form-input" value={form.platform} onChange={e => set('platform', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="Equity">Equity</option>
            <option value="Debt">Debt</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Index">Index</option>
            <option value="Liquid">Liquid</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <input className="form-input" value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
      </div>
      
      {!initial?.id && (
        <>
          <div style={{ marginTop: 10, marginBottom: 10, fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>Initial Investment (Optional)</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input type="number" step="0.01" className="form-input" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">NAV</label>
              <input type="number" step="0.0001" className="form-input" value={form.nav} onChange={e => set('nav', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Units</label>
              <input type="number" step="0.0001" className="form-input" value={form.units} onChange={e => set('units', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Linked Bank Account</label>
            <select className="form-select" value={form.account_id || ''} onChange={e => set('account_id', e.target.value)}>
              <option value="">-- Do not deduct --</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmt(a.current_balance)})</option>)}
            </select>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Automatically logs an expense transaction</div>
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>Save Fund</button>
      </div>
    </form>
  );
}

function MutualFundTxForm({ fundId, initialNav, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_MF_TX, nav: initialNav || '' });
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    getAccounts().then(r => setAccounts(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (form.amount && form.nav) {
      set('units', (parseFloat(form.amount) / parseFloat(form.nav)).toFixed(4));
    }
  }, [form.amount, form.nav]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave(fundId, {
      ...form,
      amount: parseFloat(form.amount),
      nav: parseFloat(form.nav),
      units: parseFloat(form.units),
      account_id: form.account_id ? parseInt(form.account_id) : null,
    });
    setSaving(false);
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Date</label>
          <input type="date" className="form-input" value={form.date} onChange={e => set('date', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="buy">Buy (SIP / Lumpsum)</option>
            <option value="sell">Sell (Redemption)</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Amount (₹)</label>
        <input type="number" step="0.01" className="form-input" value={form.amount} onChange={e => set('amount', e.target.value)} required />
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">NAV</label>
          <input type="number" step="0.0001" className="form-input" value={form.nav} onChange={e => set('nav', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Units</label>
          <input type="number" step="0.0001" className="form-input" value={form.units} onChange={e => set('units', e.target.value)} required />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Linked Bank Account</label>
        <select className="form-select" value={form.account_id || ''} onChange={e => set('account_id', e.target.value)}>
          <option value="">-- Do not link --</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmt(a.current_balance)})</option>)}
        </select>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Automatically logs an income/expense transaction</div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>Save Transaction</button>
      </div>
    </form>
  );
}

function MutualFundsTab() {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [txModal, setTxModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [expandedFundId, setExpandedFundId] = useState(null);
  const [fundTxs, setFundTxs] = useState([]);
  const [txsLoading, setTxsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    getMutualFunds().then(r => setFunds(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function loadTxs(fundId) {
    setTxsLoading(true);
    try {
      const res = await getMutualFundTransactions(fundId);
      setFundTxs(res.data);
    } catch {
      toast('Failed to load transactions', 'error');
    } finally {
      setTxsLoading(false);
    }
  }

  function handleExpand(fundId) {
    if (expandedFundId === fundId) {
      setExpandedFundId(null);
    } else {
      setExpandedFundId(fundId);
      loadTxs(fundId);
    }
  }

  async function handleSaveFund(data) {
    try {
      const fundData = { 
        fund_name: data.fund_name, 
        platform: data.platform, 
        category: data.category, 
        scheme_code: data.scheme_code, 
        notes: data.notes 
      };
      if (modal && modal.id) await updateMutualFund(modal.id, fundData);
      else {
        const res = await createMutualFund(fundData);
        if (data.amount && parseFloat(data.amount) > 0) {
          await createMutualFundTransaction(res.data.id, {
            date: data.date, 
            type: 'buy', 
            amount: parseFloat(data.amount), 
            nav: parseFloat(data.nav) || 0, 
            units: parseFloat(data.units) || 0,
            account_id: data.account_id ? parseInt(data.account_id) : null,
          });
        }
      }
      toast('Fund saved!');
      load();
    } catch {
      toast('Error saving fund', 'error');
    }
  }

  async function handleDeleteFund(fund) {
    setConfirmModal({
      title: 'Delete Mutual Fund',
      message: `Are you sure you want to delete "${fund.fund_name}"? This will also delete all its transactions.`,
      onConfirm: async () => {
        await deleteMutualFund(fund.id);
        toast('Deleted');
        setConfirmModal(null);
        if (expandedFundId === fund.id) setExpandedFundId(null);
        load();
      }
    });
  }

  async function handleSaveTx(fundId, data) {
    try {
      await createMutualFundTransaction(fundId, data);
      toast('Transaction saved!');
      load();
      if (expandedFundId === fundId) loadTxs(fundId);
    } catch {
      toast('Error saving transaction', 'error');
    }
  }

  async function handleDeleteTx(fundId, tx) {
    setConfirmModal({
      title: 'Delete Transaction',
      message: `Delete this ${tx.type} of ${fmt(tx.amount)}?`,
      onConfirm: async () => {
        await deleteMutualFundTransaction(fundId, tx.id);
        toast('Deleted');
        setConfirmModal(null);
        load();
        if (expandedFundId === fundId) loadTxs(fundId);
      }
    });
  }

  const totalInvested = funds.reduce((s, f) => s + (f.total_invested || 0), 0);
  const totalCurrent = funds.reduce((s, f) => s + (f.current_value || 0), 0);
  const gainLoss = totalCurrent - totalInvested;
  const gainPct = totalInvested > 0 ? ((gainLoss / totalInvested) * 100).toFixed(2) : 0;

  async function handleRefreshPrices() {
    setLoading(true);
    try {
      await refreshMutualFundPrices();
      toast('Prices updated!');
      load();
    } catch {
      toast('Failed to refresh prices', 'error');
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <input 
          type="text" 
          className="form-input" 
          placeholder="Search funds..." 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          style={{ maxWidth: 250 }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={handleRefreshPrices} disabled={loading}>Refresh Prices</button>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('add')}><Plus size={14} /> Add Mutual Fund</button>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <span className="stat-label">Total Invested (MFs)</span>
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
            {gainLoss >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {gainPct}%
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}><Spinner size={28} /></div>
        ) : funds.length === 0 ? (
          <div className="empty-state"><span className="empty-icon">📈</span><span className="empty-text">No mutual funds yet</span></div>
        ) : (
          <div>
            {funds.filter(f => f.fund_name.toLowerCase().includes(searchQuery.toLowerCase()) || (f.platform && f.platform.toLowerCase().includes(searchQuery.toLowerCase()))).map(fund => {
              const pl = (fund.current_value || 0) - (fund.total_invested || 0);
              const plPct = fund.total_invested > 0 ? (pl / fund.total_invested * 100) : 0;
              const isExpanded = expandedFundId === fund.id;
              
              return (
                <div key={fund.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {fund.fund_name}
                        <span className="badge badge-info" style={{ fontSize: 10 }}>{fund.category}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {fund.platform || '—'} · {fund.total_units ? fund.total_units.toFixed(3) : 0} units
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Invested</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(fund.total_invested)}</div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 100 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: pl >= 0 ? 'var(--accent-light)' : 'var(--red)' }}>
                        {fmt(fund.current_value)}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 6, marginLeft: 10 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setTxModal(fund.id)} title="Add SIP/Redemption">
                        <Plus size={14} /> SIP
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleExpand(fund.id)}>
                        <List size={14} color={isExpanded ? 'var(--accent)' : 'var(--text-primary)'} />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal(fund)}><Pencil size={14} /></button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDeleteFund(fund)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div style={{ padding: '0 20px 20px 20px', background: 'var(--bg-input)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingTop: 16 }}>
                        <h4 style={{ fontSize: 13, margin: 0, fontWeight: 600 }}>Transactions</h4>
                        {fund.xirr != null && fund.xirr !== undefined && <span className="badge badge-income" style={{ fontSize: 11 }}>XIRR: {fund.xirr.toFixed(2)}%</span>}
                      </div>
                      
                      {txsLoading ? (
                        <div style={{ padding: 20, textAlign: 'center' }}><Spinner size={20} /></div>
                      ) : fundTxs.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No transactions yet. Add a SIP or lump sum.</div>
                      ) : (
                        <table style={{ background: 'var(--bg-card)', borderRadius: 8, overflow: 'hidden' }}>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Type</th>
                              <th style={{ textAlign: 'right' }}>Amount</th>
                              <th style={{ textAlign: 'right' }}>NAV</th>
                              <th style={{ textAlign: 'right' }}>Units</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {fundTxs.map(tx => (
                              <tr key={tx.id}>
                                <td style={{ fontSize: 12 }}>{fmtDate(tx.date)}</td>
                                <td>
                                  <span className={`badge ${tx.type === 'buy' ? 'badge-income' : 'badge-expense'}`}>
                                    {tx.type.toUpperCase()}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>{fmt(tx.amount)}</td>
                                <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)' }}>₹{tx.nav}</td>
                                <td style={{ textAlign: 'right', fontSize: 13 }}>{tx.units}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeleteTx(fund.id, tx)}>
                                    <Trash2 size={12} color="var(--red)" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Mutual Fund' : 'Edit Fund'} onClose={() => setModal(null)}>
          <MutualFundForm initial={modal === 'add' ? {} : modal} onSave={handleSaveFund} onClose={() => setModal(null)} />
        </Modal>
      )}

      {txModal && (
        <Modal title="Add Transaction" onClose={() => setTxModal(null)}>
          <MutualFundTxForm fundId={txModal} initialNav={funds.find(f => f.id === txModal)?.current_nav} onSave={handleSaveTx} onClose={() => setTxModal(null)} />
        </Modal>
      )}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title} message={confirmModal.message}
          onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)}
          confirmText="Delete"
        />
      )}
    </div>
  );
}

export default function Investments() {
  const [tab, setTab] = useState('stocks'); // 'stocks' | 'mf'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Investments</h1>
          <p className="page-subtitle">Track your stocks, direct investments and mutual funds</p>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab ${tab === 'stocks' ? 'active' : ''}`} onClick={() => setTab('stocks')}>
          Stocks & Direct
        </button>
        <button className={`tab ${tab === 'mf' ? 'active' : ''}`} onClick={() => setTab('mf')}>
          Mutual Funds & SIPs
        </button>
      </div>

      {tab === 'stocks' ? <StocksTab /> : <MutualFundsTab />}
    </div>
  );
}
