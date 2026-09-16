const idNumber = new Intl.NumberFormat("id-ID");

export function formatRp(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "Rp 0";
  return `Rp ${idNumber.format(Math.round(value))}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return idNumber.format(Math.round(value));
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    compactDisplay: "short",
  }).format(value);
}

export function formatDateTimeId(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const date = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}

export function formatDayKey(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toISODateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function calcCartTotal(items: Array<{ price: number; quantity: number }>): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function calcChange(cash: number, total: number): number {
  return cash - total;
}
