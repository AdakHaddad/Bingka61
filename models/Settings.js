import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: "receipt",
  },
  storeName: {
    type: String,
    default: "BINGKA61",
  },
  storeAddress: {
    type: String,
    default: "Jl. KHW HASYIM No. 152",
  },
  storePhone: {
    type: String,
    default: "+62 859-3305-9045",
  },
  footerGreeting1: {
    type: String,
    default: "Terima Kasih",
  },
  footerGreeting2: {
    type: String,
    default: "Atas Kunjungan Anda",
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);
