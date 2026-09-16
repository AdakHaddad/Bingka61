import mongoose, { Document, Model, Schema } from "mongoose";

export interface MenuDoc extends Document {
  name: string;
  price: number;
  category: string;
  displayColor: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MenuSchema = new Schema<MenuDoc>({
  name: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  category: { type: String, default: "default" },
  displayColor: { type: String, default: "bg-yellow-400" },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Menu: Model<MenuDoc> = mongoose.models.Menu ?? mongoose.model<MenuDoc>("Menu", MenuSchema);

export default Menu;
