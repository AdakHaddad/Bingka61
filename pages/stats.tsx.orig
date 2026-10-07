import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft, faBagShopping, faChartLine, faMoneyBillTrendUp, faReceipt,
  faDownload, faPrint, faMagnifyingGlass, faRotateRight,
} from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { getLocalTransactions } from "../lib/idb";
import {
  bucketByCategory, bucketByDay, bucketByHour, bucketByPayment, bucketByProduct,
  calcOverview, filterTransactions, resolveDateWindow,
} from "../lib/analytics";
import { downloadCsv, toCsv } from "../lib/export";
import { formatRp, formatCompact, toISODateInput } from "../lib/format";
import { PAYMENT_METHODS, toPaymentMethod } from "../types/pos";
import type { DateRangeKey, PosTransaction } from "../types/pos";

interface RawTx {
  _id?: string;
  localId?: unknown;
  items?: Array<{ name?: unknown; price?: unknown; quantity?: unknown; category?: unknown; productId?: unknown }>;
  totalAmount?: unknown;
  cashReceived?: unknown;
  changeAmount?: unknown;
  paymentMethod?: unknown;
  timestamp?: unknown;
  invoiceNumber?: unknown;
}

function normalizeTx(raw: RawTx, fallbackId: string): PosTransaction | null {
  const localId = typeof raw.localId === "string" && raw.localId ? raw.localId : fallbackId;
  if (!Array.isArray(raw.items) || raw.items.length === 0) return null;
  const items = raw.items
    .map((i) => ({
      name: String(i.name ?? "Item"),
      price: Number(i.price ?? 0),
      quantity: Number(i.quantity ?? 0),
      ...(typeof i.category === "string" && i.category ? { category: i.category } : {}),
      ...(typeof i.productId === "string" && i.productId ? { productId: i.productId } : {}),
    }))
    .filter((i) => i.quantity > 0);
  if (items.length === 0) return null;
  const ts = raw.timestamp ? new Date(String(raw.timestamp)) : new Date();
  if (Number.isNaN(ts.getTime())) return null;
  const total = Number(raw.totalAmount ?? items.reduce((s, i) => s + i.price * i.quantity, 0));
  return {
    ...(typeof raw._id === "string" ? { _id: raw._id } : {}),
    localId,
    items,
    totalAmount: Number.isFinite(total) ? total : 0,
    cashReceived: Number(raw.cashReceived ?? total) || 0,
    changeAmount: Number(raw.changeAmount ?? 0) || 0,
    paymentMethod: toPaymentMethod(raw.paymentMethod),
    timestamp: ts.toISOString(),
    invoiceNumber: typeof raw.invoiceNumber === "string" && raw.invoiceNumber ? raw.invoiceNumber : localId.slice(-6).toUpperCase(),
    syncStatus: "synced",
    syncAttempts: 0,
  };
}

const RANGES: Array<{ key: DateRangeKey; label: string }> = [
  { key: "today", label: "Hari ini" },
  { key: "yesterday", label: "Kemarin" },
  { key: "week", label: "7 hari" },
  { key: "month", label: "30 hari" },
  { key: "all", label: "Semua" },
  { key: "custom", label: "Custom" },
];

const COLORS = ["#FECE14", "#000000", "#16A34A", "#D97706", "#DC2626", "#78716C", "#A8A29E", "#E7E5E4"];

type ProductSort = "revenue" | "quantity" | "name";

