import dbConnect from "../../lib/mongodb";
import Transaction from "../../models/Transaction";
import { formatISO } from "date-fns";

async function sendToPrinter(invoiceData) {
  try {
    // Call the local print API
    // We use a full URL or internal call if possible, but since this is a Next.js API route,
    // we might need to handle the print logic directly here or call it.
    // To keep it clean and fast, let's call the existing print-invoice handler logic.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    await fetch(`${baseUrl}/api/print-invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoiceData),
    });
  } catch (error) {
    console.error("Background print error:", error);
  }
}

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
        const transactions = await Transaction.find({});
        res.status(200).json({ success: true, data: transactions });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;
    case "POST":
      try {
        // Generate invoice number: BKA-YYYYMMDD-XXXX
        const now = new Date();
        const dateStr = formatISO(now, { representation: "date" }).replace(/-/g, "");

        // Get the count of transactions for today to generate sequential number
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        const todayCount = await Transaction.countDocuments({
          timestamp: { $gte: todayStart, $lte: todayEnd },
        });

        const invoiceNumber = `BKA-${dateStr}-${(todayCount + 1).toString().padStart(4, "0")}`;
        const timestamp = new Date().toISOString();

        const invoiceData = {
          ...req.body,
          invoiceNumber,
          timestamp,
        };

        // 1. Respond to client immediately with the generated data so they don't wait
        res.status(201).json({ success: true, data: invoiceData });

        // 2. Perform background tasks: Print and then Save to DB
        // We do this AFTER res.status().json() has been called in a serverless environment
        // Note: In some Vercel/Serverless environments, execution might be clipped.
        // But for local/standard Node.js, this works well.
        
        (async () => {
          try {
            // Print first
            await sendToPrinter(invoiceData);
            
            // Then save to DB
            await Transaction.create(invoiceData);
            console.log(`Transaction ${invoiceNumber} printed and saved successfully.`);
          } catch (err) {
            console.error("Background task failed:", err);
          }
        })();

      } catch (error) {
        console.error("POST Transaction error:", error);
        if (!res.writableEnded) {
          res.status(400).json({ success: false, error: error.message });
        }
      }
      break;
    default:
      res.status(400).json({ success: false });
      break;
  }
}
