import { formatDateTimeId } from "../../lib/format";
import type { SyncSummary } from "../../types/pos";

interface Props {
  isOnline: boolean;
  summary: SyncSummary;
  syncing: boolean;
  onSyncNow: () => void;
}

export default function SyncStatusBar({ isOnline, summary, syncing, onSyncNow }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ring-1 ${
          isOnline
            ? "bg-[#16A34A]/10 text-[#16A34A] ring-[#16A34A]/30"
            : "bg-[#DC2626]/10 text-[#DC2626] ring-[#DC2626]/30"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-[#16A34A]" : "bg-[#DC2626] animate-pulse"}`} />
        {isOnline ? "Online" : "Offline — jualan tetap jalan"}
      </span>

      {syncing ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FECE14]/40 px-2.5 py-1 font-semibold text-black ring-1 ring-black/20">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" />
          Syncing…
        </span>
      ) : summary.pending > 0 ? (
        <button
          onClick={onSyncNow}
          disabled={!isOnline}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#D97706]/10 px-2.5 py-1 font-semibold text-[#D97706] ring-1 ring-[#D97706]/30 hover:bg-[#D97706]/20 disabled:cursor-not-allowed disabled:opacity-60"
          title={isOnline ? "Sync sekarang" : "Menunggu koneksi"}
        >
          ⚠ {summary.pending} menunggu sync{summary.failed > 0 ? ` (${summary.failed} gagal)` : ""}
        </button>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#16A34A]/10 px-2.5 py-1 font-semibold text-[#16A34A] ring-1 ring-[#16A34A]/30">
          ✓ Semua ter-backup
        </span>
      )}

      {summary.lastSyncedAt && (
        <span className="hidden text-[11px] text-[#6B7280] sm:inline">
          Terakhir sync: {formatDateTimeId(summary.lastSyncedAt)} · {summary.pending} pending
        </span>
      )}
    </div>
  );
}
