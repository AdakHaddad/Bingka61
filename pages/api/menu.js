import dbConnect from "../../lib/mongodb";
import Menu from "../../models/Menu";

export default async function handler(req, res) {
  const { method } = req;

  await dbConnect();

  switch (method) {
    // Get all active menu items
    case "GET":
      try {
        const menuItems = await Menu.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
        res.status(200).json({ success: true, data: menuItems });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    // Create a new menu item
    case "POST":
      try {
        // Find the current highest order to append to end
        const lastItem = await Menu.findOne({ isActive: true }).sort({ order: -1 });
        const newOrder = lastItem ? lastItem.order + 1 : 0;
        const menuItem = await Menu.create({ ...req.body, order: newOrder });
        res.status(201).json({ success: true, data: menuItem });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    // Update menu item(s)
    case "PUT":
      try {
        if (Array.isArray(req.body)) {
          // Bulk update for reordering
          const updates = req.body.map(item => 
            Menu.findByIdAndUpdate(item.id, { order: item.order }, { new: true })
          );
          await Promise.all(updates);
          res.status(200).json({ success: true });
        } else {
          // Single item update
          const { id, ...updateData } = req.body;
          const updatedMenuItem = await Menu.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
          });
          if (!updatedMenuItem) {
            return res.status(404).json({ success: false, error: "Menu item not found" });
          }
          res.status(200).json({ success: true, data: updatedMenuItem });
        }
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;


    // Delete menu item (soft delete by setting isActive to false)
    case "DELETE":
      try {
        const { id } = req.body;
        const deletedMenuItem = await Menu.findByIdAndUpdate(id, { isActive: false }, {
          new: true,
        });
        if (!deletedMenuItem) {
          return res.status(404).json({ success: false, error: "Menu item not found" });
        }
        res.status(200).json({ success: true, data: deletedMenuItem });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    default:
      res.status(400).json({ success: false, message: "Invalid method" });
      break;
  }
}
