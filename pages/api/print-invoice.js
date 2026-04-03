import net from "net";
import path from "path";
import sharp from "sharp";
import dbConnect from "../../lib/mongodb";
import Settings from "../../models/Settings";

// Cache for the logo buffer to avoid re-processing on every print
let cachedLogoBuffer = null;

async function getLogoBuffer() {
  if (cachedLogoBuffer) return cachedLogoBuffer;

  try {
    const logoPath = path.join(process.cwd(), "public", "logostruk.png");
    const { data, info } = await sharp(logoPath)
      .resize({ width: 256 })
      .grayscale()
      .threshold(128)
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    const bytesPerLine = Math.ceil(width / 8);
    
    const buffer = Buffer.alloc(8 + bytesPerLine * height);
    buffer[0] = 0x1d;
    buffer[1] = 0x76;
    buffer[2] = 0x30;
    buffer[3] = 0; 
    buffer[4] = bytesPerLine & 0xff;
    buffer[5] = (bytesPerLine >> 8) & 0xff;
    buffer[6] = height & 0xff;
    buffer[7] = (height >> 8) & 0xff;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const byteIndex = 8 + y * bytesPerLine + Math.floor(x / 8);
        const bitIndex = 7 - (x % 8);
        if (data[y * width + x] < 128) {
          buffer[byteIndex] |= (1 << bitIndex);
        }
      }
    }
    cachedLogoBuffer = buffer;
    return buffer;
  } catch (error) {
    console.error("Error processing logo:", error);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const invoiceData = req.body;

  try {
    // Start DB connection, settings fetch, and printer connection in parallel
    const [settings, printer, logoBuffer] = await Promise.all([
      (async () => {
        await dbConnect();
        const s = await Settings.findOne({ key: "receipt" });
        return s || {
          storeName: "BINGKA61",
          storeAddress: "Jl. KHW HASYIM No. 152",
          storePhone: "+62 859-3305-9045",
          footerGreeting1: "Terima Kasih",
          footerGreeting2: "Atas Kunjungan Anda",
        };
      })(),
      connectToPrinter("CodeSoft M200"),
      getLogoBuffer(),
    ]);

    // Format and send the print job
    await printInvoice(printer, invoiceData, settings, logoBuffer);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error sending print job:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function connectToPrinter(printerName) {
  const printerConfig = {
    ip: "192.168.1.100", 
    port: 9100,
  };

  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.setTimeout(3000); // Reduced timeout for faster failure detection
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

async function printInvoice(printer, data, settings, logoBuffer) {
  const buffer = generateESCPOSCommands(data, settings, logoBuffer);
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

function generateESCPOSCommands(data, settings, logoBuffer) {
  let commands = [];
  const encoder = (str) => Buffer.from(str);

  commands.push(Buffer.from([0x1b, 0x40]));
  commands.push(Buffer.from([0x1b, 0x61, 0x01]));

  if (logoBuffer) {
    commands.push(logoBuffer);
    commands.push(Buffer.from("\n"));
  }

  commands.push(Buffer.from([0x1b, 0x45, 0x01]));
  commands.push(encoder(`${settings.storeName}\n`));
  commands.push(Buffer.from([0x1b, 0x45, 0x00]));
  commands.push(encoder(`${settings.storeAddress}\n`));
  commands.push(encoder(`Telp: ${settings.storePhone}\n`));
  commands.push(Buffer.from("--------------------------------\n"));

  commands.push(Buffer.from([0x1b, 0x61, 0x00]));
  commands.push(encoder(`No: ${data.invoiceNumber}\n`));
  const date = new Date(data.timestamp);
  const formattedDate = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  commands.push(encoder(`Tanggal: ${formattedDate}\n`));
  commands.push(Buffer.from("--------------------------------\n"));

  commands.push(Buffer.from([0x1b, 0x45, 0x01]));
  commands.push(Buffer.from("Item      Qty   Harga    Subtotal\n"));
  commands.push(Buffer.from([0x1b, 0x45, 0x00]));

  for (const item of data.items) {
    const name = item.name.substring(0, 9).padEnd(9);
    const qty = item.quantity.toString().padStart(3);
    const price = formatNumber(item.price).padStart(8);
    const subtotal = formatNumber(item.price * item.quantity).padStart(9);
    commands.push(encoder(`${name} ${qty} ${price} ${subtotal}\n`));
  }

  commands.push(Buffer.from("--------------------------------\n"));
  commands.push(Buffer.from([0x1b, 0x45, 0x01]));

  const formatTotalLine = (label, value) => {
    const formattedValue = "Rp. " + formatNumber(value);
    const padding = 32 - (label.length + formattedValue.length);
    return label + " ".repeat(Math.max(0, padding)) + formattedValue + "\n";
  };

  commands.push(encoder(formatTotalLine("Total:", data.totalAmount)));
  commands.push(encoder(formatTotalLine("Tunai:", data.cashReceived)));
  commands.push(encoder(formatTotalLine("Kembali:", data.changeAmount)));
  commands.push(Buffer.from([0x1b, 0x45, 0x00]));
  commands.push(Buffer.from("--------------------------------\n"));

  commands.push(Buffer.from([0x1b, 0x61, 0x01]));
  commands.push(encoder(`${settings.footerGreeting1}\n`));
  commands.push(encoder(`${settings.footerGreeting2}\n\n\n\n`));
  commands.push(Buffer.from([0x1d, 0x56, 0x41, 0x10]));

  return Buffer.concat(commands);
}

function formatNumber(number) {
  return new Intl.NumberFormat("id-ID").format(number);
}
