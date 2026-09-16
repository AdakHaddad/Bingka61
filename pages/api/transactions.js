import dbConnect from "../../lib/mongodb";
import Transaction from "../../models/Transaction";
import { formatISO } from "date-fns";

export default async function handler(req, res) {
  const { method } = req;

  try {
    await dbConnect();
  } catch (error) {
    return res.status(500).json({ success: false, error: "Database connection failed: " + error.message });
  }

  switch (method) {
    case "GET":
      try {
        const transactions = await Transaction.find({});
        res.status(200).json({ success: true, data: transactions });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;
    case "POST":
      try {
        const body = req.body || {};
        if (!body.localId || !Array.isArray(body.items) || body.items.length === 0 || !Number.isFinite(body.totalAmount)) {
          return res.status(422).json({ success: false, error: "Invalid transaction payload" });
        }
        const existing = await Transaction.findOne({ localId: body.localId });
        if (existing) return res.status(200).json({ success: true, data: existing, duplicate: true });
        const occurredAt = body.timestamp ? new Date(body.timestamp) : new Date();
        if (Number.isNaN(occurredAt.getTime())) return res.status(422).json({ success: false, error: "Invalid transaction timestamp" });
        const dateStr = formatISO(occurredAt, { representation: "date" }).replace(/-/g, "");
        const invoiceNumber = body.invoiceNumber || "BKA-" + dateStr + "-" + body.localId.slice(-6);
        const transaction = await Transaction.create({ ...body, timestamp: occurredAt, invoiceNumber, cloudBackupStatus: process.env.GOOGLE_BACKUP_URL ? "pending" : "not_configured" });
        if (process.env.GOOGLE_BACKUP_URL) {
          void fetch(process.env.GOOGLE_BACKUP_URL, {
            method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": body.localId },
            body: JSON.stringify({ idempotencyKey: body.localId, transaction }),
          }).then((response) => {
            if (!response.ok) throw new Error("Google backup returned " + response.status);
            return Transaction.findByIdAndUpdate(transaction._id, { cloudBackupStatus: "synced", cloudBackedUpAt: new Date(), cloudBackupError: null });
          }).catch((backupError) => Transaction.findByIdAndUpdate(transaction._id, { cloudBackupStatus: "failed", cloudBackupError: backupError.message }));
        }
        res.status(201).json({ success: true, data: transaction });
      } catch (error) {
        if (error?.code === 11000 && req.body?.localId) {
          const existing = await Transaction.findOne({ localId: req.body.localId });
          return res.status(200).json({ success: true, data: existing, duplicate: true });
        }
        console.error("POST Transaction error:", error);
        res.status(400).json({ success: false, error: error.message || "Unable to save transaction" });
      }
      break;
    default:
      res.status(400).json({ success: false });
      break;
  }
}
