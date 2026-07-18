import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Download, Upload, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { getSettings, saveSettings, getCategories, createCategory, updateCategory, deleteCategory, getAccounts, previewTransactionsCSV, commitTransactionsCSV, commitAccountsCSV, commitInvestmentsCSV } from '../lib/api';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';

function ColorSwatch({ color }) {
  return <div style={{ width: 14, height: 14, borderRadius: 4, background: color, flexShrink: 0 }} />;
}

function TemplateCard({ title, desc, href, filename }) {
  return (
    <div className="card card-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{desc}</div>
      </div>
      <a href={href} download={filename} className="btn btn-ghost btn-sm">
        <Download size={14} /> Download
      </a>
    </div>
  );
}

function ImportSection({ title, acceptUploader, onCommit, onPreview, commitLabel = 'Commit Import' }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();
  const toast = useToast();

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    setPreview(null);
    try {
      const res = await onPreview(file);
      setPreview(res.data);
    } catch {
      toast('Failed to parse CSV', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!file) return;
    setCommitting(true);
    try {
      const res = await onCommit(file);
      setResult(res.data);
      setPreview(null);
      setFile(null);
      toast(`Imported ${res.data.inserted} rows!`);
    } catch {
      toast('Import failed', 'error');
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 0 }}>{title}</h4>
      <div
        style={{
          border: '2px dashed var(--border)',
          borderRadius: 12,
          padding: '24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
      >
        <Upload size={24} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          {file ? file.name : 'Drop a CSV file here or click to browse'}
        </p>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
      </div>
      {file && (
        <div style={{ display: 'flex', gap: 10 }}>
          {acceptUploader && (
            <button className="btn btn-ghost" onClick={handlePreview} disabled={loading}>
              {loading ? <Spinner size={15} /> : null} Preview
            </button>
          )}
          <button className="btn btn-primary" onClick={handleCommit} disabled={committing || (acceptUploader && !preview)}>
            {committing ? <Spinner size={15} /> : null} {commitLabel}
          </button>
        </div>
      )}
      {preview && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <span className="badge badge-income"><CheckCircle size={11} /> {preview.valid_count} valid</span>
            {preview.error_count > 0 && (
              <span className="badge badge-expense"><XCircle size={11} /> {preview.error_count} errors</span>
            )}
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto', fontSize: 12 }}>
            {preview.rows.filter(r => !r.valid).map(r => (
              <div key={r.row} className="alert alert-warning" style={{ marginBottom: 6, fontSize: 12 }}>
                <AlertTriangle size={12} style={{ display: 'inline', marginRight: 6 }} />
                Row {r.row}: {r.errors.join(', ')}
              </div>
            ))}
          </div>
          {preview.valid_count > 0 && (
            <button className="btn btn-primary" onClick={handleCommit} disabled={committing} style={{ marginTop: 12 }}>
              {committing ? <Spinner size={15} /> : null} Commit {preview.valid_count} Rows
            </button>
          )}
        </div>
      )}
      {result && (
        <div className="alert alert-info">
          Imported {result.inserted} rows. {result.skipped > 0 ? `${result.skipped} rows skipped.` : ''}
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [catModal, setCatModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', icon: 'tag', color: '#00D09C' });
  const toast = useToast();

  useEffect(() => {
    getSettings().then(r => {
      const s = {};
      r.data.forEach(({ key, value }) => { s[key] = value; });
      setSettings(s);
    });
    loadCategories();
    getAccounts().then(r => setAccounts(r.data));
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
    setConfirmModal({
      title: 'Delete Category',
      message: `Are you sure you want to delete category "${cat.name}"?`,
      onConfirm: async () => {
        await deleteCategory(cat.id);
        toast('Deleted');
        setConfirmModal(null);
        loadCategories();
      }
    });
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
            <div className="form-group">
              <label className="form-label">Default Bank Account</label>
              <select
                className="form-select"
                value={settings.default_account_id || ''}
                onChange={e => setSettings(s => ({ ...s, default_account_id: e.target.value }))}
              >
                <option value="">— No default —</option>
                {accounts.map(a => (
                  <option key={a.id} value={String(a.id)}>{a.name} ({a.bank_name || a.account_type})</option>
                ))}
              </select>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Pre-selects this account when adding new transactions
              </span>
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

        {/* Import / Export */}
        <div className="card">
          <h3 className="section-title">Import / Export</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Bulk import data via CSV templates or export your data.
          </p>

          {/* Templates */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Download CSV Templates</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <TemplateCard
                title="Transactions Template"
                desc="Columns: date, amount, type, category, account, note, subcategory"
                href="/api/import/template/transactions"
                filename="transactions_template.csv"
              />
              <TemplateCard
                title="Bank Accounts Template"
                desc="Columns: name, bank_name, account_type, current_balance, minimum_balance"
                href="/api/import/template/accounts"
                filename="accounts_template.csv"
              />
              <TemplateCard
                title="Investments Template"
                desc="Columns: platform, instrument_name, amount_invested, units, date_invested, current_value, notes"
                href="/api/import/template/investments"
                filename="investments_template.csv"
              />
            </div>
          </div>

          {/* Import sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <ImportSection
              title="Import Transactions"
              acceptUploader
              onPreview={previewTransactionsCSV}
              onCommit={commitTransactionsCSV}
            />
            <ImportSection
              title="Import Bank Accounts"
              acceptUploader={false}
              onPreview={previewTransactionsCSV}
              onCommit={commitAccountsCSV}
              commitLabel="Import Accounts"
            />
            <ImportSection
              title="Import Investments"
              acceptUploader={false}
              onPreview={previewTransactionsCSV}
              onCommit={commitInvestmentsCSV}
              commitLabel="Import Investments"
            />
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
