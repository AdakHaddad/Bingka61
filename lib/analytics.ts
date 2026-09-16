import { endOfDay, startOfDay, subDays } from "date-fns";
import type { DateRangeKey, PosTransaction } from "../types/pos";

export interface DateWindow {
  start: Date | null;
  end: Date | null;
}

export function resolveDateWindow(
  range: DateRangeKey,
  startInput: string,
  endInput: string,
  now = new Date(),
): DateWindow {
  switch (range) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case "week":
      return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    case "month":
      return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
    case "custom": {
      const s = startInput ? startOfDay(new Date(`${startInput}T00:00:00`)) : null;
      const e = endInput ? endOfDay(new Date(`${endInput}T23:59:59`)) : null;
      return { start: s && !Number.isNaN(s.getTime()) ? s : null, end: e && !Number.isNaN(e.getTime()) ? e : null };
    }
    case "all":
    default:
      return { start: null, end: null };
  }
}

export function filterTransactions(
  transactions: PosTransaction[],
  opts: {
    start: Date | null;
    end: Date | null;
    paymentMethod?: string;
    category?: string;
    search?: string;
  },
): PosTransaction[] {
  const q = (opts.search ?? "").trim().toLowerCase();
  return transactions.filter((t) => {
    const ts = new Date(t.timestamp);
    if (Number.isNaN(ts.getTime())) return false;
    if (opts.start && ts < opts.start) return false;
    if (opts.end && ts > opts.end) return false;
    if (opts.paymentMethod && opts.paymentMethod !== "all" && t.paymentMethod !== opts.paymentMethod) return false;
    if (opts.category && opts.category !== "all") {
      const hit = t.items.some((i) => (i.category ?? "") === opts.category);
      if (!hit) return false;
    }
    if (q) {
      const hay = `${t.invoiceNumber} ${t.items.map((i) => i.name).join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export interface OverviewMetrics {
  revenue: number;
  transactions: number;
  itemsSold: number;
  avgTransaction: number;
}

export function calcOverview(transactions: PosTransaction[]): OverviewMetrics {
  const revenue = transactions.reduce((s, t) => s + (t.totalAmount || 0), 0);
  const itemsSold = transactions.reduce(
    (s, t) => s + t.items.reduce((a, i) => a + (i.quantity || 0), 0),
    0,
  );
  return {
    revenue,
    transactions: transactions.length,
    itemsSold,
    avgTransaction: transactions.length > 0 ? revenue / transactions.length : 0,
  };
}

export interface DayBucket {
  date: string;
  revenue: number;
  transactions: number;
  items: number;
}

export function bucketByDay(transactions: PosTransaction[]): DayBucket[] {
  const map = new Map<string, DayBucket>();
  for (const t of transactions) {
    const d = new Date(t.timestamp);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const cur = map.get(key) ?? { date: key, revenue: 0, transactions: 0, items: 0 };
    cur.revenue += t.totalAmount || 0;
    cur.transactions += 1;
    cur.items += t.items.reduce((a, i) => a + (i.quantity || 0), 0);
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export interface ProductRow {
  name: string;
  category: string;
  quantity: number;
  revenue: number;
}

export function bucketByProduct(transactions: PosTransaction[]): ProductRow[] {
  const map = new Map<string, ProductRow>();
  for (const t of transactions) {
    for (const item of t.items) {
      const key = item.name;
      const cur = map.get(key) ?? { name: item.name, category: item.category ?? "-", quantity: 0, revenue: 0 };
      cur.quantity += item.quantity || 0;
      cur.revenue += (item.price || 0) * (item.quantity || 0);
      if (item.category) cur.category = item.category;
      map.set(key, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export interface CategoryRow {
  category: string;
  quantity: number;
  revenue: number;
  transactions: number;
}

export function bucketByCategory(transactions: PosTransaction[]): CategoryRow[] {
  const map = new Map<string, CategoryRow>();
  for (const t of transactions) {
    const seen = new Set<string>();
    for (const item of t.items) {
      const cat = item.category?.trim() || "Lainnya";
      const cur = map.get(cat) ?? { category: cat, quantity: 0, revenue: 0, transactions: 0 };
      cur.quantity += item.quantity || 0;
      cur.revenue += (item.price || 0) * (item.quantity || 0);
      if (!seen.has(cat)) {
        cur.transactions += 1;
        seen.add(cat);
      }
      map.set(cat, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export interface PaymentRow {
  method: string;
  transactions: number;
  amount: number;
  pct: number;
}

export function bucketByPayment(transactions: PosTransaction[]): PaymentRow[] {
  const map = new Map<string, PaymentRow>();
  for (const t of transactions) {
    const m = t.paymentMethod || "Tunai";
    const cur = map.get(m) ?? { method: m, transactions: 0, amount: 0, pct: 0 };
    cur.transactions += 1;
    cur.amount += t.totalAmount || 0;
    map.set(m, cur);
  }
  const total = [...map.values()].reduce((s, r) => s + r.amount, 0);
  return [...map.values()]
    .map((r) => ({ ...r, pct: total > 0 ? (r.amount / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

export interface HourBucket {
  hour: string;
  orders: number;
  revenue: number;
}

export function bucketByHour(transactions: PosTransaction[]): HourBucket[] {
  const buckets: HourBucket[] = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}:00`,
    orders: 0,
    revenue: 0,
  }));
  for (const t of transactions) {
    const d = new Date(t.timestamp);
    if (Number.isNaN(d.getTime())) continue;
    const h = d.getHours();
    const b = buckets[h];
    if (b) {
      b.orders += 1;
      b.revenue += t.totalAmount || 0;
    }
  }
  return buckets;
}
