import type { StartupCostRange } from '../types/opportunity';

export function formatUsd(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `$${value}`;
}

export function formatCostRange(range: StartupCostRange): string {
  return `${formatUsd(range.minUsd)}–${formatUsd(range.maxUsd)}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
