import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, CheckCircle, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import { getDebts, createDebt, updateDebt, deleteDebt, markDebtPaid, getAccounts } from '../lib/api';
import { fmt, fmtDate } from '../lib/utils';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';

function DebtForm({ initial, accounts, onSave, onClose }) {
  const [form, setForm] = useState({
    person_name: '',
    amount: '',
    direction: 'owed_to_me',
    date_created: new Date().toISOString().slice(0, 10),
    due_date: '',
    account_id: '',
    note: '',
    ...initial,
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.person_name || !form.amount) return;
    setSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') payload[key] = null;
      });
      await onSave(payload);
      toast('IOU saved!');
      onClose();
    } catch {
      toast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="form-group">
        <label className="form-label">Person's Name</label>
        <input className="form-input" placeholder="Who?" value={form.person_name} onChange={e => set('person_name', e.target.value)} required />
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Amount</label>
          <input type="number" step="0.01" min="0" className="form-input" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Direction</label>
          <select className="form-select" value={form.direction} onChange={e => set('direction', e.target.value)}>
            <option value="owed_to_me">They owe me</option>
            <option value="i_owe">I owe them</option>
          </select>
        </div>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Date Lent / Borrowed</label>
          <input type="date" className="form-input" value={form.date_created} onChange={e => set('date_created', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Due Date (optional)</label>
          <input type="date" className="form-input" value={form.due_date || ''} onChange={e => set('due_date', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Linked Account</label>
        <select className="form-select" value={form.account_id || ''} onChange={e => set('account_id', e.target.value ? parseInt(e.target.value) : '')}>
          <option value="">— No account —</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
          Balance will update on this account when marked as paid
        </span>
      </div>
      <div className="form-group">
        <label className="form-label">Note</label>
        <input className="form-input" placeholder="Optional note" value={form.note || ''} onChange={e => set('note', e.target.value)} />
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

function daysOutstanding(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

export default function Debts() {
  const [debts, setDebts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [markPaidModal, setMarkPaidModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [tab, setTab] = useState('pending');
  const toast = useToast();

  function load() {
    setLoading(true);
    Promise.all([getDebts({ status: tab }), getAccounts()])
      .then(([d, a]) => { setDebts(d.data); setAccounts(a.data); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [tab]);

  async function handleSave(data) {
    if (modal && modal.id) {
      await updateDebt(modal.id, data);
    } else {
      await createDebt(data);
    }
    load();
  }

  async function handleDelete(debt) {
    setConfirmModal({
      title: 'Delete IOU',
      message: `Are you sure you want to delete the IOU for ${debt.person_name}?`,
      onConfirm: async () => {
        await deleteDebt(debt.id);
        toast('Deleted');
        setConfirmModal(null);
        load();
      }
    });
  }



  const pending = debts.filter(d => d.status === 'pending');
  const paid = debts.filter(d => d.status === 'paid');
  const totalOwedToMe = pending.filter(d => d.direction === 'owed_to_me').reduce((s, d) => s + d.amount, 0);
  const totalIOwe = pending.filter(d => d.direction === 'i_owe').reduce((s, d) => s + d.amount, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">IOUs</h1>
          <p className="page-subtitle">Track money lent and borrowed</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}>
          <Plus size={15} /> Add IOU
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid-2" style={{ marginBottom: 22 }}>
        <div className="stat-card" style={{ borderColor: 'var(--accent-border)', background: 'var(--accent-glow)' }}>
          <span className="stat-label">Owed to Me</span>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{fmt(totalOwedToMe)}</div>
          <div className="stat-sub">{pending.filter(d => d.direction === 'owed_to_me').length} pending</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">I Owe</span>
          <div className="stat-value" style={{ color: 'var(--red)' }}>{fmt(totalIOwe)}</div>
          <div className="stat-sub">{pending.filter(d => d.direction === 'i_owe').length} pending</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <button className={`btn btn-sm ${tab === 'pending' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('pending')}>
          <Clock size={13} /> Pending
        </button>
        <button className={`btn btn-sm ${tab === 'paid' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('paid')}>
          <CheckCircle size={13} /> Settled
        </button>
      </div>

      {/* List */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}><Spinner size={28} /></div>
        ) : debts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🤝</span>
            <span className="empty-text">No {tab} IOUs</span>
            <span className="empty-sub">{tab === 'pending' ? 'Add an IOU to start tracking' : 'Settled IOUs will appear here'}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {debts.map(debt => (
              <div key={debt.id} className="debt-card" style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
              }}>
                {/* Direction indicator */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: debt.direction === 'owed_to_me' ? 'rgba(0,208,156,0.1)' : 'rgba(255,83,112,0.1)',
                  border: `1.5px solid ${debt.direction === 'owed_to_me' ? 'var(--accent-border)' : 'rgba(255,83,112,0.3)'}`,
                  flexShrink: 0,
                }}>
                  {debt.direction === 'owed_to_me'
                    ? <ArrowDownLeft size={16} color="var(--accent)" />
                    : <ArrowUpRight size={16} color="var(--red)" />
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{debt.person_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span>{debt.direction === 'owed_to_me' ? 'They owe me' : 'I owe them'}</span>
                    <span>·</span>
                    <span>{fmtDate(debt.date_created)}</span>
                    {debt.status === 'pending' && (
                      <>
                        <span>·</span>
                        <span style={{ color: daysOutstanding(debt.date_created) > 30 ? 'var(--red)' : 'var(--text-muted)' }}>
                          {daysOutstanding(debt.date_created)}d outstanding
                        </span>
                      </>
                    )}
                    {debt.due_date && (
                      <>
                        <span>·</span>
                        <span>Due {fmtDate(debt.due_date)}</span>
                      </>
                    )}
                  </div>
                  {debt.note && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{debt.note}</div>}
                  {debt.account_name && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Account: {debt.account_name}</div>}
                </div>

                {/* Amount */}
                <div style={{
                  fontWeight: 700, fontSize: 16, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                  color: debt.direction === 'owed_to_me' ? 'var(--accent)' : 'var(--red)',
                }}>
                  {debt.direction === 'owed_to_me' ? '+' : '-'}{fmt(debt.amount)}
                </div>

                {/* Actions */}
                <div className="row-actions" style={{ opacity: 1, display: 'flex', gap: 6 }}>
                  {debt.status === 'pending' && (
                    <button className="btn btn-sm" onClick={() => setMarkPaidModal(debt)} title="Mark as Paid" style={{
                      background: 'rgba(0,208,156,0.1)', border: '1px solid var(--accent-border)', color: 'var(--accent)',
                      display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                    }}>
                      <CheckCircle size={12} /> Paid
                    </button>
                  )}
                  {debt.status === 'paid' && (
                    <span className="badge badge-income" style={{ fontSize: 11 }}>Settled {debt.paid_date ? fmtDate(debt.paid_date) : ''}</span>
                  )}
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal(debt)} title="Edit"><Pencil size={13} /></button>
                  <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(debt)} title="Delete"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <Modal
          title={modal === 'add' ? 'Add IOU' : 'Edit IOU'}
          onClose={() => setModal(null)}
        >
          <DebtForm
            initial={modal === 'add' ? {} : modal}
            accounts={accounts}
            onSave={handleSave}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      {/* Mark Paid Modal */}
      {markPaidModal && (
        <Modal title="Confirm Payment" onClose={() => setMarkPaidModal(null)}>
          <div style={{ color: 'white' }}>
            <p style={{ marginBottom: 16 }}>
              Mark {markPaidModal.person_name}'s {fmt(markPaidModal.amount)} as paid? This will update your bank balance.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setMarkPaidModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => {
                try {
                  await markDebtPaid(markPaidModal.id);
                  toast('Marked as paid — balance updated!');
                  load();
                  setMarkPaidModal(null);
                } catch {
                  toast('Failed to mark as paid', 'error');
                }
              }}>Confirm</button>
            </div>
          </div>
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
