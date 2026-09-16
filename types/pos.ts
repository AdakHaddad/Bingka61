export type PaymentMethod = "Tunai" | "QRIS" | "Transfer";

export const PAYMENT_METHODS: PaymentMethod[] = ["Tunai", "QRIS", "Transfer"];

export interface SaleItem {
  name: string;
  price: number;
  quantity: number;
  category?: string;
  productId?: string;
}

export type SyncStatus = "pending" | "syncing" | "synced" | "failed";

export interface PosTransaction {
  _id?: string;
  localId: string;
  items: SaleItem[];
  totalAmount: number;
  cashReceived: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  timestamp: string;
  invoiceNumber: string;
  syncStatus: SyncStatus;
  /** Legacy flag kept for backwards compatibility with stored records. */
  synced?: boolean;
  lastSyncedAt?: string;
  syncAttempts: number;
  syncError?: string;
  cloudBackupStatus?: "pending" | "synced" | "failed" | "not_configured";
  cloudBackupError?: string | null;
  cloudBackedUpAt?: string | null;
}

export interface SyncSummary {
  pending: number;
  failed: number;
  lastSyncedAt: string | null;
}

export interface MenuItem {
  _id?: string;
  name: string;
  price: number;
  category?: string;
  displayColor?: string;
  order?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReceiptSettings {
  _id?: string;
  key?: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  footerGreeting1: string;
  footerGreeting2: string;
  updatedAt?: string;
}

export interface CartLine extends SaleItem {
  key: string;
}

export type DateRangeKey = "today" | "yesterday" | "week" | "month" | "all" | "custom";

export interface DashboardFilters {
  range: DateRangeKey;
  startDate: string;
  endDate: string;
  paymentMethod: PaymentMethod | "all";
  category: string;
  cashier?: string;
  search?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
  duplicate?: boolean;
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "Tunai" || value === "QRIS" || value === "Transfer";
}

export function toPaymentMethod(value: unknown, fallback: PaymentMethod = "Tunai"): PaymentMethod {
  return isPaymentMethod(value) ? value : fallback;
}
