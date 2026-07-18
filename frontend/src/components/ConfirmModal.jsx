import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = "Confirm", danger = true }) {
  return (
    <Modal title={title || "Confirm Action"} onClose={onCancel}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{
          padding: 10,
          background: danger ? 'rgba(232, 72, 85, 0.1)' : 'rgba(107, 143, 240, 0.1)',
          color: danger ? 'var(--red)' : 'var(--accent)',
          borderRadius: 8
        }}>
          <AlertTriangle size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {message}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button 
          type="button" 
          className={danger ? "btn btn-danger" : "btn btn-primary"} 
          onClick={onConfirm}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
