import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../lib/mongodb";
import Menu from "../../models/Menu";

interface ReorderRow {
  id?: unknown;
  order?: unknown;
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
        const menuItems = await Menu.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean();
        res.status(200).json({ success: true, data: menuItems });
      } catch (error) {
        res.status(400).json({ success: false, data: null, error: error instanceof Error ? error.message : "query failed" });
      }
      break;
    }
    case "POST": {
      try {
        const lastItem = await Menu.findOne({ isActive: true }).sort({ order: -1 });
        const newOrder = lastItem ? lastItem.order + 1 : 0;
        const body = (req.body ?? {}) as Record<string, unknown>;
        const menuItem = await Menu.create({ ...body, order: newOrder });
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
              .filter((r) => typeof r.id === "string")
              .map((r) => Menu.findByIdAndUpdate(String(r.id), { order: Number(r.order) ?? 0 }, { new: true })),
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
