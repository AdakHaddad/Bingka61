import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../lib/mongodb";
import Menu from "../../models/Menu";

interface ReorderRow {
  id?: unknown;
  order?: unknown;
}

export const INITIAL_MENU_ITEMS = [
  { name: "Original", price: 23000, category: "Bingke", order: 0 },
  { name: "Blodar", price: 15000, category: "Bingke", order: 1 },
  { name: "Berendam", price: 25000, category: "Bingke", order: 2 },
  { name: "Tar Susu", price: 45000, category: "Bingke", order: 3 },
  { name: "Keju", price: 25000, category: "Bingke", order: 4 },
  { name: "Rendang", price: 17000, category: "Rempah", order: 5 },
  { name: "Kentang", price: 25000, category: "Bingke", order: 6 },
  { name: "Kari", price: 17000, category: "Rempah", order: 7 },
  { name: "Ubi", price: 25000, category: "Bingke", order: 8 },
  { name: "Semur", price: 17000, category: "Rempah", order: 9 },
  { name: "Daging", price: 30000, category: "Bingke", order: 10 },
  { name: "Nasi Kebuli", price: 150000, category: "Nasi", order: 11 },
  { name: "Pandan", price: 25000, category: "Bingke", order: 12 },
  { name: "Durian", price: 30000, category: "Bingke", order: 13 },
];

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
        const existingDocs = await Menu.find({}, { name: 1 }).lean();
        const existingNames = new Set(existingDocs.map((m) => m.name));
        const missing = INITIAL_MENU_ITEMS.filter((it) => !existingNames.has(it.name));
        if (missing.length > 0) {
          const highest = await Menu.findOne({ isActive: { $ne: false } }).sort({ order: -1 }).lean();
          let nextOrder = typeof highest?.order === "number" && !isNaN(highest.order) ? highest.order + 1 : 0;
          await Menu.insertMany(
            missing.map((item) => ({
              ...item,
              order: nextOrder++,
              isActive: true,
            })),
          );
        }

        const menuItems = await Menu.find({ isActive: { $ne: false } }).sort({ order: 1, createdAt: 1 }).lean();
        res.status(200).json({ success: true, data: menuItems });
      } catch (error) {
        res.status(400).json({ success: false, data: null, error: error instanceof Error ? error.message : "query failed" });
      }
      break;
    }
    case "POST": {
      try {
        const count = await Menu.countDocuments();
        if (count === 0) {
          await Menu.insertMany(INITIAL_MENU_ITEMS.map((item, idx) => ({ ...item, order: idx, isActive: true })));
        }

        const body = (req.body ?? {}) as Record<string, unknown>;
        const name = String(body.name ?? "").trim();
        if (!name) {
          res.status(422).json({ success: false, data: null, error: "Nama menu tidak boleh kosong" });
          return;
        }

        const price = Number(body.price);
        if (!Number.isFinite(price) || price <= 0) {
          res.status(422).json({ success: false, data: null, error: "Harga menu harus lebih dari 0" });
          return;
        }

        const category = String(body.category || "Bingke").trim() || "Bingke";

        const lastItem = await Menu.findOne({ isActive: { $ne: false } }).sort({ order: -1 });
        const newOrder = typeof lastItem?.order === "number" && !isNaN(lastItem.order) ? lastItem.order + 1 : 0;

        // Check if item already exists (including soft-deleted)
        const existing = await Menu.findOne({ name });
        if (existing) {
          if (!existing.isActive) {
            existing.isActive = true;
            existing.price = price;
            existing.category = category;
            existing.order = typeof body.order === "number" && !isNaN(body.order) ? body.order : newOrder;
            await existing.save();
            res.status(200).json({ success: true, data: existing });
            return;
          }
          res.status(400).json({ success: false, data: null, error: `Menu "${name}" sudah ada` });
          return;
        }

        const menuItem = await Menu.create({
          ...body,
          name,
          price,
          category,
          order: typeof body.order === "number" && !isNaN(body.order) ? body.order : newOrder,
          isActive: true,
        });
        res.status(201).json({ success: true, data: menuItem });
      } catch (error) {
        res.status(400).json({ success: false, data: null, error: error instanceof Error ? error.message : "create failed" });
      }
      break;
    }
    case "PUT": {
      try {
        if (Array.isArray(req.body)) {
          const rows = req.body as ReorderRow[];
          await Promise.all(
            rows
              .filter((r) => r.id && typeof r.id === "string")
              .map((r) => {
                const ord = Number(r.order);
                return Menu.findByIdAndUpdate(String(r.id), { order: Number.isFinite(ord) ? ord : 0 }, { new: true });
              }),
          );
          res.status(200).json({ success: true, data: null });
        } else {
          const { id, ...updateData } = (req.body ?? {}) as { id?: string } & Record<string, unknown>;
          if (!id) {
            res.status(422).json({ success: false, data: null, error: "Missing menu id" });
            return;
          }
          const updated = await Menu.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
          if (!updated) {
            res.status(404).json({ success: false, data: null, error: "Menu item not found" });
            return;
          }
          res.status(200).json({ success: true, data: updated });
        }
      } catch (error) {
        res.status(400).json({ success: false, data: null, error: error instanceof Error ? error.message : "update failed" });
      }
      break;
    }
    case "DELETE": {
      try {
        const { id } = (req.body ?? {}) as { id?: string };
        if (!id) {
          res.status(422).json({ success: false, data: null, error: "Missing menu id" });
          return;
        }
        const deleted = await Menu.findByIdAndUpdate(id, { isActive: false }, { new: true });
        if (!deleted) {
          res.status(404).json({ success: false, data: null, error: "Menu item not found" });
          return;
        }
        res.status(200).json({ success: true, data: deleted });
      } catch (error) {
        res.status(400).json({ success: false, data: null, error: error instanceof Error ? error.message : "delete failed" });
      }
      break;
    }
    default:
      res.status(400).json({ success: false, data: null, error: "Invalid method" });
      break;
  }
}
