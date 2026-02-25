export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = units[0] ?? 'KB';

  for (let i = 1; i < units.length && value >= 1024; i += 1) {
    value /= 1024;
    unit = units[i] ?? unit;
  }

  return `${value.toFixed(1)} ${unit}`;
}

export function formatDate(dateIso: string): string {
  return dateIso.slice(0, 10);
}

export function pad(value: string, size: number): string {
  return value.length >= size ? value : `${value}${' '.repeat(size - value.length)}`;
}
