import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGear,
  faStore,
  faPrint,
  faPlus,
  faMinus,
  faTrash,
  faRotateRight,
  faMoneyBillWave,
  faPencil,
  faXmark,
  faReceipt,
  faMicrophone,
  faMicrophoneSlash,
  faChartSimple,
  faBowlFood,
  faCheese,
  faBowlRice,
  faCookie,
  faDrumstickBite,
  faLeaf,
  faUtensils,
  faFire,
  faSeedling,
  faMagnifyingGlass,
  faArrowUp,
  faArrowDown,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { faBluetooth } from "@fortawesome/free-brands-svg-icons";
import {
  initDB,
  saveTransactionLocal,
  getCacheItem,
  setCacheItem,
} from "../lib/idb";
import { syncPendingTransactions, readSyncSummary } from "../lib/sync-service";
import { calcCartTotal, formatRp } from "../lib/format";
import type { MenuItem, PaymentMethod, PosTransaction, ReceiptSettings, SyncSummary } from "../types/pos";

/* ---------- non-standard browser APIs, narrowly typed ---------- */
interface BluetoothCharacteristic {
  writeValue: (chunk: BufferSource) => Promise<void>;
}
interface BluetoothGATTService {
  getCharacteristic: (uuid: string) => Promise<BluetoothCharacteristic>;
}
interface BluetoothGATTServer {
  getPrimaryService: (uuid: string) => Promise<BluetoothGATTService>;
}
interface BluetoothDeviceLike {
  gatt?: { connect: () => Promise<BluetoothGATTServer> };
}
interface NavigatorWithBluetooth extends Navigator {
  bluetooth?: { requestDevice: (opts: unknown) => Promise<BluetoothDeviceLike> };
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultLike[];
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

const PRINTER_SERVICE = "000018f0-0000-1000-8000-00805f9b34fb";
const PRINTER_CHAR = "00002af1-0000-1000-8000-00805f9b34fb";

const INITIAL_MENU_ITEMS: MenuItem[] = [
  { name: "Original", price: 23000, category: "Bingke" },
  { name: "Blodar", price: 15000, category: "Bingke" },
  { name: "Berendam", price: 25000, category: "Bingke" },
  { name: "Tar Susu", price: 45000, category: "Bingke" },
  { name: "Keju", price: 25000, category: "Bingke" },
  { name: "Rendang", price: 17000, category: "Rempah" },
  { name: "Kentang", price: 25000, category: "Bingke" },
  { name: "Kari", price: 17000, category: "Rempah" },
  { name: "Ubi", price: 25000, category: "Bingke" },
  { name: "Semur", price: 17000, category: "Rempah" },
  { name: "Daging", price: 30000, category: "Bingke" },
  { name: "Nasi Kebuli", price: 150000, category: "Nasi" },
  { name: "Pandan", price: 25000, category: "Bingke" },
  { name: "Durian", price: 30000, category: "Bingke" },
];

const CASH_VALUES = [1000, 2000, 5000, 10000, 20000, 50000, 100000];

const INDONESIAN_NUMBERS: Record<string, number> = {
  satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10,
};

function levenshtein(a: string, b: string): number {
  const m = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      m[i]![j]! =
        a[i - 1] === b[j - 1] ? (m[i - 1]![j - 1] as number) : 1 + Math.min(m[i - 1]![j] as number, m[i]![j - 1] as number, m[i - 1]![j - 1] as number);
    }
  }
  return m[a.length]![b.length] as number;
}

function makeLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type CartItem = MenuItem & { quantity: number };
type ViewKey = "pos" | "menu" | "receipt";
type PrintStatus = "sending" | "success" | "error" | "saved_no_print" | null;

function iconFor(name: string) {
  const n = name.toLowerCase();
  if (n.includes("keju")) return faCheese;
  if (n.includes("ubi") || n.includes("kentang")) return faSeedling;
  if (n.includes("daging") || n.includes("rendang") || n.includes("semur")) return faDrumstickBite;
  if (n.includes("kari") || n.includes("berendam")) return faBowlFood;
  if (n.includes("kebuli")) return faBowlRice;
  if (n.includes("tar") || n.includes("susu")) return faCookie;
  if (n.includes("pandan")) return faLeaf;
  if (n.includes("blodar")) return faFire;
  if (n.includes("original")) return faUtensils;
  return faUtensils;
}

const FALLBACK_SETTINGS: ReceiptSettings = {
  storeName: "BINGKA61",
  storeAddress: "Jl. KHW HASYIM No. 152",
  storePhone: "+62 859-3305-9045",
  footerGreeting1: "Terima Kasih",
  footerGreeting2: "Atas Kunjungan Anda",
};

