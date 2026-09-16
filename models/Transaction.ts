import mongoose, { Document, Model, Schema } from "mongoose";
import type { PaymentMethod } from "../types/pos";

export interface TransactionItemDoc {
  name: string;
  price: number;
  quantity: number;
  category?: string;
  productId?: string;
}

export interface TransactionDoc extends Document {
  items: TransactionItemDoc[];
  totalAmount: number;
  cashReceived: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  timestamp: Date;
  invoiceNumber: string;
  localId: string;
  cloudBackupStatus: "pending" | "synced" | "failed" | "not_configured";
  cloudBackupError?: string;
  cloudBackedUpAt?: Date;
}

const TransactionSchema = new Schema<TransactionDoc>({
  items: [
    {
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      category: { type: String },
      productId: { type: String },
    },
  ],
  totalAmount: { type: Number, required: true },
  cashReceived: { type: Number, required: true },
  changeAmount: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ["Tunai", "QRIS", "Transfer"],
    default: "Tunai",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  invoiceNumber: { type: String },
  localId: { type: String, required: true, unique: true, index: true },
  cloudBackupStatus: {
    type: String,
    enum: ["pending", "synced", "failed", "not_configured"],
    default: "not_configured",
  },
  cloudBackupError: { type: String },
  cloudBackedUpAt: { type: Date },
});

const Transaction: Model<TransactionDoc> =
  mongoose.models.Transaction ?? mongoose.model<TransactionDoc>("Transaction", TransactionSchema);

export default Transaction;
