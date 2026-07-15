import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, Filter, X } from 'lucide-react';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getCategories, getAccounts } from '../lib/api';
import { fmt, fmtDate } from '../lib/utils';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  amount: '',
  type: 'expense',
  category: '',
  account: '',
  note: '',
  subcategory: '',
};

function TransactionForm({ initial, categories, accounts, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || !form.date) return;
    setSaving(true);
    try {
      await onSave({ ...form, amount: parseFloat(form.amount) });
      toast('Transaction saved!');
      onClose();
    } catch {
      toast('Failed to save transaction', 'error');
    } finally {
      setSaving(false);
    }
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
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Amount (₹)</label>
        <input type="number" step="0.01" min="0" className="form-input" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} required />
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">— Select —</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Account</label>
          <select className="form-select" value={form.account} onChange={e => set('account', e.target.value)}>
            <option value="">— Select —</option>
            {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Note</label>
        <input type="text" className="form-input" placeholder="Optional note" value={form.note} onChange={e => set('note', e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <Spinner size={16} /> : null}
          Save Transaction
        </button>
      </div>
    </form>
  );
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | tx object
  const [filters, setFilters] = useState({ search: '', type: '', category: '', date_from: '', date_to: '' });
  const [showFilters, setShowFilters] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.type) params.type = filters.type;
      if (filters.category) params.category = filters.category;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      const [txRes, catRes, accRes] = await Promise.all([
        getTransactions(params),
        getCategories(),
        getAccounts(),
      ]);
      setTransactions(txRes.data);
      setCategories(catRes.data);
      setAccounts(accRes.data);
    } finally {
      setLoading(false);
    }
  }, [filters.type, filters.category, filters.date_from, filters.date_to]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data) {
    if (modal && modal.id) {
      await updateTransaction(modal.id, data);
    } else {
      await createTransaction(data);
    }
    load();
  }

  async function handleDelete(tx) {
    if (!confirm(`Delete this ${tx.type} of ${fmt(tx.amount)}?`)) return;
    try {
      await deleteTransaction(tx.id);
      toast('Deleted!');
      load();
    } catch {
      toast('Failed to delete', 'error');
    }
  }

  const filtered = transactions.filter(tx => {
    if (!filters.search) return true;
    const q = filters.search.toLowerCase();
    return (
      (tx.note || '').toLowerCase().includes(q) ||
      (tx.category || '').toLowerCase().includes(q) ||
      (tx.account || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">{transactions.length} entries</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={15} /> Filters
          </button>
          <button className="btn btn-primary" onClick={() => setModal('add')}>
            <Plus size={15} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 160px' }}>
            <label className="form-label">Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
            </div>
          </div>
          <div className="form-group" style={{ flex: '1 1 120px' }}>
            <label className="form-label">Type</label>
            <select className="form-select" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
              <option value="">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 160px' }}>
            <label className="form-label">Category</label>
            <select className="form-select" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
              <option value="">All</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 140px' }}>
            <label className="form-label">From</label>
            <input type="date" className="form-input" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
          </div>
          <div className="form-group" style={{ flex: '1 1 140px' }}>
            <label className="form-label">To</label>
            <input type="date" className="form-input" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ search: '', type: '', category: '', date_from: '', date_to: '' })}>
            <X size={13} /> Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}><Spinner size={28} /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">💸</span>
            <span className="empty-text">No transactions found</span>
            <span className="empty-sub">Add your first transaction to get started</span>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: 'none', borderRadius: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Account</th>
                  <th>Note</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => (
                  <tr key={tx.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{fmtDate(tx.date)}</td>
                    <td>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{tx.category || '—'}</span>
                      {tx.subcategory && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>{tx.subcategory}</span>}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{tx.account || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.note || '—'}</td>
                    <td>
                      <span className={`badge badge-${tx.type}`}>{tx.type}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: tx.type === 'income' ? 'var(--accent)' : 'var(--red)' }}>
                      {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal(tx)} title="Edit">
                          <Pencil size={13} />
                        </button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(tx)} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <Modal
          title={modal === 'add' ? 'Add Transaction' : 'Edit Transaction'}
          onClose={() => setModal(null)}
        >
          <TransactionForm
            initial={modal === 'add' ? {} : modal}
            categories={categories}
            accounts={accounts}
            onSave={handleSave}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}
