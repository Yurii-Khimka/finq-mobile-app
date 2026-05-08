export function formatCurrency(amount: number, currency: 'USD' | 'UAH'): string {
  const symbol = currency === 'USD' ? '$' : '₴';
  const formatted = Math.abs(amount)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  const stripTime = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const diff = stripTime(now) - stripTime(date);
  const oneDay = 86_400_000;

  if (diff < oneDay) return 'Today';
  if (diff < oneDay * 2) return 'Yesterday';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const LABELS: Record<string, string> = {
  mandatory: 'Mandatory',
  non_mandatory: 'Non-Mandatory',
  investments: 'Investments',
  dreams: 'Dreams',
};

export function envelopeLabel(key: string): string {
  return LABELS[key] ?? key;
}
