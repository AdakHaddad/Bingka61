import mongoose, { Document, Model, Schema } from "mongoose";

export interface SettingsDoc extends Document {
  key: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  footerGreeting1: string;
  footerGreeting2: string;
  updatedAt: Date;
}

const SettingsSchema = new Schema<SettingsDoc>({
  key: { type: String, required: true, unique: true, default: "receipt" },
  storeName: { type: String, default: "BINGKA61" },
  storeAddress: { type: String, default: "Jl. KHW HASYIM No. 152" },
  storePhone: { type: String, default: "+62 859-3305-9045" },
  footerGreeting1: { type: String, default: "Terima Kasih" },
  footerGreeting2: { type: String, default: "Atas Kunjungan Anda" },
  updatedAt: { type: Date, default: Date.now },
});

const Settings: Model<SettingsDoc> =
  mongoose.models.Settings ?? mongoose.model<SettingsDoc>("Settings", SettingsSchema);

export default Settings;
