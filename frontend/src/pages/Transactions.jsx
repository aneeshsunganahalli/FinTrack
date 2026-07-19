import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, Filter, X, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { getTransactions, createTransaction, createTransactionsBulk, updateTransaction, deleteTransaction, getCategories, getAccounts, getSettings } from '../lib/api';
import { fmt, fmtDate } from '../lib/utils';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';

function makeEmptyRow(defaults = {}) {
  return {
    _key: Math.random().toString(36).slice(2),
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    type: 'expense',
    category: '',
    account_id: defaults.account_id || '',
    account: defaults.account || '',
    to_account_id: '',
    to_account: '',
    note: '',
    subcategory: '',
  };
}

function TransactionForm({ initial, categories, accounts, defaultAccountId, onSave, onClose }) {
  const resolvedInitial = { ...initial };

  // Apply default account for new transactions
  if (!initial?.id && defaultAccountId && !resolvedInitial.account_id) {
    const defAcc = accounts.find(a => String(a.id) === String(defaultAccountId));
    if (defAcc) {
      resolvedInitial.account_id = defAcc.id;
      resolvedInitial.account = defAcc.name;
    }
  }

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    type: 'expense',
    category: '',
    account_id: '',
    account: '',
    to_account_id: '',
    to_account: '',
    note: '',
    subcategory: '',
    ...resolvedInitial,
  });
  const [saving, setSaving] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const toast = useToast();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handleAccountChange(fieldId, fieldName, accountId) {
    const acc = accounts.find(a => String(a.id) === String(accountId));
    setForm(f => ({
      ...f,
      [fieldId]: accountId ? parseInt(accountId) : '',
      [fieldName]: acc ? acc.name : '',
    }));
  }

  async function executeSubmit() {
    setSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          payload[key] = null;
        }
      });
      await onSave(payload);
      toast('Transaction saved!');
      onClose();
    } catch (err) {
      if (err.response?.data?.detail) {
        toast(err.response.data.detail, 'error');
      } else {
        toast('Failed to save transaction', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || !form.date) return;
    
    if (form.type !== 'income') {
      const selectedAcc = accounts.find(a => String(a.id) === String(form.account_id));
      if (selectedAcc && selectedAcc.account_type === 'piggy_bank') {
        setConfirmWithdraw(true);
        return;
      }
    }
    
    executeSubmit();
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
            <option value="transfer">Transfer</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Amount (₹)</label>
        <input type="number" step="0.01" min="0" className="form-input" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} required />
      </div>
      <div className="grid-2">
        {form.type !== 'transfer' ? (
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">— Select —</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">To Account</label>
            <select className="form-select" value={form.to_account_id || ''} onChange={e => handleAccountChange('to_account_id', 'to_account', e.target.value)}>
              <option value="">— Select Target —</option>
              {accounts.filter(a => a.id !== form.account_id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">{form.type === 'transfer' ? 'From Account' : 'Account'}</label>
          <select className="form-select" value={form.account_id || ''} onChange={e => handleAccountChange('account_id', 'account', e.target.value)}>
            <option value="">— Select —</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
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

      {confirmWithdraw && (
        <ConfirmModal
          title="Withdraw from Piggy Bank?"
          message="Are you sure you want to take money out of your Piggy Bank for this?"
          onConfirm={() => {
            setConfirmWithdraw(false);
            executeSubmit();
          }}
          onCancel={() => setConfirmWithdraw(false)}
          confirmText="Yes, take money out"
        />
      )}
    </form>
  );
}


function BulkEntryPanel({ categories, accounts, defaultAccountId, onDone }) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Build default account info once
  const defAcc = defaultAccountId ? accounts.find(a => String(a.id) === String(defaultAccountId)) : null;
  const rowDefaults = defAcc ? { account_id: defAcc.id, account: defAcc.name } : {};

  const [rows, setRows] = useState([makeEmptyRow(rowDefaults), makeEmptyRow(rowDefaults), makeEmptyRow(rowDefaults)]);

  function updateRow(key, field, value) {
    setRows(prev => prev.map(r => {
      if (r._key !== key) return r;
      if (field === 'account_id' || field === 'to_account_id') {
        const acc = accounts.find(a => String(a.id) === String(value));
        const nameField = field === 'account_id' ? 'account' : 'to_account';
        return { ...r, [field]: value ? parseInt(value) : '', [nameField]: acc ? acc.name : '' };
      }
      return { ...r, [field]: value };
    }));
  }

  function addRow() {
    setRows(prev => [...prev, makeEmptyRow(rowDefaults)]);
  }

  function removeRow(key) {
    setRows(prev => prev.length <= 1 ? prev : prev.filter(r => r._key !== key));
  }

  async function handleSubmitAll() {
    const valid = rows.filter(r => r.amount && r.date);
    if (valid.length === 0) {
      toast('Add at least one row with date and amount', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const txs = valid.map(r => ({
        date: r.date,
        amount: parseFloat(r.amount),
        type: r.type,
        category: r.category || null,
        account_id: r.account_id || null,
        account: r.account || null,
        to_account_id: r.to_account_id || null,
        to_account: r.to_account || null,
        note: r.note || null,
        subcategory: null,
      }));
      await createTransactionsBulk(txs);
      toast(`${txs.length} transaction${txs.length > 1 ? 's' : ''} added!`);
      // Reset with fresh rows
      setRows([makeEmptyRow(rowDefaults), makeEmptyRow(rowDefaults), makeEmptyRow(rowDefaults)]);
      onDone();
    } catch (err) {
      if (err.response?.data?.detail) {
        toast(err.response.data.detail, 'error');
      } else {
        toast('Failed to save transactions', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 className="section-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={16} /> Quick Add — Bulk Entry
        </h3>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {rows.filter(r => r.amount && r.date).length} / {rows.length} rows filled
        </span>
      </div>

      {/* Header row */}
      <div className="bulk-grid bulk-header">
        <span>Date</span>
        <span>Amount</span>
        <span>Type</span>
        <span>Category</span>
        <span>Account</span>
        <span>Note</span>
        <span></span>
      </div>

      {/* Data rows */}
      {rows.map(row => (
        <div key={row._key} className="bulk-grid bulk-row">
          <input
            type="date"
            className="form-input"
            value={row.date}
            onChange={e => updateRow(row._key, 'date', e.target.value)}
          />
          <input
            type="number"
            step="0.01"
            min="0"
            className="form-input"
            placeholder="0.00"
            value={row.amount}
            onChange={e => updateRow(row._key, 'amount', e.target.value)}
          />
          <select
            className="form-select"
            value={row.type}
            onChange={e => updateRow(row._key, 'type', e.target.value)}
          >
            <option value="expense">Exp.</option>
            <option value="income">Inc.</option>
            <option value="transfer">Trsf.</option>
          </select>
          {row.type !== 'transfer' ? (
            <select
              className="form-select"
              value={row.category}
              onChange={e => updateRow(row._key, 'category', e.target.value)}
            >
              <option value="">—</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          ) : (
            <select
              className="form-select"
              value={row.to_account_id || ''}
              onChange={e => updateRow(row._key, 'to_account_id', e.target.value)}
            >
              <option value="">To...</option>
              {accounts.filter(a => a.id !== row.account_id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
          <select
            className="form-select"
            value={row.account_id || ''}
            onChange={e => updateRow(row._key, 'account_id', e.target.value)}
          >
            <option value="">—</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input
            type="text"
            className="form-input"
            placeholder="Note..."
            value={row.note}
            onChange={e => updateRow(row._key, 'note', e.target.value)}
          />
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => removeRow(row._key)}
            title="Remove row"
            style={{ opacity: rows.length <= 1 ? 0.3 : 1 }}
            disabled={rows.length <= 1}
          >
            <X size={14} />
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'space-between' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={addRow}>
          <Plus size={14} /> Add Row
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmitAll}
          disabled={submitting || rows.filter(r => r.amount && r.date).length === 0}
        >
          {submitting ? <Spinner size={16} /> : null}
          Submit All ({rows.filter(r => r.amount && r.date).length})
        </button>
      </div>
    </div>
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
  const [showBulk, setShowBulk] = useState(false);
  const [defaultAccountId, setDefaultAccountId] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.type) params.type = filters.type;
      if (filters.category) params.category = filters.category;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      const [txRes, catRes, accRes, settingsRes] = await Promise.all([
        getTransactions(params),
        getCategories(),
        getAccounts(),
        getSettings(),
      ]);
      setTransactions(txRes.data);
      setCategories(catRes.data);
      setAccounts(accRes.data);

      // Resolve default account from settings
      const settingsMap = {};
      settingsRes.data.forEach(({ key, value }) => { settingsMap[key] = value; });
      setDefaultAccountId(settingsMap.default_account_id || '');
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
    setConfirmModal({
      title: 'Delete Transaction',
      message: `Are you sure you want to delete this ${tx.type} of ${fmt(tx.amount)}?`,
      onConfirm: async () => {
        try {
          await deleteTransaction(tx.id);
          toast('Deleted!');
          setConfirmModal(null);
          load();
        } catch (err) {
          if (err.response?.data?.detail) {
            toast(err.response.data.detail, 'error');
          } else {
            toast('Failed to delete', 'error');
          }
        }
      }
    });
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
          <button
            className={`btn ${showBulk ? 'btn-accent' : 'btn-ghost'}`}
            onClick={() => setShowBulk(!showBulk)}
            style={showBulk ? { background: 'var(--accent-glow)', borderColor: 'var(--accent-border)' } : {}}
          >
            <Layers size={15} /> Bulk Add
          </button>
          <button className="btn btn-primary" onClick={() => setModal('add')}>
            <Plus size={15} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Bulk Entry Panel */}
      {showBulk && (
        <BulkEntryPanel
          categories={categories}
          accounts={accounts}
          defaultAccountId={defaultAccountId}
          onDone={load}
        />
      )}

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
              <option value="transfer">Transfer</option>
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
                      {tx.type === 'transfer' ? (
                        <span style={{ fontSize: 13, color: 'var(--accent-light)' }}>➔ {tx.to_account || 'Unknown'}</span>
                      ) : (
                        <>
                          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{tx.category || '—'}</span>
                          {tx.subcategory && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>{tx.subcategory}</span>}
                        </>
                      )}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{tx.account || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.note || '—'}</td>
                    <td>
                      <span className={`badge badge-${tx.type}`}>{tx.type}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: tx.type === 'income' ? 'var(--accent)' : (tx.type === 'transfer' ? 'var(--text-primary)' : 'var(--red)') }}>
                      {tx.type === 'income' ? '+' : (tx.type === 'transfer' ? '' : '-')}{fmt(tx.amount)}
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
            defaultAccountId={defaultAccountId}
            onSave={handleSave}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          danger={true}
          confirmText="Delete"
        />
      )}
    </div>
  );
}
