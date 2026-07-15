import { useState, useEffect } from 'react';
import { Calculator, TrendingDown, ShieldAlert, ShieldCheck, ShieldX, Info } from 'lucide-react';
import { getDashboard } from '../lib/api';
import { fmt } from '../lib/utils';

function getVerdict(pctOfBalance, pctOfMonthlyIncome, daysOfSpending) {
  if (pctOfBalance > 80 || pctOfMonthlyIncome > 100) {
    return { label: 'Not Advisable', icon: ShieldX, cls: 'verdict-risky', color: 'var(--red)', bg: 'rgba(232,72,85,0.08)', border: 'rgba(232,72,85,0.3)' };
  }
  if (pctOfBalance > 40 || pctOfMonthlyIncome > 50 || daysOfSpending > 20) {
    return { label: 'Stretch — Caution', icon: ShieldAlert, cls: 'verdict-caution', color: 'var(--yellow)', bg: 'rgba(245,166,35,0.08)', border: 'rgba(245,166,35,0.3)' };
  }
  if (pctOfBalance > 15 || pctOfMonthlyIncome > 20) {
    return { label: 'Manageable', icon: ShieldCheck, cls: 'verdict-safe', color: '#6B8FF0', bg: 'rgba(65,105,225,0.08)', border: 'rgba(65,105,225,0.3)' };
  }
  return { label: 'Looks Good', icon: ShieldCheck, cls: 'verdict-safe', color: 'var(--green)', bg: 'rgba(46,204,113,0.08)', border: 'rgba(46,204,113,0.3)' };
}

export default function ExpenseViabilityCalc() {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [finances, setFinances] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    getDashboard().then(r => setFinances(r.data));
  }, []);

  function calculate() {
    if (!amount || !finances) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    const balance = finances.total_balance || 0;
    const income  = finances.this_month_income || 1;
    const spend   = finances.this_month_spend || 0;
    const dailySpend = spend > 0 ? spend / 30 : 1;

    const remainingBalance = balance - val;
    const pctOfBalance     = balance > 0 ? (val / balance) * 100 : 100;
    const pctOfMonthlyIncome = (val / income) * 100;
    const daysOfSpending   = val / dailySpend;

    setResult({
      val,
      remainingBalance,
      pctOfBalance: Math.min(pctOfBalance, 100),
      pctOfMonthlyIncome,
      daysOfSpending,
      verdict: getVerdict(pctOfBalance, pctOfMonthlyIncome, daysOfSpending),
    });
  }

  const VerdictIcon = result?.verdict?.icon || Calculator;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: 'var(--accent-glow)', border: '1.5px solid var(--accent-border)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Calculator size={15} color="var(--accent-light)" />
        </div>
        <div>
          <h3 className="section-title" style={{ marginBottom: 0 }}>Expense Viability</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Can you afford it?</p>
        </div>
      </div>

      {/* Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Planned Amount (₹)</label>
            <input
              id="viability-amount"
              type="number"
              className="form-input"
              placeholder="e.g. 15000"
              value={amount}
              onChange={e => { setAmount(e.target.value); setResult(null); }}
              onKeyDown={e => e.key === 'Enter' && calculate()}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">What for? (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. New headphones"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={calculate} disabled={!amount || !finances} style={{ alignSelf: 'flex-start' }}>
          <Calculator size={14} /> Analyse
        </button>
      </div>

      {/* Result */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
          {/* Verdict banner */}
          <div style={{
            padding: '12px 16px',
            borderRadius: 4,
            border: `1.5px solid ${result.verdict.border}`,
            background: result.verdict.bg,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <VerdictIcon size={18} color={result.verdict.color} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: result.verdict.color, fontFamily: "'Merriweather', serif", letterSpacing: 0.3 }}>
                {result.verdict.label}
              </div>
              {note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{note}</div>}
            </div>
            <div style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: result.verdict.color }}>
              {fmt(result.val)}
            </div>
          </div>

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Remaining Balance', value: fmt(result.remainingBalance), color: result.remainingBalance < 0 ? 'var(--red)' : 'var(--text-primary)' },
              { label: '% of Monthly Income', value: `${result.pctOfMonthlyIncome.toFixed(1)}%`, color: result.pctOfMonthlyIncome > 50 ? 'var(--red)' : 'var(--yellow)' },
              { label: '% of Total Balance', value: `${result.pctOfBalance.toFixed(1)}%`, color: result.pctOfBalance > 40 ? 'var(--red)' : 'var(--text-secondary)' },
              { label: 'Equiv. Days of Spending', value: `${result.daysOfSpending.toFixed(1)} days`, color: 'var(--text-secondary)' },
            ].map(m => (
              <div key={m.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Balance meter */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 5 }}>
              <span>Expense as % of balance</span>
              <span>{result.pctOfBalance.toFixed(1)}%</span>
            </div>
            <div className="viability-meter">
              <div
                className="viability-fill"
                style={{
                  width: `${result.pctOfBalance}%`,
                  background: result.pctOfBalance > 60
                    ? 'var(--red)'
                    : result.pctOfBalance > 30
                    ? 'var(--yellow)'
                    : 'var(--accent)',
                }}
              />
            </div>
          </div>

          {/* Tip */}
          <div style={{ display: 'flex', gap: 8, padding: '8px 10px', background: 'rgba(65,105,225,0.05)', borderRadius: 3, border: '1px solid var(--accent-border)' }}>
            <Info size={12} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent-light)' }} />
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Based on your current balance of <strong style={{ color: 'var(--text-primary)' }}>{fmt(finances?.total_balance)}</strong> and
              this month's income of <strong style={{ color: 'var(--text-primary)' }}>{fmt(finances?.this_month_income)}</strong>.
            </p>
          </div>
        </div>
      )}

      {!result && !amount && finances && (
        <div style={{ display: 'flex', gap: 8, padding: '8px 10px', background: 'rgba(65,105,225,0.05)', borderRadius: 3, border: '1px solid var(--border)' }}>
          <TrendingDown size={12} style={{ flexShrink: 0, marginTop: 1, color: 'var(--text-muted)' }} />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Enter a planned spend amount to see if it's viable given your current balance and income.
          </p>
        </div>
      )}
    </div>
  );
}
