import dbConnect from "../../lib/mongodb";
import Menu from "../../models/Menu";

export default async function handler(req, res) {
  const { method } = req;

  await dbConnect();

  switch (method) {
    // Get all menu items
    case "GET":
      try {
        const menuItems = await Menu.find({ isActive: true }).sort("name");
        res.status(200).json({ success: true, data: menuItems });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    // Create a new menu item
    case "POST":
      try {
        const menuItem = await Menu.create(req.body);
        res.status(201).json({ success: true, data: menuItem });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    default:
      res.status(400).json({ success: false, message: "Invalid method" });
      break;
  }
}
