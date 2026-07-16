import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { getTransactions } from '../lib/api';
import { fmt, fmtDate } from '../lib/utils';
import Spinner from './Spinner';

export default function RecentTransactions({ limit = 5, accountId = null, category = null, title = 'Recent Transactions', compact = false }) {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = { limit };
    if (accountId) params.account_id = accountId;
    if (category) params.category = category;
    getTransactions(params)
      .then(r => setTxs(r.data.slice(0, limit)))
      .finally(() => setLoading(false));
  }, [limit, accountId]);

  if (loading) return (
    <div style={{ padding: '20px 0', display: 'flex', justifyContent: 'center' }}>
      <Spinner size={20} />
    </div>
  );

  if (txs.length === 0) return (
    <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0' }}>No transactions yet.</p>
  );

  return (
    <div>
      {title && <h3 className="section-title">{title}</h3>}
      <div>
        {txs.map(tx => (
          <div key={tx.id} className="recent-tx-item" style={{ gap: 10 }}>
            {/* Icon */}
            <div style={{
              width: 30, height: 30, borderRadius: 4,
              background: tx.type === 'income' ? 'rgba(46,204,113,0.12)' : 'rgba(232,72,85,0.1)',
              border: `1px solid ${tx.type === 'income' ? 'rgba(46,204,113,0.3)' : 'rgba(232,72,85,0.25)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {tx.type === 'income'
                ? <ArrowDownLeft size={14} color="var(--green)" />
                : <ArrowUpRight size={14} color="var(--red)" />}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: compact ? 12 : 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tx.note || tx.category || '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                {tx.category}{tx.category && tx.account ? ' · ' : ''}{tx.account}
              </div>
            </div>

            {/* Amount + date */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: compact ? 12 : 13,
                fontWeight: 600,
                color: tx.type === 'income' ? 'var(--green)' : 'var(--red)',
              }}>
                {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                {fmtDate(tx.date)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
