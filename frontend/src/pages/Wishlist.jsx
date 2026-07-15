import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, CheckCircle, ExternalLink, Pencil, ShoppingBag } from 'lucide-react';
import { getWishlist, createWishlistItem, updateWishlistItem, deleteWishlistItem, previewUrl } from '../lib/api';
import { fmt } from '../lib/utils';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';

const EMPTY = { name: '', price: '', product_url: '', image_url: '', category: '', priority: 'medium', notes: '' };

function WishlistForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const toast = useToast();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleFetchUrl() {
    if (!form.product_url) return;
    setFetching(true);
    try {
      const res = await previewUrl(form.product_url);
      if (res.data.title && !form.name) set('name', res.data.title);
      if (res.data.image_url) set('image_url', res.data.image_url);
      toast('Preview fetched!');
    } catch {
      toast('Could not fetch URL preview', 'error');
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, price: form.price ? parseFloat(form.price) : null });
      toast('Wishlist item saved!');
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
        <label className="form-label">Product URL</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" placeholder="https://..." value={form.product_url} onChange={e => set('product_url', e.target.value)} style={{ flex: 1 }} />
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleFetchUrl} disabled={fetching}>
            {fetching ? <Spinner size={14} /> : 'Fetch'}
          </button>
        </div>
      </div>
      {form.image_url && (
        <img src={form.image_url} alt="preview" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
      )}
      <div className="form-group">
        <label className="form-label">Item Name</label>
        <input className="form-input" placeholder="Item name" value={form.name} onChange={e => set('name', e.target.value)} required />
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Price (₹)</label>
          <input type="number" step="0.01" className="form-input" placeholder="0.00" value={form.price} onChange={e => set('price', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Image URL (manual)</label>
        <input className="form-input" placeholder="https://..." value={form.image_url} onChange={e => set('image_url', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-textarea" placeholder="Optional notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <Spinner size={16} /> : null} Save Item
        </button>
      </div>
    </form>
  );
}

function WishCard({ item, onEdit, onDelete, onToggle }) {
  return (
    <div className="wishlist-card" style={item.purchased ? { opacity: 0.5 } : {}}>
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="wishlist-img" onError={e => e.target.style.display = 'none'} />
      ) : (
        <div className="wishlist-img-placeholder">
          <ShoppingBag size={32} />
        </div>
      )}
      <div className="wishlist-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{item.name}</span>
          <span className={`badge badge-${item.priority}`} style={{ flexShrink: 0 }}>{item.priority}</span>
        </div>
        {item.price && (
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
            {fmt(item.price)}
          </div>
        )}
        {item.notes && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{item.notes}</p>}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {item.product_url && (
            <a href={item.product_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
              <ExternalLink size={13} /> Visit
            </a>
          )}
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(item)} title="Edit"><Pencil size={13} /></button>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => onToggle(item)}
            title={item.purchased ? 'Mark active' : 'Mark purchased'}
            style={{ color: item.purchased ? 'var(--text-muted)' : 'var(--accent)' }}
          >
            <CheckCircle size={13} />
          </button>
          <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(item)} title="Delete"><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  );
}

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [purchased, setPurchased] = useState([]);
  const [tab, setTab] = useState('active');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getWishlist(false), getWishlist(true)])
      .then(([a, p]) => { setItems(a.data); setPurchased(p.data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data) {
    if (modal && modal.id) {
      await updateWishlistItem(modal.id, data);
    } else {
      await createWishlistItem(data);
    }
    load();
  }

  async function handleDelete(item) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await deleteWishlistItem(item.id);
    toast('Deleted');
    load();
  }

  async function handleToggle(item) {
    await updateWishlistItem(item.id, { purchased: !item.purchased });
    toast(item.purchased ? 'Moved to active' : 'Marked as purchased! 🎉');
    load();
  }

  const display = tab === 'active' ? items : purchased;
  const totalWishValue = items.reduce((s, i) => s + (i.price || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Wishlist</h1>
          <p className="page-subtitle">
            {items.length} items · Total value: <strong style={{ color: 'var(--accent)' }}>{fmt(totalWishValue)}</strong>
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}>
          <Plus size={15} /> Add Item
        </button>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
          Active ({items.length})
        </button>
        <button className={`tab ${tab === 'purchased' ? 'active' : ''}`} onClick={() => setTab('purchased')}>
          Purchased ({purchased.length})
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spinner size={28} /></div>
      ) : display.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🛍️</span>
          <span className="empty-text">Nothing here yet</span>
        </div>
      ) : (
        <div className="wishlist-grid">
          {display.map(item => (
            <WishCard key={item.id} item={item} onEdit={setModal} onDelete={handleDelete} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Wishlist Item' : 'Edit Item'} onClose={() => setModal(null)}>
          <WishlistForm initial={modal === 'add' ? {} : modal} onSave={handleSave} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}
