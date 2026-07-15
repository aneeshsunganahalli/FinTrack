// Shared formatting utilities

export function fmt(amount, symbol = '₹') {
  if (amount === null || amount === undefined) return `${symbol}0`;
  return `${symbol}${Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtSigned(amount, symbol = '₹') {
  const formatted = fmt(Math.abs(amount), symbol);
  return amount >= 0 ? `+${formatted}` : `-${formatted}`;
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
