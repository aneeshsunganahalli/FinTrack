import { useState, useEffect } from 'react';
import { PiggyBank, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { getAccounts, createTransaction } from '../lib/api';
import { fmt } from '../lib/utils';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';

export default function PiggyBankPage() {
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
    loadData();
  }, []);

  // Listen to transaction updates
  useEffect(() => {
    const handleTx = () => { loadData(); };
    window.addEventListener('transaction_added', handleTx);
    return () => window.removeEventListener('transaction_added', handleTx);
  }, []);

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
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title"><PiggyBank className="inline-icon" /> Piggy Bank</h1>
          <p className="page-subtitle">Manage your savings directly from your mobile device.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 500, margin: '0 auto' }}>
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
    </div>
  );
}
