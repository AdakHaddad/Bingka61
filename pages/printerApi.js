const express = require('express');
const router = express.Router();
const net = require('net');

// Route to handle print requests
router.post('/api/print-invoice', async (req, res) => {
  const invoiceData = req.body;
  
  try {
    // Connect to the CodeSoft M200 printer
    const printer = await connectToPrinter('CodeSoft M200');
    
    // Format and send the print job
    await printInvoice(printer, invoiceData);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending print job:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Connect to the printer
async function connectToPrinter(printerName) {
  const printerConfig = {
    ip: '192.168.1.100', // Replace with your CodeSoft M200 IP address
    port: 9100           // Standard printer port
  };
  
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    
    client.connect(printerConfig.port, printerConfig.ip, () => {
      console.log(`Connected to printer: ${printerName}`);
      resolve(client);
    });
    
    client.on('error', (err) => {
      console.error(`Printer connection error: ${err.message}`);
      reject(err);
    });
  });
}

// Format and print the invoice
async function printInvoice(printer, data) {
  const buffer = generateESCPOSCommands(data);
  
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

// Generate ESC/POS commands for the CodeSoft M200 printer
function generateESCPOSCommands(data) {
  // Initialize buffer with printer commands
  let commands = [];
  
  // Initialize printer
  commands.push(Buffer.from([0x1B, 0x40]));
  
  // Center align
  commands.push(Buffer.from([0x1B, 0x61, 0x01]));
  
  // Store name as header
  commands.push(Buffer.from("BINGKA61\n\n"));
  
  // Store address
  commands.push(Buffer.from("Jl. KHW HASYIM No. 152\n"));
  commands.push(Buffer.from("Telp: +62 859-3305-9045\n"));
  
  // Divider
  commands.push(Buffer.from("--------------------------------\n"));
  
  // Invoice number and date
  commands.push(Buffer.from([0x1B, 0x61, 0x00])); // Left align
  commands.push(Buffer.from(`No: ${data.invoiceNumber}\n`));
  
  const date = new Date(data.timestamp);
  const formattedDate = 
    `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ` +
    `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  
  commands.push(Buffer.from(`Tanggal: ${formattedDate}\n`));
  
  // Divider
  commands.push(Buffer.from("--------------------------------\n"));
  
  // Table header
  commands.push(Buffer.from("Item      Qty   Harga    Subtotal\n"));
  
  // Items
  for (const item of data.items) {
    const name = item.name.padEnd(10).substring(0, 10);
    const qty = item.quantity.toString().padStart(3);
    const price = new Intl.NumberFormat("id-ID").format(item.price).padStart(8);
    const subtotal = new Intl.NumberFormat("id-ID").format(item.price * item.quantity).padStart(9);
    
    commands.push(Buffer.from(`${name} ${qty} ${price} ${subtotal}\n`));
  }
  
  // Divider
  commands.push(Buffer.from("--------------------------------\n"));
  
  // Totals
  const totalText = "Total: ";
  const totalValue = "Rp. " + new Intl.NumberFormat("id-ID").format(data.totalAmount);
  const totalPadding = 32 - (totalText.length + totalValue.length);
  commands.push(Buffer.from(totalText + " ".repeat(totalPadding) + totalValue + "\n"));
  
  const cashText = "Tunai: ";
  const cashValue = "Rp. " + new Intl.NumberFormat("id-ID").format(data.cashReceived);
  const cashPadding = 32 - (cashText.length + cashValue.length);
  commands.push(Buffer.from(cashText + " ".repeat(cashPadding) + cashValue + "\n"));
  
  const changeText = "Kembali: ";
  const changeValue = "Rp. " + new Intl.NumberFormat("id-ID").format(data.changeAmount);
  const changePadding = 32 - (changeText.length + changeValue.length);
  commands.push(Buffer.from(changeText + " ".repeat(changePadding) + changeValue + "\n"));
  
  // Divider
  commands.push(Buffer.from("--------------------------------\n"));
  
  // Footer
  commands.push(Buffer.from([0x1B, 0x61, 0x01])); // Center align
  commands.push(Buffer.from("Terima Kasih\n"));
  commands.push(Buffer.from("Atas Kunjungan Anda\n\n\n\n"));
  
  // Cut paper
  commands.push(Buffer.from([0x1D, 0x56, 0x41, 0x10]));
  
  return Buffer.concat(commands);
}

module.exports = router;