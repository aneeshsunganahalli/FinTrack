import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../lib/api';
import { fmt } from '../lib/utils';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import RecentTransactions from '../components/RecentTransactions';
import { useToast } from '../components/Toast';

const EMPTY = { name: '', bank_name: '', account_type: 'savings', current_balance: '', minimum_balance: '' };

function AccountForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, current_balance: parseFloat(form.current_balance) || 0, minimum_balance: parseFloat(form.minimum_balance) || 0 });
      toast('Account saved!');
      onClose();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="form-group">
        <label className="form-label">Account Name</label>
        <input className="form-input" placeholder="e.g. HDFC Savings" value={form.name} onChange={e => set('name', e.target.value)} required />
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Bank Name</label>
          <input className="form-input" placeholder="e.g. HDFC Bank" value={form.bank_name} onChange={e => set('bank_name', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Account Type</label>
          <select className="form-select" value={form.account_type} onChange={e => set('account_type', e.target.value)}>
            <option value="savings">Savings</option>
            <option value="current">Current</option>
            <option value="wallet">Wallet</option>
            <option value="credit">Credit Card</option>
          </select>
        </div>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Current Balance (₹)</label>
          <input type="number" step="0.01" className="form-input" value={form.current_balance} onChange={e => set('current_balance', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Minimum Balance (₹)</label>
          <input type="number" step="0.01" className="form-input" value={form.minimum_balance} onChange={e => set('minimum_balance', e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <Spinner size={15} /> : null} Save</button>
      </div>
    </form>
  );
}

function AccountCard({ account, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const pct = account.minimum_balance > 0 ? Math.min((account.current_balance / account.minimum_balance) * 100, 100) : 100;
  const low = account.current_balance < account.minimum_balance;
  const barColor = low ? 'var(--red)' : pct < 130 ? 'var(--yellow)' : 'var(--accent)';

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', ...(low ? { borderColor: 'rgba(232,72,85,0.4)' } : {}) }}>
      {/* Top bar */}
      {low && <div style={{ height: 3, background: 'var(--red)' }} />}
      {!low && <div style={{ height: 3, background: 'var(--accent)' }} />}

      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{account.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              {account.bank_name} · {account.account_type}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {low && <AlertTriangle size={14} color="var(--red)" />}
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(account)}><Pencil size={12} /></button>
            <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(account)}><Trash2 size={12} /></button>
          </div>
        </div>

        <div style={{ fontFamily: "'Merriweather', serif", fontSize: 30, fontWeight: 700, marginBottom: 6, color: low ? 'var(--red)' : 'var(--text-primary)' }}>
          {fmt(account.current_balance)}
        </div>

        {account.minimum_balance > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              <span>Min. {fmt(account.minimum_balance)}</span>
              <span style={{ color: barColor }}>{pct.toFixed(0)}%</span>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
            </div>
            {low && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>⚠ Below minimum balance threshold</p>}
          </>
        )}

        {/* Toggle recent transactions */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.5px', textTransform: 'uppercase' }}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          Recent Transactions
        </button>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '0 20px 16px', marginTop: 0, paddingTop: 14 }}>
          <RecentTransactions limit={4} accountId={account.id} title={null} compact />
        </div>
      )}
    </div>
  );
}

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    getAccounts().then(r => setAccounts(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data) {
    if (modal && modal.id) await updateAccount(modal.id, data);
    else await createAccount(data);
    load();
  }

  async function handleDelete(acc) {
    if (!confirm(`Delete account "${acc.name}"?`)) return;
    try { await deleteAccount(acc.id); toast('Deleted'); load(); }
    catch { toast('Failed to delete', 'error'); }
  }

  const totalBalance = accounts.reduce((s, a) => s + a.current_balance, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bank Accounts</h1>
          <p className="page-subtitle">Total: <strong style={{ color: 'var(--accent-light)' }}>{fmt(totalBalance)}</strong> across {accounts.length} accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}><Plus size={14} /> Add Account</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spinner size={28} /></div>
      ) : accounts.length === 0 ? (
        <div className="empty-state"><span className="empty-icon">🏦</span><span className="empty-text">No accounts yet</span></div>
      ) : (
        <div className="grid-3">{accounts.map(a => <AccountCard key={a.id} account={a} onEdit={setModal} onDelete={handleDelete} />)}</div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Bank Account' : 'Edit Account'} onClose={() => setModal(null)}>
          <AccountForm initial={modal === 'add' ? {} : modal} onSave={handleSave} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}
