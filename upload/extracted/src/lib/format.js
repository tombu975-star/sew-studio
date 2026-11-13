export function formatCurrency(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GHS', maximumFractionDigits: 0 }).format(n);
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-GB').format(Number(value) || 0);
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d)) return value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function shortDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d)) return value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function isWithinDays(dateStr, days) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (d - now) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

export function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

export const ORDER_STATUSES = [
  'Enquiry', 'Quoted', 'Consultation', 'Confirmed', 'Deposit Paid', 'In Production',
  'Fitting', 'Alterations', 'Ready', 'Collected/Delivered', 'Completed'
];

export const ACTIVE_STATUSES = ORDER_STATUSES.filter(s => s !== 'Completed' && s !== 'Enquiry' && s !== 'Consultation');