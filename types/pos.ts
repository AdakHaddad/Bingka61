export type PaymentMethod = "Tunai" | "QRIS" | "Transfer";

export interface SaleItem {
  name: string;
  price: number;
  quantity: number;
  category?: string;
  productId?: string;
}

export type SyncStatus = "pending" | "syncing" | "synced" | "failed";

export interface PosTransaction {
  localId: string;
  items: SaleItem[];
  totalAmount: number;
  cashReceived: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  timestamp: string;
  invoiceNumber: string;
  syncStatus: SyncStatus;
  synced?: boolean;
  lastSyncedAt?: string;
  syncAttempts: number;
  syncError?: string;
}

export interface SyncSummary {
  pending: number;
  failed: number;
  lastSyncedAt: string | null;
}
