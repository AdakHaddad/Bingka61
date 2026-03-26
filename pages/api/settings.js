import dbConnect from "../../lib/mongodb";
import Settings from "../../models/Settings";

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
        let settings = await Settings.findOne({ key: "receipt" });
        if (!settings) {
          settings = await Settings.create({ key: "receipt" });
        }
        res.status(200).json({ success: true, data: settings });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    case "POST":
      try {
        const settings = await Settings.findOneAndUpdate(
          { key: "receipt" },
          { ...req.body, updatedAt: Date.now() },
          { new: true, upsert: true, runValidators: true }
        );
        res.status(200).json({ success: true, data: settings });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    default:
      res.status(400).json({ success: false, message: "Invalid method" });
      break;
  }
}
