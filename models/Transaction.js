import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
  items: [
    {
      name: String,
      price: Number,
      quantity: Number,
      category: String,
      productId: String,
    },
  ],
  totalAmount: Number,
  cashReceived: Number,
  changeAmount: Number,
  paymentMethod: {
    type: String,
    enum: ["Tunai", "QRIS", "Transfer"],
    default: "Tunai",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  invoiceNumber: String,
  localId: { type: String, required: true, unique: true, index: true },
  cloudBackupStatus: { type: String, enum: ["pending", "synced", "failed", "not_configured"], default: "not_configured" },
  cloudBackupError: String,
  cloudBackedUpAt: Date,
});

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
