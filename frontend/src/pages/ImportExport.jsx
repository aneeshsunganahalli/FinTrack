import { useState, useRef } from 'react';
import { Download, Upload, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { previewTransactionsCSV, commitTransactionsCSV, commitAccountsCSV, commitInvestmentsCSV } from '../lib/api';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';

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
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 className="section-title" style={{ marginBottom: 0 }}>{title}</h3>

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

      {/* Preview table */}
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
          ✅ Imported {result.inserted} rows. {result.skipped > 0 ? `${result.skipped} rows skipped.` : ''}
        </div>
      )}
    </div>
  );
}

export default function ImportExport() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Import / Export</h1>
          <p className="page-subtitle">Bulk import data via CSV templates</p>
        </div>
      </div>

      {/* Templates */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="section-title">Download CSV Templates</h3>
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
  );
}
