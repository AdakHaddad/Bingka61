import dbConnect from "../../lib/mongodb";
import Transaction from "../../models/Transaction";
import { formatISO } from "date-fns";

export default async function handler(req, res) {
  const { method } = req;

  await dbConnect();

  switch (method) {
    case "GET":
      try {
        const transactions = await Transaction.find({});
        res.status(200).json({ success: true, data: transactions });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;
    case "POST":
      try {
        // Generate invoice number: BKA-YYYYMMDD-XXXX
        const date = new Date();
        const dateStr = formatISO(date, { representation: "date" }).replace(
          /-/g,
          ""
        );

        // Get the count of transactions for today to generate sequential number
        const todayStart = new Date(date.setHours(0, 0, 0, 0));
        const todayEnd = new Date(date.setHours(23, 59, 59, 999));

        const todayCount = await Transaction.countDocuments({
          timestamp: { $gte: todayStart, $lte: todayEnd },
        });

        const invoiceNumber = `BKA-${dateStr}-${(todayCount + 1)
          .toString()
          .padStart(4, "0")}`;

        // Create transaction with invoice number
        const transaction = await Transaction.create({
          ...req.body,
          invoiceNumber,
        });

        res.status(201).json({ success: true, data: transaction });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;
    default:
      res.status(400).json({ success: false });
      break;
  }
}