export default function StatsPage() {
  const [all, setAll] = useState<PosTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<DateRangeKey>("today");
  const [startDate, setStartDate] = useState(() => toISODateInput(new Date(Date.now() - 7 * 864e5)));
  const [endDate, setEndDate] = useState(() => toISODateInput(new Date()));
  const [payment, setPayment] = useState("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [productSort, setProductSort] = useState<ProductSort>("revenue");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [serverRes, local] = await Promise.all([
          fetch("/api/transactions").then((r) => r.json() as Promise<{ success: boolean; data?: RawTx[] }>).catch(() => null),
          getLocalTransactions().catch(() => [] as PosTransaction[]),
        ]);
        const server = (serverRes?.data ?? [])
          .map((t, i) => normalizeTx(t, `server-${i}`))
          .filter((t): t is PosTransaction => t !== null);
        const byLocal = new Map<string, PosTransaction>();
        for (const t of server) byLocal.set(t.localId, t);
        for (const t of local) {
          if (!byLocal.has(t.localId)) byLocal.set(t.localId, t);
        }
        if (!cancelled) {
          setAll([...byLocal.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Gagal memuat data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const t of all) for (const i of t.items) s.add(i.category?.trim() || "Lainnya");
    return ["all", ...[...s].sort()];
  }, [all]);

  const filtered = useMemo(() => {
    const w = resolveDateWindow(range, startDate, endDate);
    return filterTransactions(all, {
      start: w.start,
      end: w.end,
      paymentMethod: payment,
      category,
      search,
    });
  }, [all, range, startDate, endDate, payment, category, search]);

  const overview = useMemo(() => calcOverview(filtered), [filtered]);
  const byDay = useMemo(() => bucketByDay(filtered), [filtered]);
  const byHour = useMemo(() => bucketByHour(filtered), [filtered]);
  const byPayment = useMemo(() => bucketByPayment(filtered), [filtered]);
  const byCategory = useMemo(() => bucketByCategory(filtered), [filtered]);
  const products = useMemo(() => {
    const rows = bucketByProduct(filtered);
    const sorted = [...rows];
    if (productSort === "quantity") sorted.sort((a, b) => b.quantity - a.quantity);
    else if (productSort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => b.revenue - a.revenue);
    return sorted;
  }, [filtered, productSort]);

  const yesterdayDelta = useMemo(() => {
    const w = resolveDateWindow("yesterday", startDate, endDate);
    const y = filterTransactions(all, { start: w.start, end: w.end });
    const yRev = y.reduce((s, t) => s + t.totalAmount, 0);
    const t = resolveDateWindow("today", startDate, endDate);
    const today = filterTransactions(all, { start: t.start, end: t.end });
    const tRev = today.reduce((s, x) => s + x.totalAmount, 0);
    const diff = tRev - yRev;
    return { tRev, yRev, diff, pct: yRev > 0 ? (diff / yRev) * 100 : 0 };
  }, [all, startDate, endDate]);

  function exportTransactions(): void {
    const csv = toCsv(
      ["invoice", "timestamp", "payment", "items", "qty", "total", "cash", "change"],
      filtered.map((t) => [
        t.invoiceNumber,
        t.timestamp,
        t.paymentMethod,
        t.items.map((i) => `${i.name} x${i.quantity}`).join("; "),
        t.items.reduce((s, i) => s + i.quantity, 0),
        t.totalAmount,
        t.cashReceived,
        t.changeAmount,
      ]),
    );
    downloadCsv(`transaksi-${range}-${toISODateInput(new Date())}.csv`, csv);
  }

  function exportProducts(): void {
    const csv = toCsv(
      ["product", "category", "qty", "revenue"],
      products.map((p) => [p.name, p.category, p.quantity, p.revenue]),
    );
    downloadCsv(`produk-${range}-${toISODateInput(new Date())}.csv`, csv);
  }

  function exportCategories(): void {
    const csv = toCsv(
      ["category", "qty", "revenue", "transactions"],
      byCategory.map((c) => [c.category, c.quantity, c.revenue, c.transactions]),
    );
    downloadCsv(`kategori-${range}-${toISODateInput(new Date())}.csv`, csv);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-[#374151]">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faRotateRight} spin className="text-xl" />
          <span className="font-semibold">Memuat laporan…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="max-w-md rounded-lg bg-white p-8 text-center ring-1 ring-black/10">
          <p className="font-extrabold text-[#DC2626]">Gagal memuat laporan</p>
          <p className="mt-1 text-sm text-[#6B7280]">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 rounded bg-black px-4 py-2 text-sm font-bold text-white hover:bg-black/80">
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#111827]">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-black backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/admin" className="rounded bg-white/10 p-2.5 text-white ring-1 ring-white/20 hover:bg-white/20" title="Kembali ke kasir">
            <FontAwesomeIcon icon={faArrowLeft} />
          </Link>
          <div>
            <h1 className="text-base font-extrabold leading-none">Dashboard Penjualan</h1>
            <p className="mt-1 text-[11px] text-white/60">{filtered.length} transaksi · {formatRp(overview.revenue)}</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${yesterdayDelta.diff >= 0 ? "bg-[#16A34A]/10 text-[#16A34A] ring-[#16A34A]/30" : "bg-[#DC2626]/10 text-[#DC2626] ring-[#DC2626]/30"}`}>
              Hari ini {formatRp(yesterdayDelta.tRev)} · {yesterdayDelta.diff >= 0 ? "▲" : "▼"} {Math.abs(yesterdayDelta.pct).toFixed(1)}% vs kemarin
            </span>
            <button onClick={exportTransactions} className="rounded bg-white/10 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/20 hover:bg-white/20" title="Export transaksi (CSV)">
              <FontAwesomeIcon icon={faDownload} className="mr-1" /> Transaksi
            </button>
            <button onClick={exportProducts} className="rounded bg-white/10 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/20 hover:bg-white/20" title="Export produk (CSV)">
              <FontAwesomeIcon icon={faDownload} className="mr-1" /> Produk
            </button>
            <button onClick={() => window.print()} className="rounded bg-[#FECE14] px-3 py-2 text-xs font-bold text-black hover:bg-[#FECE14]/80" title="Cetak laporan">
              <FontAwesomeIcon icon={faPrint} className="mr-1" /> Cetak
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-4">
        {/* ===== Filters ===== */}
        <section className="rounded-lg bg-white p-4 ring-1 ring-black/10">
          <div className="flex flex-wrap gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${range === r.key ? "bg-[#FECE14] text-black shadow-md shadow-black/10" : "bg-black/[0.04] text-[#374151] ring-1 ring-black/10 hover:bg-black/10"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {range === "custom" && (
              <>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold tracking-wider text-[#6B7280]">DARI</span>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded bg-black/[0.04] px-3 py-2 text-sm outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-black" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold tracking-wider text-[#6B7280]">SAMPAI</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded bg-black/[0.04] px-3 py-2 text-sm outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-black" />
                </label>
              </>
            )}
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold tracking-wider text-[#6B7280]">PEMBAYARAN</span>
              <select value={payment} onChange={(e) => setPayment(e.target.value)} className="w-full rounded bg-black/[0.04] px-3 py-2 text-sm outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-black">
                <option value="all">Semua</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold tracking-wider text-[#6B7280]">KATEGORI</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded bg-black/[0.04] px-3 py-2 text-sm outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-black">
                {categories.map((c) => (
                  <option key={c} value={c}>{c === "all" ? "Semua" : c}</option>
                ))}
              </select>
            </label>
            <label className={`block ${range === "custom" ? "" : "lg:col-span-2"}`}>
              <span className="mb-1 block text-[10px] font-bold tracking-wider text-[#6B7280]">CARI INVOICE / PRODUK</span>
              <span className="relative block">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="cth: POS- / Keju…" className="w-full rounded bg-black/[0.04] py-2 pl-9 pr-3 text-sm outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-black" />
              </span>
            </label>
          </div>
        </section>

        {/* ===== KPIs ===== */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi title="Omzet" value={formatRp(overview.revenue)} icon={faMoneyBillTrendUp} accent="text-black bg-[#FECE14]/30 ring-black/20" />
          <Kpi title="Transaksi" value={String(overview.transactions)} icon={faChartLine} accent="text-black bg-black/[0.06] ring-black/10" />
          <Kpi title="Item terjual" value={String(overview.itemsSold)} icon={faBagShopping} accent="text-[#16A34A] bg-[#16A34A]/10 ring-[#16A34A]/30" />
          <Kpi title="Rata-rata / transaksi" value={formatRp(overview.avgTransaction)} icon={faReceipt} accent="text-[#D97706] bg-[#D97706]/10 ring-[#D97706]/30" />
        </section>

        {/* ===== Charts row 1 ===== */}
        <section className="grid gap-4 lg:grid-cols-2">
          <Card title="Tren omzet harian" subtitle={`${byDay.length} titik`}>
            {byDay.length === 0 ? (
              <Empty text="Belum ada penjualan pada filter ini." />
            ) : (
              <div className="h-72">
                <ResponsiveContainer>
                  <AreaChart data={byDay}>
                    <defs>
                      <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FECE14" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#FECE14" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(d: string) => format(new Date(`${d}T12:00:00`), "dd/MM")} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(v: number) => formatCompact(v)} axisLine={false} tickLine={false} width={48} />
                    <Tooltip
                      contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, color: "#111827" }}
                      formatter={(v: number | string | Array<number | string> | undefined) => [formatRp(Number(v ?? 0)), "Omzet"]}
                      labelFormatter={(d) => format(new Date(`${String(d)}T12:00:00`), "dd MMMM yyyy", { locale: id })}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#000000" strokeWidth={2.5} fill="url(#revFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
          <Card title="Jam ramai" subtitle="Pesanan per jam">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={byHour}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#6B7280" }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, color: "#111827" }} />
                  <Bar dataKey="orders" fill="#000000" radius={[4, 4, 0, 0]} name="Pesanan" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* ===== Charts row 2 ===== */}
        <section className="grid gap-4 lg:grid-cols-2">
          <Card title="Produk terlaris (omzet)" subtitle={`${products.length} produk`}>
            {products.length === 0 ? (
              <Empty text="Belum ada data produk." />
            ) : (
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={products.slice(0, 8)} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(v: number) => formatCompact(v)} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#111827" }} axisLine={false} tickLine={false} width={92} />
                    <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, color: "#111827" }} formatter={(v: number | string | Array<number | string> | undefined) => [formatRp(Number(v ?? 0)), "Omzet"]} />
                    <Bar dataKey="revenue" fill="#D97706" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
          <Card title="Komposisi pembayaran" subtitle={`${byPayment.length} metode`}>
            {byPayment.length === 0 ? (
              <Empty text="Belum ada data pembayaran." />
            ) : (
              <div className="h-72">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={byPayment} dataKey="amount" nameKey="method" cx="50%" cy="50%" innerRadius={58} outerRadius={98} paddingAngle={4}>
                      {byPayment.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, color: "#111827" }} formatter={(v: number | string | Array<number | string> | undefined) => [formatRp(Number(v ?? 0)), "Omzet"]} />
                    <Legend wrapperStyle={{ color: "#6B7280", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </section>

        {/* ===== Tables ===== */}
        <section className="grid gap-4 xl:grid-cols-5">
          <div className="rounded-lg bg-white ring-1 ring-black/10 xl:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 p-4">
              <div>
                <h2 className="font-extrabold">Performa produk</h2>
                <p className="text-xs text-[#6B7280]">{products.length} produk · klik header untuk urutkan</p>
              </div>
              <button onClick={exportProducts} className="rounded bg-black/[0.04] px-3 py-1.5 text-xs font-bold ring-1 ring-black/10 hover:bg-black/10">
                <FontAwesomeIcon icon={faDownload} className="mr-1" /> CSV
              </button>
            </div>
            <div className="max-h-96 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-white text-[11px] uppercase tracking-wider text-[#6B7280]">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Produk</th>
                    <th className="px-4 py-2.5 text-left">Kategori</th>
                    <th className="px-4 py-2.5 text-right"><SortButton label="Qty" active={productSort === "quantity"} onClick={() => setProductSort("quantity")} /></th>
                    <th className="px-4 py-2.5 text-right"><SortButton label="Omzet" active={productSort === "revenue"} onClick={() => setProductSort("revenue")} /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {products.map((p) => (
                    <tr key={p.name} className="hover:bg-black/[0.03]">
                      <td className="px-4 py-2 font-bold">{p.name}</td>
                      <td className="px-4 py-2 text-[#6B7280]">{p.category}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{p.quantity}</td>
                      <td className="px-4 py-2 text-right font-bold tabular-nums">{formatRp(p.revenue)}</td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-[#6B7280]">Tidak ada data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4 xl:col-span-2">
            <div className="rounded-lg bg-white ring-1 ring-black/10">
              <div className="flex items-center justify-between border-b border-black/10 p-4">
                <h2 className="font-extrabold">Kategori</h2>
                <button onClick={exportCategories} className="rounded bg-black/[0.04] px-3 py-1.5 text-xs font-bold ring-1 ring-black/10 hover:bg-black/10">
                  <FontAwesomeIcon icon={faDownload} className="mr-1" /> CSV
                </button>
              </div>
              <table className="min-w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-[#6B7280]">
                  <tr><th className="px-4 py-2 text-left">Kategori</th><th className="px-4 py-2 text-right">Qty</th><th className="px-4 py-2 text-right">Omzet</th></tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {byCategory.map((c) => (
                    <tr key={c.category} className="hover:bg-black/[0.03]">
                      <td className="px-4 py-2 font-bold">{c.category}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{c.quantity}</td>
                      <td className="px-4 py-2 text-right font-bold tabular-nums">{formatRp(c.revenue)}</td>
                    </tr>
                  ))}
                  {byCategory.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-[#6B7280]">Tidak ada data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg bg-white ring-1 ring-black/10">
              <div className="border-b border-black/10 p-4">
                <h2 className="font-extrabold">Pembayaran</h2>
              </div>
              <table className="min-w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-[#6B7280]">
                  <tr><th className="px-4 py-2 text-left">Metode</th><th className="px-4 py-2 text-right">Trx</th><th className="px-4 py-2 text-right">Nominal</th><th className="px-4 py-2 text-right">%</th></tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {byPayment.map((p) => (
                    <tr key={p.method} className="hover:bg-black/[0.03]">
                      <td className="px-4 py-2"><span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-bold ring-1 ring-black/10">{p.method}</span></td>
                      <td className="px-4 py-2 text-right tabular-nums">{p.transactions}</td>
                      <td className="px-4 py-2 text-right font-bold tabular-nums">{formatRp(p.amount)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{p.pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {byPayment.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-[#6B7280]">Tidak ada data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ===== Recent ===== */}
        <section className="overflow-hidden rounded-lg bg-white ring-1 ring-black/10">
          <div className="flex items-center justify-between border-b border-black/10 p-4">
            <h2 className="font-extrabold">Transaksi terkini</h2>
            <span className="text-xs text-[#6B7280]">{filtered.length} hasil</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-black/[0.04] text-[11px] uppercase tracking-wider text-[#6B7280]">
                <tr>
                  <th className="px-4 py-2.5 text-left">Invoice</th>
                  <th className="px-4 py-2.5 text-left">Waktu</th>
                  <th className="px-4 py-2.5 text-left">Bayar</th>
                  <th className="px-4 py-2.5 text-left">Item</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {filtered.slice(0, 50).map((t) => (
                  <tr key={t.localId} className="hover:bg-black/[0.03]">
                    <td className="whitespace-nowrap px-4 py-2.5 font-bold text-black">{t.invoiceNumber}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[#6B7280]">{format(new Date(t.timestamp), "dd MMM, HH:mm", { locale: id })}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${t.paymentMethod === "QRIS" ? "bg-black/[0.06] text-black" : t.paymentMethod === "Transfer" ? "bg-[#FECE14]/40 text-black" : "bg-[#16A34A]/10 text-[#16A34A]"}`}>
                        {t.paymentMethod}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-2.5 text-[#6B7280]">{t.items.map((i) => `${i.name} (${i.quantity})`).join(", ")}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold tabular-nums">{formatRp(t.totalAmount)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-[#6B7280]">Tidak ada transaksi pada filter ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white p-4 ring-1 ring-black/10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-extrabold">{title}</h2>
        <span className="text-xs text-[#6B7280]">{subtitle}</span>
      </div>
      {children}
    </div>
  );
}

function Kpi({ title, value, icon, accent }: { title: string; value: string; icon: typeof faChartLine; accent: string }) {
  return (
    <div className="rounded-lg bg-white p-4 ring-1 ring-black/10">
      <span className={`inline-flex rounded p-2.5 ring-1 ${accent}`}>
        <FontAwesomeIcon icon={icon} />
      </span>
      <p className="mt-3 text-xs font-semibold text-[#6B7280]">{title}</p>
      <p className="mt-0.5 truncate text-xl font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex h-72 items-center justify-center rounded border border-dashed border-black/10 text-sm text-[#6B7280]">{text}</div>;
}

function SortButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`font-bold uppercase tracking-wider ${active ? "text-black" : "text-[#6B7280] hover:text-[#111827]"}`}>
      {label} {active ? "▼" : ""}
    </button>
  );
}
