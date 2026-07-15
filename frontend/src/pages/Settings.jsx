import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getSettings, saveSettings, getCategories, createCategory, updateCategory, deleteCategory } from '../lib/api';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

function ColorSwatch({ color }) {
  return <div style={{ width: 14, height: 14, borderRadius: 4, background: color, flexShrink: 0 }} />;
}

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [catModal, setCatModal] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', icon: 'tag', color: '#00D09C' });
  const toast = useToast();

  useEffect(() => {
    getSettings().then(r => {
      const s = {};
      r.data.forEach(({ key, value }) => { s[key] = value; });
      setSettings(s);
    });
    loadCategories();
  }, []);

  function loadCategories() {
    getCategories().then(r => setCategories(r.data));
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(settings);
      toast('Settings saved!');
    } catch {
      toast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCategory(e) {
    e.preventDefault();
    try {
      if (catModal && catModal.id) {
        await updateCategory(catModal.id, catForm);
      } else {
        await createCategory(catForm);
      }
      toast('Category saved!');
      setCatModal(null);
      loadCategories();
    } catch {
      toast('Failed to save', 'error');
    }
  }

  async function handleDeleteCat(cat) {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    await deleteCategory(cat.id);
    toast('Deleted');
    loadCategories();
  }

  function openCatEdit(cat) {
    setCatForm({ name: cat.name, icon: cat.icon, color: cat.color });
    setCatModal(cat);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure FinTrack preferences</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* General */}
        <div className="card">
          <h3 className="section-title">General</h3>
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Currency Symbol</label>
                <input className="form-input" value={settings.currency_symbol || '₹'} onChange={e => setSettings(s => ({ ...s, currency_symbol: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Currency Code</label>
                <input className="form-input" value={settings.currency || 'INR'} onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <Spinner size={15} /> : null} Save Settings
              </button>
            </div>
          </form>
        </div>

        {/* Ollama */}
        <div className="card">
          <h3 className="section-title">Ollama / AI Integration</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Point FinTrack at your local Ollama server. Make sure Ollama is running with <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>ollama serve</code>.
          </p>
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Ollama Server URL</label>
                <input className="form-input" placeholder="http://localhost:11434" value={settings.ollama_url || ''} onChange={e => setSettings(s => ({ ...s, ollama_url: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Model Name</label>
                <input className="form-input" placeholder="llama3" value={settings.ollama_model || ''} onChange={e => setSettings(s => ({ ...s, ollama_model: e.target.value }))} />
              </div>
            </div>
            <div className="alert alert-info" style={{ fontSize: 13 }}>
              Pull a model with: <code>ollama pull llama3</code> · Then set the model name above.
              Common choices: llama3, mistral, gemma2, phi3
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <Spinner size={15} /> : null} Save
              </button>
            </div>
          </form>
        </div>

        {/* Categories */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 className="section-title" style={{ marginBottom: 0 }}>Categories</h3>
            <button className="btn btn-primary btn-sm" onClick={() => { setCatForm({ name: '', icon: 'tag', color: '#00D09C' }); setCatModal('new'); }}>
              <Plus size={13} /> Add
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 10 }}>
                <ColorSwatch color={cat.color} />
                <span style={{ flex: 1, fontSize: 14 }}>{cat.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cat.icon}</span>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openCatEdit(cat)}><Pencil size={12} /></button>
                <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDeleteCat(cat)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category modal */}
      {catModal && (
        <Modal title={catModal === 'new' ? 'Add Category' : 'Edit Category'} onClose={() => setCatModal(null)}>
          <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" placeholder="Category name" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Icon (Lucide name)</label>
                <input className="form-input" placeholder="tag" value={catForm.icon} onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={catForm.color} onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))} style={{ width: 44, height: 38, borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'pointer' }} />
                  <input className="form-input" value={catForm.color} onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setCatModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
