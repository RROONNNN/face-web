export function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB').format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatHours(value: number) {
  return `${value.toFixed(2)}h`;
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value);
}
