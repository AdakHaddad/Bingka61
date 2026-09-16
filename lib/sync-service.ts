import {
  getPendingTransactions,
  markTransactionSyncAttempt,
  markTransactionSynced,
  markTransactionSyncFailed,
  getLocalTransactions,
} from "./idb";
import type { PosTransaction, SyncSummary } from "../types/pos";

export interface SyncResult {
  attempted: number;
  succeeded: number;
  failed: number;
  pending: number;
}

async function postOne(tx: PosTransaction): Promise<PosTransaction> {
  const res = await fetch("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tx),
  });
  const data = (await res.json()) as { success: boolean; data?: PosTransaction; error?: string };
  if (!data.success) throw new Error(data.error || `Server rejected ${tx.localId}`);
  if (!data.data) throw new Error("Empty server response");
  return data.data;
}

/** Upload all pending local transactions. Idempotent via localId. Never deletes local data. */
export async function syncPendingTransactions(batchSize = 5): Promise<SyncResult> {
  const pending = await getPendingTransactions();
  let succeeded = 0;
  let failed = 0;
  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);
    const outcomes = await Promise.allSettled(
      batch.map(async (tx) => {
        await markTransactionSyncAttempt(tx.localId);
        const server = await postOne(tx);
        await markTransactionSynced(tx.localId, server);
      }),
    );
    for (let k = 0; k < outcomes.length; k += 1) {
      const o = outcomes[k] as PromiseSettledResult<void> | undefined;
      if (o?.status === "fulfilled") succeeded += 1;
      else {
        failed += 1;
        const tx = batch[k];
        if (tx) await markTransactionSyncFailed(tx.localId, o !== undefined && o.status === "rejected" ? o.reason : new Error("sync failed"));
      }
    }
  }
  const remaining = await getPendingTransactions();
  return { attempted: pending.length, succeeded, failed, pending: remaining.length };
}

export async function readSyncSummary(): Promise<SyncSummary> {
  const all = await getLocalTransactions();
  const pending = all.filter((t) => t.syncStatus !== "synced").length;
  const failed = all.filter((t) => t.syncStatus === "failed").length;
  const synced = all
    .filter((t) => t.syncStatus === "synced" && t.lastSyncedAt)
    .sort((a, b) => (b.lastSyncedAt ?? "").localeCompare(a.lastSyncedAt ?? ""));
  return { pending, failed, lastSyncedAt: synced[0]?.lastSyncedAt ?? null };
}
