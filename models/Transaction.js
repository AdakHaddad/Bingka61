import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
  items: [
    {
      name: String,
      price: Number,
      quantity: Number,
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
});

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
