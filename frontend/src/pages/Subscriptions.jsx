import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Repeat, CheckCircle } from 'lucide-react';
import { getSubscriptions, createSubscription, updateSubscription, deleteSubscription, getAccounts, getCategories } from '../lib/api';
import { fmt, fmtDate } from '../lib/utils';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';

const EMPTY = { 
  name: '', 
  amount: '', 
  billing_cycle: 'monthly', 
  next_billing_date: '', 
  category: '', 
  account_id: '', 
  image_url: '', 
  status: 'active',
  notes: '' 
};

function SubscriptionForm({ initial, categories, accounts, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ 
        ...form, 
        amount: parseFloat(form.amount),
        account_id: form.account_id ? parseInt(form.account_id) : null
      });
      toast('Subscription saved!');
      onClose();
    } catch {
      toast('Failed to save subscription', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="form-group">
        <label className="form-label">Service Name</label>
        <input className="form-input" placeholder="Netflix, Spotify..." value={form.name} onChange={e => set('name', e.target.value)} required />
      </div>
      
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Amount (₹)</label>
          <input type="number" step="0.01" min="0" className="form-input" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Billing Cycle</label>
          <select className="form-select" value={form.billing_cycle} onChange={e => set('billing_cycle', e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Next Billing Date</label>
          <input type="date" className="form-input" value={form.next_billing_date} onChange={e => set('next_billing_date', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
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
          <label className="form-label">Payment Account</label>
          <select className="form-select" value={form.account_id || ''} onChange={e => set('account_id', e.target.value)}>
            <option value="">— Select —</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Service Logo URL</label>
        <input className="form-input" placeholder="https://..." value={form.image_url} onChange={e => set('image_url', e.target.value)} />
      </div>
      {form.image_url && (
        <div style={{ marginTop: -8 }}>
          <img src={form.image_url} alt="Logo preview" style={{ height: 48, width: 48, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} onError={e => e.target.style.display = 'none'} />
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Notes</label>
        <input type="text" className="form-input" placeholder="Optional notes" value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <Spinner size={16} /> : null} Save Subscription
        </button>
      </div>
    </form>
  );
}


export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, catRes, accRes] = await Promise.all([
        getSubscriptions(),
        getCategories(),
        getAccounts()
      ]);
      setSubscriptions(subRes.data);
      setCategories(catRes.data);
      setAccounts(accRes.data);
    } catch {
      toast('Failed to load subscriptions', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data) {
    if (modal && modal.id) {
      await updateSubscription(modal.id, data);
    } else {
      await createSubscription(data);
    }
    load();
  }

  async function handleDelete(sub) {
    if (!confirm(`Delete subscription "${sub.name}"?`)) return;
    try {
      await deleteSubscription(sub.id);
      toast('Deleted!');
      load();
    } catch {
      toast('Failed to delete', 'error');
    }
  }
  
  async function handleToggleStatus(sub) {
    const newStatus = sub.status === 'active' ? 'cancelled' : 'active';
    try {
      await updateSubscription(sub.id, { status: newStatus });
      toast(`Marked as ${newStatus}`);
      load();
    } catch {
      toast('Failed to update status', 'error');
    }
  }

  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const cancelledSubs = subscriptions.filter(s => s.status === 'cancelled');
  
  // Calculate monthly burn
  const monthlyCost = activeSubs.reduce((acc, sub) => {
    if (sub.billing_cycle === 'monthly') return acc + sub.amount;
    if (sub.billing_cycle === 'yearly') return acc + (sub.amount / 12);
    if (sub.billing_cycle === 'weekly') return acc + (sub.amount * 4.33);
    return acc;
  }, 0);

  const renderCard = (sub) => (
    <div key={sub.id} className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: sub.status === 'cancelled' ? 0.6 : 1 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {sub.image_url ? (
          <img src={sub.image_url} alt={sub.name} style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Repeat size={20} color="var(--text-muted)" />
          </div>
        )}
        
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{sub.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ textTransform: 'capitalize' }}>{sub.billing_cycle}</span>
            {sub.next_billing_date && (
              <>
                <span>&bull;</span>
                <span>Next: {fmtDate(sub.next_billing_date)}</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(sub.amount)}</div>
          {sub.status === 'cancelled' && <div style={{ fontSize: 10, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>Cancelled</div>}
        </div>
        
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleToggleStatus(sub)} title={sub.status === 'active' ? 'Cancel Subscription' : 'Reactivate'}>
            <CheckCircle size={14} color={sub.status === 'active' ? 'var(--text-muted)' : 'var(--accent)'} />
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal(sub)} title="Edit">
            <Pencil size={14} />
          </button>
          <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(sub)} title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <p className="page-subtitle">Track your recurring expenses</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}>
          <Plus size={15} /> Add Subscription
        </button>
      </div>
      
      {!loading && activeSubs.length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ flex: 1 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 8 }}>Active Services</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{activeSubs.length}</div>
          </div>
          <div className="card" style={{ flex: 1, border: '1.5px solid var(--accent-border)', background: 'var(--accent-glow)' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--accent-light)', marginBottom: 8 }}>Monthly Burn</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(monthlyCost)}<span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginLeft: 4 }}>/mo</span>
            </div>
          </div>
          <div className="card" style={{ flex: 1 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 8 }}>Annual Cost</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(monthlyCost * 12)}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spinner size={28} /></div>
      ) : subscriptions.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🔄</span>
          <span className="empty-text">No subscriptions tracked</span>
          <span className="empty-sub">Add your first subscription to monitor recurring costs</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeSubs.map(renderCard)}
          
          {cancelledSubs.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3 className="section-title">Cancelled</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {cancelledSubs.map(renderCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Subscription' : 'Edit Subscription'} onClose={() => setModal(null)}>
          <SubscriptionForm 
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
