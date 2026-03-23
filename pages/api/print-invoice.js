import net from "net";
import dbConnect from "../../lib/mongodb";
import Settings from "../../models/Settings";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const invoiceData = req.body;

  try {
    await dbConnect();
    let settings = await Settings.findOne({ key: "receipt" });
    if (!settings) {
      settings = {
        storeName: "BINGKA61",
        storeAddress: "Jl. KHW HASYIM No. 152",
        storePhone: "+62 859-3305-9045",
        footerGreeting1: "Terima Kasih",
        footerGreeting2: "Atas Kunjungan Anda",
      };
    }

    // Connect to the CodeSoft M200 printer
    const printer = await connectToPrinter("CodeSoft M200");

    // Format and send the print job
    await printInvoice(printer, invoiceData, settings);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error sending print job:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

async function connectToPrinter(printerName) {
  const printerConfig = {
    ip: "192.168.1.100", 
    port: 9100,
  };

  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.setTimeout(5000);
    client.connect(printerConfig.port, printerConfig.ip, () => {
      resolve(client);
    });
    client.on("error", (err) => reject(err));
    client.on("timeout", () => {
      client.destroy();
      reject(new Error("Connection to printer timed out"));
    });
  });
}

async function printInvoice(printer, data, settings) {
  const buffer = generateESCPOSCommands(data, settings);
  return new Promise((resolve, reject) => {
    printer.write(buffer, (err) => {
      if (err) {
        reject(err);
        return;
      }
      printer.end();
      resolve();
    });
  });
}

function generateESCPOSCommands(data, settings) {
  let commands = [];
  const encoder = (str) => Buffer.from(str);

  commands.push(Buffer.from([0x1b, 0x40]));
  commands.push(Buffer.from([0x1b, 0x61, 0x01]));

  // Store header from dynamic settings
  commands.push(Buffer.from([0x1b, 0x45, 0x01])); // Bold on
  commands.push(encoder(`${settings.storeName}\n`));
  commands.push(Buffer.from([0x1b, 0x45, 0x00])); // Bold off
  commands.push(encoder(`${settings.storeAddress}\n`));
  commands.push(encoder(`Telp: ${settings.storePhone}\n`));
  commands.push(Buffer.from("--------------------------------\n"));

  commands.push(Buffer.from([0x1b, 0x61, 0x00])); // Left align
  commands.push(encoder(`No: ${data.invoiceNumber}\n`));
  const date = new Date(data.timestamp);
  const formattedDate = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  commands.push(encoder(`Tanggal: ${formattedDate}\n`));
  commands.push(Buffer.from("--------------------------------\n"));

  commands.push(Buffer.from([0x1b, 0x45, 0x01])); // Bold on
  commands.push(Buffer.from("Item      Qty   Harga    Subtotal\n"));
  commands.push(Buffer.from([0x1b, 0x45, 0x00])); // Bold off

  for (const item of data.items) {
    const name = item.name.substring(0, 9).padEnd(9);
    const qty = item.quantity.toString().padStart(3);
    const price = formatNumber(item.price).padStart(8);
    const subtotal = formatNumber(item.price * item.quantity).padStart(9);
    commands.push(encoder(`${name} ${qty} ${price} ${subtotal}\n`));
  }

  commands.push(Buffer.from("--------------------------------\n"));
  commands.push(Buffer.from([0x1b, 0x45, 0x01])); // Bold on

  const formatTotalLine = (label, value) => {
    const formattedValue = "Rp. " + formatNumber(value);
    const padding = 32 - (label.length + formattedValue.length);
    return label + " ".repeat(Math.max(0, padding)) + formattedValue + "\n";
  };

  commands.push(encoder(formatTotalLine("Total:", data.totalAmount)));
  commands.push(encoder(formatTotalLine("Tunai:", data.cashReceived)));
  commands.push(encoder(formatTotalLine("Kembali:", data.changeAmount)));
  commands.push(Buffer.from([0x1b, 0x45, 0x00])); // Bold off
  commands.push(Buffer.from("--------------------------------\n"));

  // Footer from dynamic settings
  commands.push(Buffer.from([0x1b, 0x61, 0x01])); // Center
  commands.push(encoder(`${settings.footerGreeting1}\n`));
  commands.push(encoder(`${settings.footerGreeting2}\n\n\n\n`));
  commands.push(Buffer.from([0x1d, 0x56, 0x41, 0x10]));

  return Buffer.concat(commands);
}

function formatNumber(number) {
  return new Intl.NumberFormat("id-ID").format(number);
}
