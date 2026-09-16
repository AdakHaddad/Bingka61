import type { NextApiRequest, NextApiResponse } from "next";
import net from "net";
import path from "path";
import sharp from "sharp";
import dbConnect from "../../lib/mongodb";
import Settings from "../../models/Settings";
import type { PosTransaction } from "../../types/pos";

let cachedLogoBuffer: Buffer | null = null;

async function getLogoBuffer(): Promise<Buffer | null> {
  if (cachedLogoBuffer) return cachedLogoBuffer;
  try {
    const logoPath = path.join(process.cwd(), "public", "logostruk.png");
    const { data, info } = await sharp(logoPath).resize({ width: 256 }).grayscale().threshold(128).toBuffer({ resolveWithObject: true });
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
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const byteIndex = 8 + y * bytesPerLine + Math.floor(x / 8);
        const bitIndex = 7 - (x % 8);
        if (data[y * width + x] !== undefined && (data[y * width + x] as number) < 128) {
          buffer[byteIndex] = (buffer[byteIndex] as number) | (1 << bitIndex);
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

interface ReceiptSettingsLike {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  footerGreeting1: string;
  footerGreeting2: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }
  const invoiceData = req.body as PosTransaction;
  try {
    const [settings, printer, logoBuffer] = await Promise.all([
      (async (): Promise<ReceiptSettingsLike> => {
        await dbConnect();
        const s = await Settings.findOne({ key: "receipt" }).lean();
        return {
          storeName: s?.storeName ?? "BINGKA61",
          storeAddress: s?.storeAddress ?? "Jl. KHW HASYIM No. 152",
          storePhone: s?.storePhone ?? "+62 859-3305-9045",
          footerGreeting1: s?.footerGreeting1 ?? "Terima Kasih",
          footerGreeting2: s?.footerGreeting2 ?? "Atas Kunjungan Anda",
        };
      })(),
      connectToPrinter(),
      getLogoBuffer(),
    ]);
    await printInvoice(printer, invoiceData, settings, logoBuffer);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error sending print job:", error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "print failed" });
  }
}

async function connectToPrinter(): Promise<net.Socket> {
  const ip = process.env.PRINTER_IP ?? "192.168.1.100";
  const port = Number(process.env.PRINTER_PORT ?? 9100);
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.setTimeout(3000);
    client.connect(port, ip, () => resolve(client));
    client.on("error", (err) => reject(err));
    client.on("timeout", () => {
      client.destroy();
      reject(new Error("Connection to printer timed out"));
    });
  });
}

async function printInvoice(
  printer: net.Socket,
  data: PosTransaction,
  settings: ReceiptSettingsLike,
  logoBuffer: Buffer | null,
): Promise<void> {
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

function generateESCPOSCommands(data: PosTransaction, settings: ReceiptSettingsLike, logoBuffer: Buffer | null): Buffer {
  const chunks: Buffer[] = [];
  const enc = (s: string): Buffer => Buffer.from(s);
  chunks.push(Buffer.from([0x1b, 0x40]));
  chunks.push(Buffer.from([0x1b, 0x61, 0x01]));
  if (logoBuffer) {
    chunks.push(logoBuffer);
    chunks.push(Buffer.from("\n"));
  }
  chunks.push(Buffer.from([0x1b, 0x45, 0x01]));
  chunks.push(enc(`${settings.storeName}\n`));
  chunks.push(Buffer.from([0x1b, 0x45, 0x00]));
  chunks.push(enc(`${settings.storeAddress}\n`));
  chunks.push(enc(`Telp: ${settings.storePhone}\n`));
  chunks.push(Buffer.from("--------------------------------\n"));
  chunks.push(Buffer.from([0x1b, 0x61, 0x00]));
  chunks.push(enc(`No: ${data.invoiceNumber}\n`));
  const date = new Date(data.timestamp);
  const formatted = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  chunks.push(enc(`Tanggal: ${formatted}\n`));
  chunks.push(enc(`Bayar: ${data.paymentMethod}\n`));
  chunks.push(Buffer.from("--------------------------------\n"));
  chunks.push(Buffer.from([0x1b, 0x45, 0x01]));
  chunks.push(Buffer.from("Item      Qty   Harga    Subtotal\n"));
  chunks.push(Buffer.from([0x1b, 0x45, 0x00]));
  for (const item of data.items) {
    const name = item.name.substring(0, 9).padEnd(9);
    const qty = String(item.quantity).padStart(3);
    const price = formatNumber(item.price).padStart(8);
    const subtotal = formatNumber(item.price * item.quantity).padStart(9);
    chunks.push(enc(`${name} ${qty} ${price} ${subtotal}\n`));
  }
  chunks.push(Buffer.from("--------------------------------\n"));
  chunks.push(Buffer.from([0x1b, 0x45, 0x01]));
  chunks.push(enc(formatTotalLine("Total:", data.totalAmount)));
  chunks.push(enc(formatTotalLine("Tunai:", data.cashReceived)));
  chunks.push(enc(formatTotalLine("Kembali:", data.changeAmount)));
  chunks.push(Buffer.from([0x1b, 0x45, 0x00]));
  chunks.push(Buffer.from("--------------------------------\n"));
  chunks.push(Buffer.from([0x1b, 0x61, 0x01]));
  chunks.push(enc(`${settings.footerGreeting1}\n`));
  chunks.push(enc(`${settings.footerGreeting2}\n\n\n\n`));
  chunks.push(Buffer.from([0x1d, 0x56, 0x41, 0x10]));
  return Buffer.concat(chunks);
}

function formatTotalLine(label: string, value: number): string {
  const formattedValue = `Rp. ${formatNumber(value)}`;
  const padding = 32 - (label.length + formattedValue.length);
  return `${label}${" ".repeat(Math.max(0, padding))}${formattedValue}\n`;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}
