import { useState, useEffect } from 'react';
import { PiggyBank, X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { getAccounts, createTransaction } from '../lib/api';
import { fmt } from '../lib/utils';
import Spinner from './Spinner';
import { useToast } from './Toast';

export default function PiggyBankWidget() {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [piggyAccount, setPiggyAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [action, setAction] = useState('deposit'); // 'deposit' | 'withdraw'
  const toast = useToast();

  const loadData = async () => {
    try {
      const res = await getAccounts();
      const allAccounts = res.data;
      const piggy = allAccounts.find(a => a.account_type === 'piggy_bank');
      setPiggyAccount(piggy);
      const otherAccounts = allAccounts.filter(a => a.account_type !== 'piggy_bank');
      setAccounts(otherAccounts);
      if (otherAccounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(otherAccounts[0].id);
      }
    } catch (err) {
      console.error('Failed to load accounts for piggy bank', err);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  // Listen to transaction updates
  useEffect(() => {
    const handleTx = () => { if (open) loadData(); };
    window.addEventListener('transaction_added', handleTx);
    return () => window.removeEventListener('transaction_added', handleTx);
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || amount <= 0) return;
    if (!piggyAccount || !selectedAccountId) return;

    setLoading(true);
    try {
      const isDeposit = action === 'deposit';
      const fromId = isDeposit ? parseInt(selectedAccountId) : piggyAccount.id;
      const toId = isDeposit ? piggyAccount.id : parseInt(selectedAccountId);
      
      const fromAcc = isDeposit ? accounts.find(a => a.id === fromId) : piggyAccount;
      const toAcc = isDeposit ? piggyAccount : accounts.find(a => a.id === toId);

      const payload = {
        date: new Date().toISOString().slice(0, 10),
        amount: parseFloat(amount),
        type: 'transfer',
        account_id: fromId,
        account: fromAcc?.name,
        to_account_id: toId,
        to_account: toAcc?.name,
        note: isDeposit ? 'Deposit to Piggy Bank' : 'Withdraw from Piggy Bank',
      };

      await createTransaction(payload);
      toast(isDeposit ? 'Money deposited to Piggy Bank!' : 'Money withdrawn from Piggy Bank!');
      setAmount('');
      loadData(); // Refresh balance
      
      window.dispatchEvent(new CustomEvent('transaction_added'));
    } catch (err) {
      if (err.response?.data?.detail) {
        toast(err.response.data.detail, 'error');
      } else {
        toast('Failed to complete transfer', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="piggy-bank-widget">
      {open && (
        <div className="card piggy-bank-popup">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)' }}>
              <PiggyBank size={18} /> Piggy Bank
            </h3>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </div>
          
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Current Savings</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Merriweather', serif" }}>
              {piggyAccount ? fmt(piggyAccount.current_balance) : '₹0.00'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
            <button 
              type="button"
              className={`btn ${action === 'deposit' ? 'btn-accent' : 'btn-ghost'}`} 
              style={{ flex: 1, padding: '8px 0', display: 'flex', justifyContent: 'center' }}
              onClick={() => setAction('deposit')}
            >
              <ArrowUpCircle size={16} /> Deposit
            </button>
            <button 
              type="button"
              className={`btn ${action === 'withdraw' ? 'btn-danger' : 'btn-ghost'}`} 
              style={{ flex: 1, padding: '8px 0', display: 'flex', justifyContent: 'center' }}
              onClick={() => setAction('withdraw')}
            >
              <ArrowDownCircle size={16} /> Withdraw
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input 
                type="number" 
                step="0.01" 
                min="1" 
                className="form-input" 
                placeholder="0.00" 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label">{action === 'deposit' ? 'From Account' : 'To Account'}</label>
              <select 
                className="form-select" 
                value={selectedAccountId} 
                onChange={e => setSelectedAccountId(e.target.value)}
                required
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({fmt(a.current_balance)})</option>
                ))}
              </select>
            </div>
            <button type="submit" className={action === 'deposit' ? 'btn btn-primary' : 'btn btn-danger'} disabled={loading} style={{ justifyContent: 'center' }}>
              {loading ? <Spinner size={16} /> : null}
              {action === 'deposit' ? 'Transfer to Piggy Bank' : 'Withdraw Funds'}
            </button>
          </form>
        </div>
      )}

      <button 
        className="btn btn-primary"
        style={{ 
          width: 56, height: 56, borderRadius: '50%', padding: 0, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0, 208, 156, 0.4)',
          background: open ? 'var(--bg-card)' : 'var(--accent)',
          color: open ? 'var(--accent)' : 'var(--bg-card)',
          border: open ? '2px solid var(--accent)' : 'none',
          transition: 'all 0.3s ease'
        }}
        onClick={() => setOpen(!open)}
        title="Piggy Bank"
      >
        <PiggyBank size={28} />
      </button>
    </div>
  );
}
