const UNITS = ["B", "KB", "MB", "GB"] as const;

export function formatBytes(bytes: number): string {
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < UNITS.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${UNITS[i]}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ca-ES", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
