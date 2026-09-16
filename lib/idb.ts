import type { PosTransaction, SyncSummary } from "../types/pos";

const DB_NAME = "bingka61-pos-db";
const DB_VERSION = 3;
const STORE_NAME = "transactions";
const CACHE_STORE_NAME = "cache";
type CacheRecord = { key: string; value: unknown; updatedAt: number };

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Unable to open local POS storage"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "localId" });
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) db.createObjectStore(CACHE_STORE_NAME, { keyPath: "key" });
    };
  });
}

export async function saveTransactionLocal(transaction: PosTransaction): Promise<void> {
  const db = await initDB();
  const record: PosTransaction = { ...transaction, syncStatus: transaction.syncStatus ?? (transaction.synced ? "synced" : "pending"), synced: transaction.synced ?? false, syncAttempts: transaction.syncAttempts ?? 0 };
  await requestResult(db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(record));
}

export async function getLocalTransactions(): Promise<PosTransaction[]> {
  const db = await initDB();
  const records = await requestResult(db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll()) as PosTransaction[];
  return records.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function getPendingTransactions(): Promise<PosTransaction[]> {
  return (await getLocalTransactions()).filter((transaction) => transaction.syncStatus !== "synced" && !transaction.synced);
}

export async function markTransactionSyncAttempt(localId: string): Promise<void> {
  const db = await initDB();
  const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
  const transaction = await requestResult(store.get(localId)) as PosTransaction | undefined;
  if (transaction) await requestResult(store.put({ ...transaction, syncStatus: "syncing", syncAttempts: (transaction.syncAttempts ?? 0) + 1, syncError: undefined }));
}

export async function markTransactionSynced(localId: string, serverData: Partial<PosTransaction>): Promise<void> {
  const db = await initDB();
  const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
  const transaction = await requestResult(store.get(localId)) as PosTransaction | undefined;
  if (transaction) await requestResult(store.put({ ...transaction, ...serverData, synced: true, syncStatus: "synced", lastSyncedAt: new Date().toISOString(), syncError: undefined }));
}

export async function markTransactionSyncFailed(localId: string, error: unknown): Promise<void> {
  const db = await initDB();
  const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
  const transaction = await requestResult(store.get(localId)) as PosTransaction | undefined;
  if (transaction) await requestResult(store.put({ ...transaction, synced: false, syncStatus: "failed", syncError: error instanceof Error ? error.message : "Sync failed" }));
}

export async function removeSyncedTransactions(): Promise<void> { /* Local sales are intentionally never deleted. */ }

export async function getSyncSummary(): Promise<SyncSummary> {
  const transactions = await getLocalTransactions();
  const synced = transactions.filter((transaction) => transaction.syncStatus === "synced" && transaction.lastSyncedAt);
  const latest = synced.sort((a, b) => (b.lastSyncedAt ?? "").localeCompare(a.lastSyncedAt ?? ""))[0];
  return { pending: transactions.filter((transaction) => transaction.syncStatus !== "synced").length, failed: transactions.filter((transaction) => transaction.syncStatus === "failed").length, lastSyncedAt: latest?.lastSyncedAt ?? null };
}

export async function setCacheItem(key: string, value: unknown): Promise<void> {
  const db = await initDB();
  await requestResult(db.transaction(CACHE_STORE_NAME, "readwrite").objectStore(CACHE_STORE_NAME).put({ key, value, updatedAt: Date.now() } satisfies CacheRecord));
}

export async function getCacheItem<T>(key: string): Promise<T | null> {
  const db = await initDB();
  const record = await requestResult(db.transaction(CACHE_STORE_NAME, "readonly").objectStore(CACHE_STORE_NAME).get(key)) as CacheRecord | undefined;
  return (record?.value as T | undefined) ?? null;
}
