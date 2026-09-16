import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../lib/mongodb";
import Settings from "../../models/Settings";

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
        let settings = await Settings.findOne({ key: "receipt" });
        if (!settings) settings = await Settings.create({ key: "receipt" });
        res.status(200).json({ success: true, data: settings });
      } catch (error) {
        res.status(400).json({ success: false, data: null, error: error instanceof Error ? error.message : "query failed" });
      }
      break;
    }
    case "POST": {
      try {
        const settings = await Settings.findOneAndUpdate(
          { key: "receipt" },
          { ...(req.body as Record<string, unknown>), updatedAt: Date.now() },
          { new: true, upsert: true, runValidators: true },
        );
        res.status(200).json({ success: true, data: settings });
      } catch (error) {
        res.status(400).json({ success: false, data: null, error: error instanceof Error ? error.message : "save failed" });
      }
      break;
    }
    default:
      res.status(400).json({ success: false, data: null, error: "Invalid method" });
      break;
  }
}
