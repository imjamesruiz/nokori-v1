import type { ItemUnit } from '@/api/types';

export function money(value: number | undefined | null, currency = 'USD'): string {
  const amount = value ?? 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

/** Drops the cents when a number is being read at a glance on a card. */
export function moneyShort(value: number | undefined | null, currency = 'USD'): string {
  const amount = value ?? 0;
  return Number.isInteger(amount) ? money(amount, currency).replace('.00', '') : money(amount, currency);
}

export function percent(value: number | undefined | null): string {
  if (value === undefined || value === null) return '—';
  return `${Math.round(value * 100)}%`;
}

const UNIT_LABELS: Record<ItemUnit, string> = {
  LB: 'lb',
  OZ: 'oz',
  KG: 'kg',
  G: 'g',
  EACH: 'each',
  DOZEN: 'dozen',
  BATCH: 'batch',
  TRAY: 'tray',
  GALLON: 'gal',
  LITER: 'L',
};

export function unitLabel(unit: ItemUnit): string {
  return UNIT_LABELS[unit] ?? unit.toLowerCase();
}

export function quantityWithUnit(quantity: number, unit: ItemUnit): string {
  const trimmed = Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(3)));
  return `${trimmed} ${unitLabel(unit)}`;
}

/** Parses an ISO date (yyyy-mm-dd) as a local calendar date, not as UTC midnight. */
export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function shortDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function weekdayShort(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString('en-US', { weekday: 'short' });
}

export function dateRange(startIso: string, endIso: string): string {
  return `${shortDate(startIso)} – ${shortDate(endIso)}`;
}

export function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');
}
