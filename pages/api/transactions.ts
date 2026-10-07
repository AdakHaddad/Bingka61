import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../lib/mongodb";
import Transaction from "../../models/Transaction";
import { formatISO } from "date-fns";
import { toPaymentMethod } from "../../types/pos";

interface PostBody {
  localId?: unknown;
  items?: unknown;
  totalAmount?: unknown;
  cashReceived?: unknown;
  changeAmount?: unknown;
  paymentMethod?: unknown;
  timestamp?: unknown;
  invoiceNumber?: unknown;
}

function isValidPostBody(body: PostBody): boolean {
  if (typeof body.localId !== "string" || body.localId.length === 0) return false;
  if (!Array.isArray(body.items) || body.items.length === 0) return false;
  if (typeof body.totalAmount !== "number" || !Number.isFinite(body.totalAmount)) return false;
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const { method } = req;

  try {
    await dbConnect();
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: `Database connection failed: ${error instanceof Error ? error.message : "unknown"}`,
    });
    return;
  }

  switch (method) {
    case "GET": {
      try {
        const transactions = await Transaction.find({}).sort({ timestamp: -1 }).limit(2000).lean();
        res.status(200).json({ success: true, data: transactions });
      } catch (error) {
        res.status(400).json({ success: false, data: null, error: error instanceof Error ? error.message : "query failed" });
      }
      break;
    }
    case "POST": {
      try {
        const body = (req.body ?? {}) as PostBody;
        if (!isValidPostBody(body)) {
          res.status(422).json({ success: false, data: null, error: "Invalid transaction payload" });
          return;
        }
        const localId = body.localId as string;
        const existing = await Transaction.findOne({ localId });
        if (existing) {
          res.status(200).json({ success: true, data: existing, duplicate: true });
          return;
        }
        const occurredAt = body.timestamp ? new Date(String(body.timestamp)) : new Date();
        if (Number.isNaN(occurredAt.getTime())) {
          res.status(422).json({ success: false, data: null, error: "Invalid transaction timestamp" });
          return;
        }
        const dateStr = formatISO(occurredAt, { representation: "date" }).replace(/-/g, "");
        const invoiceNumber =
          typeof body.invoiceNumber === "string" && body.invoiceNumber.length > 0
            ? body.invoiceNumber
            : `BKA-${dateStr}-${localId.slice(-6)}`;
        const transaction = await Transaction.create({
          ...(body as Record<string, unknown>),
          paymentMethod: toPaymentMethod(body.paymentMethod),
          timestamp: occurredAt,
          invoiceNumber,
          cloudBackupStatus: process.env.GOOGLE_BACKUP_URL ? "pending" : "not_configured",
        });
        if (process.env.GOOGLE_BACKUP_URL) {
          const backupUrl = process.env.GOOGLE_BACKUP_URL;
          void fetch(backupUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Idempotency-Key": localId },
            body: JSON.stringify({ idempotencyKey: localId, transaction }),
          })
            .then((response) => {
              if (!response.ok) throw new Error(`Google backup returned ${response.status}`);
              return Transaction.findByIdAndUpdate(transaction._id, {
                cloudBackupStatus: "synced",
                cloudBackedUpAt: new Date(),
                cloudBackupError: undefined,
              });
            })
            .catch((backupError: unknown) =>
              Transaction.findByIdAndUpdate(transaction._id, {
                cloudBackupStatus: "failed",
                cloudBackupError: backupError instanceof Error ? backupError.message : "backup failed",
              }),
            );
        }
        res.status(201).json({ success: true, data: transaction });
      } catch (error) {
        const err = error as { code?: number; message?: string };
        if (err?.code === 11000 && typeof req.body?.localId === "string") {
          const existing = await Transaction.findOne({ localId: req.body.localId });
          res.status(200).json({ success: true, data: existing, duplicate: true });
          return;
        }
        console.error("POST Transaction error:", error);
        res.status(400).json({ success: false, data: null, error: err?.message ?? "Unable to save transaction" });
      }
      break;
    }
    case "DELETE": {
      try {
        const { id } = req.body;
        if (!id) {
          res.status(400).json({ success: false, data: null, error: "ID transaksi diperlukan" });
          return;
        }
        await Transaction.findByIdAndDelete(id);
        res.status(200).json({ success: true, data: null });
      } catch (error) {
        res.status(400).json({ success: false, data: null, error: error instanceof Error ? error.message : "Gagal menghapus transaksi" });
      }
      break;
    }
    default:
      res.status(400).json({ success: false, data: null });
      break;
  }
}