export default function AdminPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isFromDB, setIsFromDB] = useState(false);
  const [view, setView] = useState<ViewKey>("pos");
  const [isOnline, setIsOnline] = useState(true);
  const [settings, setSettings] = useState<ReceiptSettings>(FALLBACK_SETTINGS);
  const [items, setItems] = useState<CartItem[]>([]);
  const [cash, setCash] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Tunai");
  const [invoice, setInvoice] = useState<PosTransaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [printStatus, setPrintStatus] = useState<PrintStatus>(null);
  const [printerChar, setPrinterChar] = useState<BluetoothCharacteristic | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [logoESCPOS, setLogoESCPOS] = useState<Uint8Array | null>(null);
  const [autoPrint, setAutoPrint] = useState(true);
  const [summary, setSummary] = useState<SyncSummary>({ pending: 0, failed: 0, lastSyncedAt: null });
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newMenuItem, setNewMenuItem] = useState({ name: "", price: 0, category: "Bingke" });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const menuItemsRef = useRef<MenuItem[]>([]);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const syncBusyRef = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const cashRef = useRef<HTMLInputElement>(null);

  const totalAmount = useMemo(() => calcCartTotal(items), [items]);
  const change = cash - totalAmount;
  const canPay = items.length > 0 && change >= 0 && !loading;

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const m of menuItems) set.add((m.category ?? "Lainnya").trim() || "Lainnya");
    return ["Semua", ...[...set].sort()];
  }, [menuItems]);

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems.filter((m) => {
      if (category !== "Semua" && (m.category ?? "Lainnya") !== category) return false;
      if (q && !`${m.name} ${m.price}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [menuItems, search, category]);

  const refreshSummary = useCallback(async () => {
    try {
      setSummary(await readSyncSummary());
    } catch {
      /* ignore */
    }
  }, []);

  const runSync = useCallback(async () => {
    if (syncBusyRef.current || !navigator.onLine) return;
    syncBusyRef.current = true;
    setSyncing(true);
    try {
      await syncPendingTransactions(5);
    } catch (e) {
      console.error("sync failed", e);
    } finally {
      await refreshSummary();
      syncBusyRef.current = false;
      setSyncing(false);
    }
  }, [refreshSummary]);

  /* ---------- initial load ---------- */
  useEffect(() => {
    menuItemsRef.current = menuItems;
  }, [menuItems]);

  useEffect(() => {
    const savedAuto = localStorage.getItem("autoPrint");
    if (savedAuto !== null) setAutoPrint(savedAuto === "true");

    const boot = async () => {
      await initDB();
      const saved = localStorage.getItem("pending_transactions");
      if (saved) {
        try {
          const queue = JSON.parse(saved) as PosTransaction[];
          for (const tx of queue) {
            await saveTransactionLocal({ ...tx, synced: false, localId: tx.localId || makeLocalId(), syncStatus: "pending", syncAttempts: 0 });
          }
          localStorage.removeItem("pending_transactions");
        } catch (e) {
          console.error("migration failed", e);
        }
      }
      await Promise.all([fetchMenu(), fetchSettings(), refreshSummary(), loadLogo()]);
      if (navigator.onLine) void runSync();
    };
    void boot();

    const on = () => {
      setIsOnline(true);
      void runSync();
    };
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setIsOnline(navigator.onLine);
    const t = window.setInterval(() => {
      if (navigator.onLine) void runSync();
    }, 30000);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- keyboard: / focuses search, Esc clears ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (view !== "pos") return;
      if (e.key === "/" && document.activeElement !== searchRef.current && document.activeElement !== cashRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        if (document.activeElement === searchRef.current) {
          setSearch("");
          searchRef.current?.blur();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  /* ---------- voice ordering (id-ID) ---------- */
  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;
    if (view !== "pos" || isVoiceMuted) {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      return;
    }
    let active = true;
    const rec: SpeechRecognitionLike = new SR();
    rec.lang = "id-ID";
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      if (last?.isFinal) processVoiceCommand(last[0]?.transcript ?? "");
    };
    rec.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") console.warn("voice:", e.error);
    };
    rec.onend = () => {
      if (active) window.setTimeout(() => {
        if (active && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch { /* noop */ }
        }
      }, 150);
    };
    recognitionRef.current = rec;
    try {
      rec.start();
    } catch { /* noop */ }
    return () => {
      active = false;
      rec.abort();
      recognitionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, isVoiceMuted]);

  async function fetchMenu(): Promise<void> {
    try {
      const res = await fetch("/api/menu");
      const data = (await res.json()) as { success: boolean; data?: MenuItem[] };
      if (data.success && data.data && data.data.length > 0) {
        setMenuItems(data.data);
        setIsFromDB(true);
        setCacheItem("menuItems", data.data).catch(() => undefined);
      } else {
        const cached = await getCacheItem<MenuItem[]>("menuItems").catch(() => null);
        if (cached && cached.length > 0) {
          setMenuItems(cached);
          setIsFromDB(true);
        } else {
          setMenuItems(INITIAL_MENU_ITEMS);
          setIsFromDB(false);
        }
      }
    } catch {
      const cached = await getCacheItem<MenuItem[]>("menuItems").catch(() => null);
      if (cached && cached.length > 0) {
        setMenuItems(cached);
        setIsFromDB(true);
      } else {
        setMenuItems(INITIAL_MENU_ITEMS);
        setIsFromDB(false);
      }
    }
  }

  async function fetchSettings(): Promise<void> {
    try {
      const res = await fetch("/api/settings");
      const data = (await res.json()) as { success: boolean; data?: ReceiptSettings };
      if (data.success && data.data) {
        setSettings({ ...FALLBACK_SETTINGS, ...data.data });
        setCacheItem("settings", data.data).catch(() => undefined);
      }
    } catch {
      const cached = await getCacheItem<ReceiptSettings>("settings").catch(() => null);
      if (cached) setSettings({ ...FALLBACK_SETTINGS, ...cached });
    }
  }

  async function loadLogo(): Promise<void> {
    try {
      const img = new Image();
      img.src = "/logostruk.png";
      img.onerror = () => {
        getCacheItem<number[]>("logoESCPOS")
          .then((cached) => {
            if (cached) setLogoESCPOS(new Uint8Array(cached));
          })
          .catch(() => undefined);
      };
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const targetWidth = 256;
        const scale = targetWidth / img.width;
        canvas.width = targetWidth;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const width = canvas.width;
        const height = canvas.height;
        const bytesPerLine = Math.ceil(width / 8);
        const buffer = new Uint8Array(8 + bytesPerLine * height);
        buffer[0] = 0x1d; buffer[1] = 0x76; buffer[2] = 0x30; buffer[3] = 0;
        buffer[4] = bytesPerLine & 0xff;
        buffer[5] = (bytesPerLine >> 8) & 0xff;
        buffer[6] = height & 0xff;
        buffer[7] = (height >> 8) & 0xff;
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const idx = (y * width + x) * 4;
            const r = imageData.data[idx] ?? 0;
            const g = imageData.data[idx + 1] ?? 0;
            const b = imageData.data[idx + 2] ?? 0;
            const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            if (gray < 128) {
              const byteIdx = 8 + y * bytesPerLine + Math.floor(x / 8);
              buffer[byteIdx] = (buffer[byteIdx] as number) | (1 << (7 - (x % 8)));
            }
          }
        }
        setLogoESCPOS(buffer);
        setCacheItem("logoESCPOS", Array.from(buffer)).catch(() => undefined);
      };
    } catch (e) {
      console.error("logo load error", e);
    }
  }

  /* ---------- cart ops ---------- */
  function addToCart(menuItem: MenuItem, qty = 1): void {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.name === menuItem.name);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx]!, quantity: next[idx]!.quantity + qty };
        return next;
      }
      return [...prev, { ...menuItem, quantity: qty }];
    });
    setNotice(null);
  }

  function decItem(name: string): void {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.name === name);
      if (idx === -1) return prev;
      const cur = prev[idx]!;
      if (cur.quantity > 1) {
        const next = [...prev];
        next[idx] = { ...cur, quantity: cur.quantity - 1 };
        return next;
      }
      return prev.filter((i) => i.name !== name);
    });
  }

  function matchSingleItem(text: string): MenuItem | null {
    const menu = menuItemsRef.current;
    const t = text.trim().toLowerCase();
    if (!t) return null;
    for (const item of menu) {
      if (item.name.toLowerCase() === t) return item;
    }
    let best: MenuItem | null = null;
    let bestScore = Infinity;
    for (const item of menu) {
      const name = item.name.toLowerCase();
      const dist = levenshtein(t, name);
      const threshold = Math.max(1, Math.floor(name.length * 0.35));
      if (dist < bestScore && dist <= threshold) {
        bestScore = dist;
        best = item;
      }
    }
    return best;
  }

  function processVoiceCommand(spokenText: string): void {
    const menu = menuItemsRef.current;
    if (menu.length === 0) return;
    const normalized = spokenText.toLowerCase().trim();
    const words = normalized.split(/\s+/);
    const matched: Array<{ item: MenuItem; quantity: number }> = [];
    let i = 0;
    const qtyOf = (w: string | null): number | null => {
      if (!w) return null;
      if (INDONESIAN_NUMBERS[w] !== undefined) return INDONESIAN_NUMBERS[w] as number;
      if (/^\d+$/.test(w)) return parseInt(w, 10);
      return null;
    };
    while (i < words.length) {
      const word = words[i] as string;
      if (qtyOf(word) !== null) {
        i += 1;
        continue;
      }
      if (i + 1 < words.length) {
        const two = `${word} ${words[i + 1]}`;
        const hit = matchSingleItem(two);
        if (hit) {
          const prev = i > 0 ? (words[i - 1] as string) : null;
          const next = i + 2 < words.length ? (words[i + 2] as string) : null;
          matched.push({ item: hit, quantity: qtyOf(prev) ?? qtyOf(next) ?? 1 });
          i += 2;
          if (next && qtyOf(next) !== null) i += 1;
          continue;
        }
      }
      const single = matchSingleItem(word);
      if (single) {
        const prev = i > 0 ? (words[i - 1] as string) : null;
        const next = i + 1 < words.length ? (words[i + 1] as string) : null;
        matched.push({ item: single, quantity: qtyOf(prev) ?? qtyOf(next) ?? 1 });
        i += 1;
        if (next && qtyOf(next) !== null) i += 1;
        continue;
      }
      i += 1;
    }
    if (matched.length === 0) return;
    setItems((prev) => {
      const next = [...prev];
      for (const { item, quantity } of matched) {
        const idx = next.findIndex((x) => x.name === item.name);
        if (idx !== -1) next[idx] = { ...next[idx]!, quantity: next[idx]!.quantity + quantity };
        else next.push({ ...item, quantity });
      }
      return next;
    });
  }

  function handleBarcodeEnter(): void {
    const q = search.trim().toLowerCase();
    if (!q) return;
    const exact = menuItems.find((m) => m.name.toLowerCase() === q || m.name.toLowerCase().replace(/\s+/g, "") === q.replace(/\s+/g, ""));
    const target = exact ?? (filteredMenu.length === 1 ? filteredMenu[0] : undefined);
    if (target) {
      addToCart(target);
      setSearch("");
    }
  }

  /* ---------- printing ---------- */
  function buildESCPOS(data: PosTransaction): Uint8Array {
    const encoder = new TextEncoder();
    const parts: Uint8Array[] = [];
    parts.push(new Uint8Array([0x1b, 0x40]));
    parts.push(new Uint8Array([0x1b, 0x61, 0x01]));
    if (logoESCPOS) {
      parts.push(logoESCPOS);
      parts.push(encoder.encode("\n"));
    }
    parts.push(new Uint8Array([0x1b, 0x45, 0x01]));
    parts.push(encoder.encode(`${settings.storeName}\n`));
    parts.push(new Uint8Array([0x1b, 0x45, 0x00]));
    parts.push(encoder.encode(`${settings.storeAddress}\n`));
    parts.push(encoder.encode(`Telp: ${settings.storePhone}\n`));
    parts.push(encoder.encode("--------------------------------\n"));
    parts.push(new Uint8Array([0x1b, 0x61, 0x00]));
    parts.push(encoder.encode(`No: ${data.invoiceNumber}\n`));
    const d = new Date(data.timestamp);
    const pad = (n: number): string => String(n).padStart(2, "0");
    parts.push(encoder.encode(`Tanggal: ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}\n`));
    parts.push(encoder.encode(`Bayar: ${data.paymentMethod}\n`));
    parts.push(encoder.encode("--------------------------------\n"));
    parts.push(new Uint8Array([0x1b, 0x45, 0x01]));
    parts.push(encoder.encode("Item      Qty   Harga    Subtotal\n"));
    parts.push(new Uint8Array([0x1b, 0x45, 0x00]));
    for (const item of data.items) {
      const name = item.name.substring(0, 9).padEnd(9);
      const qty = String(item.quantity).padStart(3);
      const price = new Intl.NumberFormat("id-ID").format(item.price).padStart(8);
      const sub = new Intl.NumberFormat("id-ID").format(item.price * item.quantity).padStart(9);
      parts.push(encoder.encode(`${name} ${qty} ${price} ${sub}\n`));
    }
    parts.push(encoder.encode("--------------------------------\n"));
    parts.push(new Uint8Array([0x1b, 0x45, 0x01]));
    const line = (label: string, v: number): string => {
      const val = `Rp. ${new Intl.NumberFormat("id-ID").format(v)}`;
      return `${label.padEnd(15)}${val.padStart(17)}\n`;
    };
    parts.push(encoder.encode(line("Total:", data.totalAmount)));
    parts.push(encoder.encode(line("Tunai:", data.cashReceived)));
    parts.push(encoder.encode(line("Kembali:", data.changeAmount)));
    parts.push(new Uint8Array([0x1b, 0x45, 0x00]));
    parts.push(encoder.encode("--------------------------------\n"));
    parts.push(new Uint8Array([0x1b, 0x61, 0x01]));
    parts.push(encoder.encode(`${settings.footerGreeting1}\n`));
    parts.push(encoder.encode(`${settings.footerGreeting2}\n\n\n\n`));
    parts.push(new Uint8Array([0x1d, 0x56, 0x41, 0x10]));
    const total = parts.reduce((a, c) => a + c.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const p of parts) {
      out.set(p, off);
      off += p.length;
    }
    return out;
  }

  async function connectBluetooth(): Promise<void> {
    try {
      const nav = navigator as NavigatorWithBluetooth;
      if (!nav.bluetooth) {
        alert("Browser tidak mendukung Web Bluetooth. Gunakan Chrome di Android/Windows.");
        return;
      }
      const device = await nav.bluetooth.requestDevice({
        filters: [{ services: [PRINTER_SERVICE] }],
        optionalServices: [PRINTER_SERVICE],
      });
      const server = await device.gatt?.connect();
      if (!server) throw new Error("GATT tidak tersedia");
      const service = await server.getPrimaryService(PRINTER_SERVICE);
      const char = await service.getCharacteristic(PRINTER_CHAR);
      setPrinterChar(char);
      alert("Printer Bluetooth terhubung!");
    } catch (e) {
      alert(`Gagal menghubungkan printer: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  async function printBluetooth(data: PosTransaction): Promise<void> {
    if (!printerChar) {
      alert("Printer Bluetooth belum terhubung!");
      return;
    }
    try {
      setPrintStatus("sending");
      const bytes = buildESCPOS(data);
      for (let i = 0; i < bytes.length; i += 20) {
        await printerChar.writeValue(bytes.slice(i, i + 20));
      }
      setPrintStatus("success");
    } catch (e) {
      console.error(e);
      setPrintStatus("error");
    }
  }

  async function sendToNetworkPrinter(data: PosTransaction): Promise<void> {
    try {
      setPrintStatus("sending");
      const res = await fetch("/api/print-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = (await res.json()) as { success: boolean };
      setPrintStatus(result.success ? "success" : "error");
    } catch (e) {
      console.error(e);
      setPrintStatus("error");
    }
  }

  async function saveTransaction(): Promise<void> {
    if (items.length === 0 || change < 0) {
      alert("Tidak dapat menyimpan. Pastikan ada item dan uang cukup.");
      return;
    }
    setLoading(true);
    const localId = makeLocalId();
    const tx: PosTransaction = {
      localId,
      items: items.map((it) => ({
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        ...(it.category !== undefined ? { category: it.category } : {}),
        ...(it._id !== undefined ? { productId: it._id } : {}),
      })),
      totalAmount,
      cashReceived: cash,
      changeAmount: change,
      paymentMethod,
      timestamp: new Date().toISOString(),
      invoiceNumber: `POS-${localId.slice(-6).toUpperCase()}`,
      syncStatus: "pending",
      synced: false,
      syncAttempts: 0,
    };
    try {
      await saveTransactionLocal(tx);
    } catch (e) {
      console.error("local save failed", e);
      alert("Gagal menyimpan lokal. Coba lagi.");
      setLoading(false);
      return;
    }
    setInvoice(tx);
    if (autoPrint) {
      if (printerChar) void printBluetooth(tx);
      else if (navigator.onLine) void sendToNetworkPrinter(tx);
    } else {
      setPrintStatus("saved_no_print");
    }
    setItems([]);
    setCash(0);
    if (navigator.onLine) void runSync().then(() => refreshSummary());
    else void refreshSummary();
    setLoading(false);
  }

  /* ---------- menu CRUD ---------- */
  async function handleAddMenu(): Promise<void> {
    if (!newMenuItem.name.trim() || newMenuItem.price <= 0 || !isOnline) return;
    setLoading(true);
    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMenuItem),
      });
      const data = (await res.json()) as { success: boolean };
      if (data.success) {
        setNewMenuItem({ name: "", price: 0, category: "Bingke" });
        await fetchMenu();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateMenu(item: MenuItem): Promise<void> {
    setLoading(true);
    try {
      const res = await fetch("/api/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item._id, name: item.name, price: item.price, category: item.category }),
      });
      const data = (await res.json()) as { success: boolean };
      if (data.success) {
        setEditingItem(null);
        await fetchMenu();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteMenu(id: string | undefined): Promise<void> {
    if (!id || !confirm("Hapus menu ini?")) return;
    setLoading(true);
    try {
      await fetch("/api/menu", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await fetchMenu();
    } finally {
      setLoading(false);
    }
  }

  async function persistOrder(next: MenuItem[]): Promise<void> {
    setMenuItems(next);
    try {
      await fetch("/api/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next.map((m, idx) => ({ id: m._id, order: idx }))),
      });
    } catch (e) {
      console.error(e);
    }
  }

  function moveItem(index: number, dir: -1 | 1): void {
    const next = [...menuItems];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const a = next[index]!;
    next[index] = next[j]!;
    next[j] = a;
    void persistOrder(next);
  }

  async function handleSaveSettings(): Promise<void> {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = (await res.json()) as { success: boolean };
      if (data.success) setNotice("Desain struk tersimpan.");
      else setNotice("Gagal menyimpan pengaturan.");
    } catch {
      setNotice("Gagal menyimpan pengaturan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#111827]">
      {/* ===== App bar ===== */}
      <header className="sticky top-0 z-20 border-b border-black/10 bg-black backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <img src="/images/Bingke.svg" alt="Bingka61" className="h-9 w-9 rounded-lg bg-white/10 p-1" />
            <div>
              <p className="text-sm font-extrabold leading-none tracking-wide">BINGKA61 POS</p>
              <p className="mt-0.5 text-[11px] text-white/60">Kasir cepat · online & offline</p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${isOnline ? "bg-[#16A34A]/10 text-[#16A34A] ring-[#16A34A]/30" : "bg-[#DC2626]/10 text-[#DC2626] ring-[#DC2626]/30"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-[#16A34A]" : "bg-[#DC2626] animate-pulse"}`} />
              {isOnline ? "Online" : "Offline"}
            </span>
            {syncing ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FECE14]/40 px-2.5 py-1 text-xs font-semibold text-black ring-1 ring-black/20">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" /> Syncing…
              </span>
            ) : summary.pending > 0 ? (
              <button onClick={() => void runSync()} disabled={!isOnline} className="rounded-full bg-[#D97706]/10 px-2.5 py-1 text-xs font-semibold text-[#D97706] ring-1 ring-[#D97706]/30 hover:bg-[#D97706]/20 disabled:opacity-50">
                ⚠ {summary.pending} pending{summary.failed > 0 ? ` · ${summary.failed} gagal` : ""}
              </button>
            ) : (
              <span className="rounded-full bg-[#16A34A]/10 px-2.5 py-1 text-xs font-semibold text-[#16A34A] ring-1 ring-[#16A34A]/30">✓ Ter-backup</span>
            )}
            <button onClick={() => void runSync()} disabled={!isOnline || syncing || summary.pending === 0} className="rounded bg-[#FECE14] p-2 text-black hover:bg-[#FECE14]/80 disabled:bg-white/10 disabled:text-white/40" title="Sync sekarang">
              <FontAwesomeIcon icon={faRotateRight} spin={syncing} />
            </button>
            <label className="flex items-center gap-2 rounded bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white ring-1 ring-white/20">
              CETAK OTOMATIS
              <button
                onClick={() => {
                  const v = !autoPrint;
                  setAutoPrint(v);
                  localStorage.setItem("autoPrint", String(v));
                }}
                className={`flex h-5 w-10 items-center rounded-full p-0.5 transition-colors ${autoPrint ? "bg-[#16A34A]" : "bg-white/25"}`}
                aria-label="toggle autoprint"
              >
                <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${autoPrint ? "translate-x-5" : ""}`} />
              </button>
            </label>
            <nav className="flex items-center gap-1.5">
              <TabButton active={view === "pos"} onClick={() => setView("pos")} icon={faStore} label="Kasir" />
              <TabButton active={view === "menu"} onClick={() => setView("menu")} icon={faGear} label="Menu" />
              <TabButton active={view === "receipt"} onClick={() => setView("receipt")} icon={faReceipt} label="Struk" />
              <Link href="/stats" className="rounded bg-[#FECE14] p-2.5 text-black hover:bg-[#FECE14]/80" title="Dashboard">
                <FontAwesomeIcon icon={faChartSimple} />
              </Link>
              <button onClick={() => void connectBluetooth()} className={`rounded p-2.5 ${printerChar ? "bg-[#16A34A] text-white" : "bg-white/10 text-white hover:bg-white/20"}`} title={printerChar ? "Printer terhubung" : "Hubungkan printer"}>
                <FontAwesomeIcon icon={printerChar ? faPrint : faBluetooth} />
              </button>
              <button onClick={() => setIsVoiceMuted((v) => !v)} className={`rounded p-2.5 text-white ${isVoiceMuted ? "bg-[#D97706]" : "bg-[#16A34A]"}`} title="Voice order">
                <FontAwesomeIcon icon={isVoiceMuted ? faMicrophoneSlash : faMicrophone} />
              </button>
            </nav>
          </div>
        </div>
        {!isOnline && (
          <div className="border-t border-[#DC2626]/20 bg-[#DC2626]/10 px-4 py-1.5 text-center text-xs text-[#7F1D1D]">
            Mode offline — transaksi tersimpan lokal & otomatis tersync saat online.
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4">
        {notice && (
          <div className="mb-3 flex items-center justify-between rounded bg-[#16A34A]/10 px-4 py-2.5 text-sm text-[#15803D] ring-1 ring-[#16A34A]/30">
            <span className="inline-flex items-center gap-2"><FontAwesomeIcon icon={faCheck} /> {notice}</span>
            <button onClick={() => setNotice(null)} className="text-[#15803D]/70 hover:text-[#15803D]"><FontAwesomeIcon icon={faXmark} /></button>
          </div>
        )}

        {view === "pos" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
            {/* ===== Products ===== */}
            <section className="rounded-lg bg-white p-4 ring-1 ring-black/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBarcodeEnter();
                    }}
                    placeholder="Cari menu / scan barcode lalu Enter…  ( / fokus )"
                    className="w-full rounded bg-black/[0.04] py-2.5 pl-9 pr-3 text-sm text-[#111827] placeholder:text-[#6B7280] outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-black"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#374151]">
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#6B7280]">{filteredMenu.length} menu</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${category === c ? "bg-[#FECE14] text-black shadow-md shadow-black/10" : "bg-black/[0.04] text-[#374151] ring-1 ring-black/10 hover:bg-black/10"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {filteredMenu.length === 0 ? (
                <div className="mt-6 rounded border border-dashed border-black/10 bg-black/[0.04]/50 p-8 text-center">
                  <p className="font-bold text-[#374151]">Menu tidak ditemukan</p>
                  <p className="mt-1 text-sm text-[#6B7280]">Coba kata kunci lain atau tambah menu baru di tab Menu.</p>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                  {filteredMenu.map((m) => {
                    const qty = items.find((i) => i.name === m.name)?.quantity ?? 0;
                    return (
                      <button
                        key={m._id ?? m.name}
                        onClick={() => addToCart(m)}
                        className="group relative overflow-hidden rounded bg-black/[0.04] p-3 text-left ring-1 ring-black/10 transition hover:bg-black/10/80 hover:ring-black/40 active:scale-[0.98]"
                      >
                        <FontAwesomeIcon icon={iconFor(m.name)} className="absolute -bottom-2 -right-2 text-4xl text-black/5 transition group-hover:text-black/10" />
                        <FontAwesomeIcon icon={iconFor(m.name)} className="mb-2 text-xl text-[#D97706]" />
                        <p className="truncate text-[13px] font-bold">{m.name}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-[#6B7280]">{formatRp(m.price)}</p>
                        {qty > 0 && (
                          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#16A34A] text-[11px] font-extrabold text-white shadow">
                            {qty}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ===== Checkout ===== */}
            <aside className="h-fit rounded-lg bg-white p-4 ring-1 ring-black/10 lg:sticky lg:top-[76px]">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold tracking-wide text-[#111827]">PESANAN AKTIF</h2>
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-bold text-[#6B7280] ring-1 ring-black/10">
                  {items.reduce((a, i) => a + i.quantity, 0)} item
                </span>
              </div>

              {items.length === 0 ? (
                <div className="mt-3 rounded bg-black/[0.04] p-6 text-center text-sm text-[#6B7280]">
                  Ketuk menu untuk menambah pesanan.<br />Bisa juga pakai suara / barcode.
                </div>
              ) : (
                <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <li key={item.name} className="flex items-center gap-2 rounded bg-black/[0.04] p-2 ring-1 ring-black/10">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold">{item.name}</p>
                        <p className="text-[11px] text-[#6B7280]">{formatRp(item.price)} × {item.quantity} = <span className="font-bold text-[#111827]">{formatRp(item.price * item.quantity)}</span></p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => decItem(item.name)} className="rounded bg-black/10 p-1.5 text-xs hover:bg-black/20" aria-label="kurangi"><FontAwesomeIcon icon={faMinus} /></button>
                        <span className="w-6 text-center text-sm font-extrabold">{item.quantity}</span>
                        <button onClick={() => addToCart(item)} className="rounded-lg bg-[#16A34A] p-1.5 text-xs hover:bg-[#15803D]" aria-label="tambah"><FontAwesomeIcon icon={faPlus} /></button>
                        <button onClick={() => setItems((p) => p.filter((x) => x.name !== item.name))} className="rounded bg-[#DC2626] p-1.5 text-xs text-white hover:bg-[#B91C1C]" aria-label="hapus"><FontAwesomeIcon icon={faTrash} /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-bold tracking-wide text-[#6B7280]">METODE BAYAR</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["Tunai", "QRIS", "Transfer"] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setPaymentMethod(m);
                        if (m !== "Tunai") setCash(totalAmount);
                      }}
                      className={`rounded py-2 text-[13px] font-extrabold transition ${paymentMethod === m ? "bg-[#FECE14] text-black shadow-md shadow-black/10" : "bg-black/[0.04] text-[#374151] ring-1 ring-black/10 hover:bg-black/10"}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {CASH_VALUES.map((v) => (
                  <button key={v} onClick={() => setCash((c) => c + v)} className="rounded-lg bg-black/[0.04] py-1.5 text-[11px] font-bold text-[#111827] ring-1 ring-black/10 hover:bg-black/10">
                    +{(v / 1000).toString()}k
                  </button>
                ))}
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                <button onClick={() => setCash(totalAmount)} className="rounded-lg bg-black/[0.04] py-2 text-xs font-extrabold text-[#16A34A] ring-1 ring-[#16A34A]/30 hover:bg-black/10">UANG PAS</button>
                <button onClick={() => { setItems([]); setCash(0); }} className="rounded bg-black/[0.04] py-2 text-xs font-extrabold text-[#DC2626] ring-1 ring-[#DC2626]/20 hover:bg-black/10">RESET</button>
              </div>

              <div className="mt-3 space-y-2 rounded bg-black/[0.04] p-3 ring-1 ring-black/10">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Total</span>
                  <span className="text-lg font-extrabold">{formatRp(totalAmount)}</span>
                </div>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-[#6B7280]">TUNAI DITERIMA (Enter = bayar)</span>
                  <input
                    ref={cashRef}
                    type="number"
                    value={cash || ""}
                    placeholder="0"
                    onChange={(e) => setCash(parseFloat(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canPay) void saveTransaction();
                    }}
                    className="w-full rounded bg-white px-3 py-2.5 text-lg font-extrabold outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-black"
                  />
                </label>
                <div className={`flex justify-between rounded-lg px-2 py-1.5 text-sm font-bold ${change < 0 ? "bg-[#DC2626]/10 text-[#DC2626]" : "bg-[#16A34A]/10 text-[#16A34A]"}`}>
                  <span>Kembali</span>
                  <span>{formatRp(Math.max(0, change))}</span>
                </div>
                {change < 0 && totalAmount > 0 && (
                  <p className="text-xs text-[#DC2626]">Kurang {formatRp(-change)}</p>
                )}
              </div>

              <button
                onClick={() => void saveTransaction()}
                disabled={!canPay}
                className={`mt-3 w-full rounded py-3 text-sm font-extrabold tracking-wide transition ${canPay ? "bg-[#16A34A] text-white shadow-lg shadow-black/10 hover:bg-[#15803D]" : "cursor-not-allowed bg-black/[0.04] text-[#6B7280]"}`}
              >
                {loading ? "MEMPROSES…" : `BAYAR ${formatRp(totalAmount)}`}
              </button>

              {printStatus && (
                <div className={`mt-2 rounded px-3 py-2 text-center text-xs font-bold ${printStatus === "error" ? "bg-[#DC2626]/10 text-[#DC2626]" : "bg-[#16A34A]/10 text-[#16A34A]"}`}>
                  {printStatus === "sending" && "Mengirim ke printer…"}
                  {printStatus === "success" && "✓ Struk berhasil dicetak & tersimpan."}
                  {printStatus === "saved_no_print" && "Transaksi tersimpan (tanpa cetak)."}
                  {printStatus === "error" && "Gagal mencetak — transaksi tetap aman."}
                  {(printStatus === "error" || printStatus === "saved_no_print") && invoice && (
                    <button onClick={() => { if (printerChar) void printBluetooth(invoice); else if (navigator.onLine) void sendToNetworkPrinter(invoice); }} className="ml-2 underline">
                      Cetak sekarang
                    </button>
                  )}
                </div>
              )}

              {invoice && (
                <div className="mt-2 flex gap-1.5">
                  <button
                    onClick={() => { if (printerChar) void printBluetooth(invoice); else if (navigator.onLine) void sendToNetworkPrinter(invoice); else alert("Offline: hubungkan printer Bluetooth."); }}
                    className="flex-1 rounded bg-black py-2 text-xs font-extrabold text-white hover:bg-black/80"
                  >
                    <FontAwesomeIcon icon={faPrint} className="mr-1" /> CETAK ULANG
                  </button>
                  <Link href="/stats" className="flex-1 rounded bg-black py-2 text-center text-xs font-extrabold text-white hover:bg-black/80">
                    LIHAT LAPORAN
                  </Link>
                </div>
              )}
              {invoice && (
                <p className="mt-2 text-center text-[11px] text-[#6B7280]">
                  Terakhir: <span className="font-bold text-[#374151]">{invoice.invoiceNumber}</span> · {formatRp(invoice.totalAmount)}
                </p>
              )}
            </aside>
          </div>
        )}

        {view === "menu" && (
          <section className="rounded-lg bg-white p-4 ring-1 ring-black/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold tracking-wide">KELOLA MENU {isFromDB ? "" : "(belum tersimpan ke DB)"}</h2>
              {!isOnline && <span className="rounded-full bg-[#DC2626]/10 px-2.5 py-1 text-xs font-bold text-[#DC2626]">Butuh online untuk ubah menu</span>}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_140px_auto]">
              <input value={newMenuItem.name} disabled={!isOnline} onChange={(e) => setNewMenuItem((s) => ({ ...s, name: e.target.value }))} placeholder="Nama menu baru" className="rounded bg-black/[0.04] px-3 py-2 text-sm outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-black disabled:opacity-50" />
              <input type="number" value={newMenuItem.price || ""} disabled={!isOnline} onChange={(e) => setNewMenuItem((s) => ({ ...s, price: parseInt(e.target.value, 10) || 0 }))} placeholder="Harga" className="rounded bg-black/[0.04] px-3 py-2 text-sm outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-black disabled:opacity-50" />
              <input value={newMenuItem.category} disabled={!isOnline} onChange={(e) => setNewMenuItem((s) => ({ ...s, category: e.target.value }))} placeholder="Kategori" className="rounded bg-black/[0.04] px-3 py-2 text-sm outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-black disabled:opacity-50" />
              <button onClick={() => void handleAddMenu()} disabled={loading || !isOnline || !newMenuItem.name.trim() || newMenuItem.price <= 0} className="rounded bg-[#16A34A] px-4 py-2 text-sm font-extrabold hover:bg-[#15803D] disabled:bg-black/10 disabled:text-black/40">
                <FontAwesomeIcon icon={faPlus} className="mr-1" /> Tambah
              </button>
            </div>

            {!isFromDB && (
              <button
                onClick={() => {
                  if (!confirm("Simpan semua menu awal ke database?")) return;
                  (async () => {
                    setLoading(true);
                    try {
                      for (const item of INITIAL_MENU_ITEMS) {
                        await fetch("/api/menu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
                      }
                      await fetchMenu();
                      setNotice("Menu awal tersimpan ke database.");
                    } finally {
                      setLoading(false);
                    }
                  })();
                }}
                disabled={!isOnline}
                className="mt-3 w-full rounded bg-black py-2.5 text-sm font-extrabold text-white hover:bg-black/80 disabled:bg-black/10"
              >
                <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" /> Simpan menu awal ke database
              </button>
            )}

            <div className="mt-3 overflow-x-auto rounded ring-1 ring-black/10">
              <table className="min-w-full divide-y divide-black/10 text-sm">
                <thead className="bg-black/[0.04] text-[11px] uppercase tracking-wider text-[#6B7280]">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Menu</th>
                    <th className="px-4 py-2.5 text-left">Kategori</th>
                    <th className="px-4 py-2.5 text-right">Harga</th>
                    <th className="px-4 py-2.5 text-right">Urutan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {menuItems.map((m, idx) => (
                    <tr
                      key={m._id ?? m.name}
                      draggable={isOnline}
                      onDragStart={(e) => {
                        setDraggedIndex(idx);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedIndex === null || draggedIndex === idx) return;
                        const next = [...menuItems];
                        const [d] = next.splice(draggedIndex, 1);
                        next.splice(idx, 0, d!);
                        setDraggedIndex(idx);
                        setMenuItems(next);
                      }}
                      onDragEnd={() => {
                        setDraggedIndex(null);
                        void persistOrder(menuItems);
                      }}
                      className="hover:bg-black/[0.03]"
                    >
                      <td className="px-4 py-2">
                        {editingItem !== null && editingItem._id === m._id ? (
                          <input value={editingItem.name} onChange={(e) => setEditingItem((prev) => (prev ? { ...prev, name: e.target.value } : prev))} className="w-full rounded-lg bg-black/[0.04] px-2 py-1 outline-none ring-1 ring-black" />
                        ) : (
                          <span className="font-bold">{m.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-[#6B7280]">{m.category ?? "-"}</td>
                      <td className="px-4 py-2 text-right">
                        {editingItem !== null && editingItem._id === m._id ? (
                          <input type="number" value={editingItem.price} onChange={(e) => setEditingItem((prev) => (prev ? { ...prev, price: parseInt(e.target.value, 10) || 0 } : prev))} className="w-28 rounded-lg bg-black/[0.04] px-2 py-1 text-right outline-none ring-1 ring-black" />
                        ) : (
                          <span className="font-bold">{formatRp(m.price)}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          {editingItem !== null && editingItem._id === m._id ? (
                            <>
                              <button onClick={() => { if (editingItem) void handleUpdateMenu(editingItem); }} className="rounded-lg bg-[#16A34A] px-2.5 py-1 text-xs font-bold">Simpan</button>
                              <button onClick={() => setEditingItem(null)} className="rounded-lg bg-black/10 px-2.5 py-1 text-xs">Batal</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => moveItem(idx, -1)} className="rounded-lg bg-black/[0.04] p-1.5 hover:bg-black/10" title="Naik"><FontAwesomeIcon icon={faArrowUp} /></button>
                              <button onClick={() => moveItem(idx, 1)} className="rounded-lg bg-black/[0.04] p-1.5 hover:bg-black/10" title="Turun"><FontAwesomeIcon icon={faArrowDown} /></button>
                              <button onClick={() => setEditingItem(m)} disabled={!isOnline} className="rounded bg-black/80 p-1.5 text-white hover:bg-black disabled:opacity-40" title="Edit"><FontAwesomeIcon icon={faPencil} /></button>
                              <button onClick={() => void handleDeleteMenu(m._id)} disabled={!isOnline} className="rounded bg-[#DC2626] p-1.5 text-white hover:bg-[#B91C1C] disabled:opacity-40" title="Hapus"><FontAwesomeIcon icon={faTrash} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-[#6B7280]">Tips: drag baris untuk mengurutkan tampilan di kasir. Urutan tersimpan otomatis.</p>
          </section>
        )}

        {view === "receipt" && (
          <section className="grid gap-4 lg:grid-cols-[300px_1fr]">
            <div className="mx-auto w-[300px] rounded bg-white p-6 text-[#111827] shadow-2xl" style={{ fontFamily: "'Courier New', monospace" }}>
              <div className="mb-4 text-center">
                <p className="text-lg font-bold">{settings.storeName}</p>
                <p className="text-xs uppercase leading-tight">{settings.storeAddress}</p>
                <p className="text-xs">Telp: {settings.storePhone}</p>
                <div className="my-3 border-b border-dashed border-black" />
              </div>
              <div className="mb-3 text-[10px]">
                <div className="flex justify-between"><span>No: INV/CONTOH/001</span><span>10:30</span></div>
                <div className="my-2 border-b border-dashed border-black" />
              </div>
              <div className="mb-3 text-[10px]">
                <div className="mb-1 flex border-b border-black/10 font-bold">
                  <span className="w-1/2">ITEM</span><span className="w-1/6 text-right">QTY</span><span className="w-1/3 text-right">SUBTOTAL</span>
                </div>
                <div className="flex py-1"><span className="w-1/2">Original</span><span className="w-1/6 text-right">2</span><span className="w-1/3 text-right">46.000</span></div>
                <div className="flex py-1"><span className="w-1/2">Keju</span><span className="w-1/6 text-right">1</span><span className="w-1/3 text-right">25.000</span></div>
                <div className="my-2 border-b border-dashed border-black" />
              </div>
              <div className="space-y-1 text-[10px] font-bold">
                <div className="flex justify-between text-xs"><span>TOTAL</span><span>Rp. 71.000</span></div>
                <div className="flex justify-between opacity-70"><span>CASH</span><span>Rp. 100.000</span></div>
                <div className="flex justify-between opacity-70"><span>CHANGE</span><span>Rp. 29.000</span></div>
                <div className="my-3 border-b border-dashed border-black" />
              </div>
              <div className="mt-4 space-y-1 text-center text-[10px] italic">
                <p>{settings.footerGreeting1}</p>
                <p>{settings.footerGreeting2}</p>
              </div>
            </div>

            <div className="h-fit rounded-lg bg-white p-4 ring-1 ring-black/10">
              <h3 className="flex items-center text-sm font-extrabold"><FontAwesomeIcon icon={faPencil} className="mr-2 text-black" /> ISI STRUK</h3>
              <div className="mt-3 space-y-3">
                <Field label="NAMA TOKO">
                  <input value={settings.storeName} onChange={(e) => setSettings((s) => ({ ...s, storeName: e.target.value }))} className="w-full rounded bg-black/[0.04] px-3 py-2 text-sm outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-black" />
                </Field>
                <Field label="ALAMAT">
                  <textarea rows={2} value={settings.storeAddress} onChange={(e) => setSettings((s) => ({ ...s, storeAddress: e.target.value }))} className="w-full rounded bg-black/[0.04] px-3 py-2 text-sm outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-black" />
                </Field>
                <Field label="TELEPON">
                  <input value={settings.storePhone} onChange={(e) => setSettings((s) => ({ ...s, storePhone: e.target.value }))} className="w-full rounded bg-black/[0.04] px-3 py-2 text-sm outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-black" />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="FOOTER 1">
                    <input value={settings.footerGreeting1} onChange={(e) => setSettings((s) => ({ ...s, footerGreeting1: e.target.value }))} className="w-full rounded bg-black/[0.04] px-3 py-2 text-sm outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-black" />
                  </Field>
                  <Field label="FOOTER 2">
                    <input value={settings.footerGreeting2} onChange={(e) => setSettings((s) => ({ ...s, footerGreeting2: e.target.value }))} className="w-full rounded bg-black/[0.04] px-3 py-2 text-sm outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-black" />
                  </Field>
                </div>
              </div>
              <button onClick={() => void handleSaveSettings()} disabled={loading || !isOnline} className="mt-4 w-full rounded bg-black py-3 text-sm font-extrabold text-white hover:bg-black/80 disabled:bg-black/10 disabled:text-black/40">
                {loading ? "MENYIMPAN…" : isOnline ? "SIMPAN DESAIN STRUK" : "OFFLINE — TIDAK BISA SIMPAN"}
              </button>
              <div className="mt-2 flex gap-1.5">
                <button
                  onClick={() => {
                    if (!printerChar) {
                      alert("Hubungkan printer Bluetooth dulu.");
                      return;
                    }
                    (async () => {
                      try {
                        const enc = new TextEncoder();
                        const bytes = new Uint8Array([0x1b, 0x40, 0x1b, 0x61, 0x01, ...enc.encode("TEST PRINT\nBINGKA61\n\n\n\n"), 0x1d, 0x56, 0x41, 0x10]);
                        for (let i = 0; i < bytes.length; i += 20) {
                          await printerChar.writeValue(bytes.slice(i, i + 20));
                        }
                        setNotice("Test print terkirim.");
                      } catch {
                        setNotice("Gagal test print.");
                      }
                    })();
                  }}
                  className="flex-1 rounded bg-black/[0.04] py-2 text-xs font-bold ring-1 ring-black/10 hover:bg-black/10"
                >
                  Test Print
                </button>
                <button
                  onClick={() => {
                    if (!printerChar) {
                      alert("Hubungkan printer Bluetooth dulu.");
                      return;
                    }
                    printerChar.writeValue(new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa])).catch(() => setNotice("Gagal membuka laci."));
                  }}
                  className="flex-1 rounded bg-black/[0.04] py-2 text-xs font-bold ring-1 ring-black/10 hover:bg-black/10"
                >
                  Buka Laci
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: typeof faStore; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded px-3 py-2 text-xs font-extrabold transition ${active ? "bg-[#FECE14] text-black shadow-md shadow-black/10" : "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20"}`}
    >
      <FontAwesomeIcon icon={icon} /> <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold tracking-wider text-[#6B7280]">{label}</span>
      {children}
    </label>
  );
}
