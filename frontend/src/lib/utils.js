// Shared formatting utilities

export function fmt(amount, symbol = '₹') {
  if (amount === null || amount === undefined) return `${symbol}0`;
  const sign = amount < 0 ? '-' : '';
  return `${sign}${symbol}${Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtSigned(amount, symbol = '₹') {
  if (amount === null || amount === undefined) return `+${symbol}0`;
  const formatted = `${symbol}${Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
  return amount >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function fmtChartYAxis(v, symbol = '₹') {
  if (v === 0) return `${symbol}0`;
  const val = Math.abs(v);
  let formatted;
  if (val >= 10000000) {
    formatted = `${(val / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
  } else if (val >= 100000) {
    formatted = `${(val / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  } else if (val >= 1000) {
    formatted = `${(val / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  } else {
    formatted = val.toString();
  }
  return v < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

export function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function gainLossColor(value) {
  if (value > 0) return 'var(--accent)';
  if (value < 0) return 'var(--red)';
  return 'var(--text-secondary)';
}

export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

// Category colors fallback palette — royal blue-led
export const CHART_COLORS = [
  '#4169E1', '#E84855', '#6B8FF0', '#F5A623', '#B39DDB',
  '#F97316', '#3B82F6', '#EC4899', '#8B5CF6', '#2ECC71',
  '#06B6D4', '#A78BFA',
];
