import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns"; // Make sure to import this as it's used in your invoice template

const INITIAL_MENU_ITEMS = [
  { name: "Original", price: 23000 },
  { name: "Blodar", price: 15000 },
  { name: "Berendam", price: 25000 },
  { name: "Tar Susu", price: 45000 },
  { name: "Keju", price: 25000 },
  { name: "Rendang", price: 17000 },
  { name: "Kentang", price: 25000 },
  { name: "Kari", price: 17000 },
  { name: "Ubi", price: 25000 },
  { name: "Semur", price: 17000 },
  { name: "Daging", price: 30000 },
  { name: "Nasi Kebuli", price: 150000 },
  { name: "Pandan", price: 25000 },
  { name: "Durian", price: 30000 },
];

const CASH_VALUES = [
  { value: 1000, color: "#e1e99c" }, // 1,000
  { value: 2000, color: "gray" }, // 2,000
  { value: 5000, color: "#d7a580" }, // 5,000
  { value: 10000, color: "#a68dbe" }, // 10,000
  { value: 20000, color: "#78C088" }, // 20,000
  { value: 50000, color: "#7FAECF" }, // 50,000
  { value: 100000, color: "#BE6375" }, // 100,000
];

export default function Admin() {
  const [menuItems, setMenuItems] = useState([]);
  const [isFromDB, setIsFromDB] = useState(false); // Track if data is from DB
  const [view, setView] = useState("pos"); // 'pos' or 'menu'
  const [items, setItems] = useState([]);
  const [cash, setCash] = useState(0);
  const [returnAmount, setReturnAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [printStatus, setPrintStatus] = useState(null); // New state for printer status
  const [bluetoothDevice, setBluetoothDevice] = useState(null);
  const [printerCharacteristic, setPrinterCharacteristic] = useState(null);
  const invoiceRef = useRef(null);

  // New Menu Management States
  const [editingItem, setEditingItem] = useState(null);
  const [newMenuItem, setNewMenuItem] = useState({ name: "", price: 0 });

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const res = await fetch("/api/menu");
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setMenuItems(data.data);
        setIsFromDB(true);
      } else {
        setMenuItems(INITIAL_MENU_ITEMS);
        setIsFromDB(false);
      }
    } catch (error) {
      console.error("Error fetching menu:", error);
      setMenuItems(INITIAL_MENU_ITEMS);
      setIsFromDB(false);
    }
  };

  const handleAddMenu = async () => {
    if (!newMenuItem.name || newMenuItem.price <= 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMenuItem),
      });
      const data = await res.json();
      if (data.success) {
        setNewMenuItem({ name: "", price: 0 });
        fetchMenu();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMenu = async (item) => {
    setLoading(true);
    try {
      const res = await fetch("/api/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item._id, name: item.name, price: item.price }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingItem(null);
        fetchMenu();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMenu = async (id) => {
    if (!confirm("Hapus menu ini?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/menu", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        fetchMenu();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInitialMenu = async () => {
    if (!confirm("Simpan semua menu awal ke database?")) return;
    setLoading(true);
    try {
      for (const item of INITIAL_MENU_ITEMS) {
        await fetch("/api/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
      }
      alert("Berhasil menyimpan menu!");
      fetchMenu();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan menu");
    } finally {
      setLoading(false);
    }
  };

  // Bluetooth Printing Logic
  const connectBluetooth = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ["000018f0-0000-1000-8000-00805f9b34fb"] }],
        optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"]
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService("000018f0-0000-1000-8000-00805f9b34fb");
      const characteristic = await service.getCharacteristic("00002af1-0000-1000-8000-00805f9b34fb");
      
      setBluetoothDevice(device);
      setPrinterCharacteristic(characteristic);
      alert("Printer Bluetooth terhubung!");
    } catch (error) {
      console.error("Bluetooth Connection Error:", error);
      alert("Gagal menghubungkan printer: " + error.message);
    }
  };

  const generateESCPOS = (data) => {
    const encoder = new TextEncoder();
    let commands = [];

    // Initialize
    commands.push(new Uint8Array([0x1b, 0x40]));
    
    // Center Align
    commands.push(new Uint8Array([0x1b, 0x61, 0x01]));
    
    // Header
    commands.push(new Uint8Array([0x1b, 0x45, 0x01])); // Bold On
    commands.push(encoder.encode("BINGKA61\n"));
    commands.push(new Uint8Array([0x1b, 0x45, 0x00])); // Bold Off
    commands.push(encoder.encode("Jl. KHW HASYIM No. 152\n"));
    commands.push(encoder.encode("Telp: +62 859-3305-9045\n"));
    commands.push(encoder.encode("--------------------------------\n"));

    // Info
    commands.push(new Uint8Array([0x1b, 0x61, 0x00])); // Left Align
    commands.push(encoder.encode(`No: ${data.invoiceNumber}\n`));
    const date = new Date(data.timestamp);
    const formattedDate = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    commands.push(encoder.encode(`Tanggal: ${formattedDate}\n`));
    commands.push(encoder.encode("--------------------------------\n"));

    // Table Header
    commands.push(new Uint8Array([0x1b, 0x45, 0x01]));
    commands.push(encoder.encode("Item      Qty   Harga    Subtotal\n"));
    commands.push(new Uint8Array([0x1b, 0x45, 0x00]));

    // Items
    data.items.forEach(item => {
      const name = item.name.substring(0, 9).padEnd(9);
      const qty = item.quantity.toString().padStart(3);
      const price = new Intl.NumberFormat("id-ID").format(item.price).padStart(8);
      const subtotal = new Intl.NumberFormat("id-ID").format(item.price * item.quantity).padStart(9);
      commands.push(encoder.encode(`${name} ${qty} ${price} ${subtotal}\n`));
    });

    commands.push(encoder.encode("--------------------------------\n"));

    // Totals
    commands.push(new Uint8Array([0x1b, 0x45, 0x01]));
    const totalLine = `Total:`.padEnd(15) + `Rp. ${new Intl.NumberFormat("id-ID").format(data.totalAmount)}`.padStart(17);
    commands.push(encoder.encode(totalLine + "\n"));
    const cashLine = `Tunai:`.padEnd(15) + `Rp. ${new Intl.NumberFormat("id-ID").format(data.cashReceived)}`.padStart(17);
    commands.push(encoder.encode(cashLine + "\n"));
    const changeLine = `Kembali:`.padEnd(15) + `Rp. ${new Intl.NumberFormat("id-ID").format(data.changeAmount)}`.padStart(17);
    commands.push(encoder.encode(changeLine + "\n"));
    commands.push(new Uint8Array([0x1b, 0x45, 0x00]));

    commands.push(encoder.encode("--------------------------------\n"));

    // Footer
    commands.push(new Uint8Array([0x1b, 0x61, 0x01]));
    commands.push(encoder.encode("Terima Kasih\n"));
    commands.push(encoder.encode("Atas Kunjungan Anda\n\n\n\n"));
    
    // Cut/Feed
    commands.push(new Uint8Array([0x1d, 0x56, 0x41, 0x10]));

    // Combine all
    let totalLength = commands.reduce((acc, curr) => acc + curr.length, 0);
    let combined = new Uint8Array(totalLength);
    let offset = 0;
    for (let cmd of commands) {
      combined.set(cmd, offset);
      offset += cmd.length;
    }
    return combined;
  };

  const printToBluetooth = async (invoiceData) => {
    if (!printerCharacteristic) {
      alert("Printer Bluetooth belum terhubung!");
      return;
    }

    try {
      setPrintStatus("sending");
      const commands = generateESCPOS(invoiceData);
      
      // Bluetooth characteristic write limit is often 20 bytes
      const CHUNK_SIZE = 20;
      for (let i = 0; i < commands.length; i += CHUNK_SIZE) {
        const chunk = commands.slice(i, i + CHUNK_SIZE);
        await printerCharacteristic.writeValue(chunk);
      }
      
      setPrintStatus("success");
    } catch (error) {
      console.error("Bluetooth Print Error:", error);
      setPrintStatus("error");
    }
  };

  useEffect(() => {
    const total = items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    setTotalAmount(total);
    const returnAmt = cash - total;
    setReturnAmount(returnAmt);
  }, [items, cash]);

  useEffect(() => {
    if (invoice && invoiceRef.current) {
      console.log("Invoice data updated in state, ref is available");
    }
  }, [invoice]);

  const handleMenuItemClick = (menuItem) => {
    const existingItemIndex = items.findIndex(
      (item) => item.name === menuItem.name
    );
    if (existingItemIndex !== -1) {
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity += 1;
      setItems(updatedItems);
    } else {
      setItems([...items, { ...menuItem, quantity: 1 }]);
    }
  };

  const handleDecrementItem = (menuItemName) => {
    const existingItemIndex = items.findIndex(
      (item) => item.name === menuItemName
    );
    if (existingItemIndex !== -1) {
      const updatedItems = [...items];
      if (updatedItems[existingItemIndex].quantity > 1) {
        updatedItems[existingItemIndex].quantity -= 1;
        setItems(updatedItems);
      } else {
        setItems(items.filter((i) => i.name !== menuItemName));
      }
    }
  };

  const handleRemoveItem = (menuItemName) => {
    setItems(items.filter((i) => i.name !== menuItemName));
  };

  const handlePrintLast = async () => {
    if (!invoice) {
      alert("Tidak ada transaksi terakhir untuk dicetak.");
      return;
    }
    if (printerCharacteristic) {
      await printToBluetooth(invoice);
    } else {
      await sendToPrinter(invoice);
    }
  };

  const testPrint = async () => {
    if (!printerCharacteristic) {
      alert("Printer Bluetooth belum terhubung!");
      return;
    }
    try {
      const encoder = new TextEncoder();
      const commands = new Uint8Array([
        0x1b, 0x40, // Init
        0x1b, 0x61, 0x01, // Center
        ...encoder.encode("TEST PRINT\nBINGKA61\n\n\n\n"),
        0x1d, 0x56, 0x41, 0x10 // Cut/Feed
      ]);
      const CHUNK_SIZE = 20;
      for (let i = 0; i < commands.length; i += CHUNK_SIZE) {
        await printerCharacteristic.writeValue(commands.slice(i, i + CHUNK_SIZE));
      }
      alert("Test print dikirim!");
    } catch (error) {
      console.error(error);
      alert("Gagal test print");
    }
  };

  const openDrawer = async () => {
    if (!printerCharacteristic) {
      alert("Printer Bluetooth belum terhubung!");
      return;
    }
    try {
      // Standard ESC/POS open drawer command
      const commands = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
      await printerCharacteristic.writeValue(commands);
    } catch (error) {
      console.error(error);
      alert("Gagal membuka laci");
    }
  };

  const handleCashButtonClick = (value) => {
    setCash(cash + value.value);
  };

  const handleReset = () => {
    setItems([]);
    setCash(0);
    setReturnAmount(0);
    setInvoice(null);
    setPrintStatus(null);
  };

  // New function to directly print to CodeSoft M200
  const sendToPrinter = async (invoiceData) => {
    try {
      setPrintStatus("sending");

      const response = await fetch("/api/print-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoiceData),
      });

      const result = await response.json();

      if (result.success) {
        setPrintStatus("success");
        console.log("Print job sent successfully");
      } else {
        setPrintStatus("error");
        console.error("Failed to send print job:", result.error);
      }
    } catch (error) {
      setPrintStatus("error");
      console.error("Error sending print job:", error);
    }
  };

  const saveTransaction = async () => {
    if (items.length === 0 || returnAmount < 0) {
      alert(
        "Tidak dapat menyimpan transaksi. Pastikan ada item dan uang cukup."
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items,
          totalAmount,
          cashReceived: cash,
          changeAmount: returnAmount,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setInvoice(data.data);

        // Prioritize Bluetooth printing if connected
        if (printerCharacteristic) {
          await printToBluetooth(data.data);
        } else {
          // Fallback to existing server-side printing
          await sendToPrinter(data.data);
        }
      } else {
        alert(
          "Gagal menyimpan transaksi: " +
            (data.error || "Error tidak diketahui")
        );
      }
    } catch (error) {
      console.error("Error saving transaction:", error);
      alert("Gagal menyimpan transaksi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-2">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-white">Bingka61 POS</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setView(view === "pos" ? "menu" : "pos")}
            className="px-4 py-2 rounded bg-orange-600 text-white text-sm hover:bg-orange-700"
          >
            {view === "pos" ? "Pengaturan Menu" : "Kembali ke POS"}
          </button>
          <button
            onClick={connectBluetooth}
            className={`px-4 py-2 rounded text-white text-sm ${
              printerCharacteristic ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {printerCharacteristic ? "Printer Terhubung" : "Hubungkan Printer Bluetooth"}
          </button>
        </div>
      </div>

      {view === "pos" ? (
        <>
          <div className="grid grid-cols-2 gap-1 text-sm font-medium">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => handleMenuItemClick(item)}
                className={` py-4 rounded active:bg-opacity-60 ${
                  item.name === "Nasi Kebuli"
                    ? "bg-slate-300 text-black"
                    : item.name === "Rendang"
                    ? "bg-red-600 text-white"
                    : item.name === "Kari"
                    ? "bg-orange-500 text-white"
                    : item.name === "Semur"
                    ? "bg-orange-800 text-white"
                    : item.displayColor || "bg-yellow-400"
                }`}
              >
                {item.name} - {item.price} x{" "}
                {items.find((i) => i.name === item.name)?.quantity || 0}
              </button>
            ))}
          </div>

          <div className="flex flex-col mt-4">
            <div className="flex flex-wrap justify-center -mx-2">
              {CASH_VALUES.map((value, index) => (
                <button
                  key={index}
                  onClick={() => handleCashButtonClick(value)}
                  className={`text-black font-medium py-2 rounded mb-2 mx-2 sm:mx-0 flex items-center justify-center `}
                  style={{
                    backgroundImage: `url(/images/${
                      value.value === 1000
                        ? "1k.png"
                        : value.value === 2000
                        ? "2k.png"
                        : value.value === 5000
                        ? "5k.png"
                        : value.value === 10000
                        ? "10k.png"
                        : value.value === 20000
                        ? "20k.png"
                        : value.value === 50000
                        ? "50k.png"
                        : value.value === 100000
                        ? "100k.png"
                        : ""
                    })`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    height: value.value == "45px",
                  }}
                >
                  <span className="bg-white bg-opacity-20 px-2 py-1 rounded">
                    {new Intl.NumberFormat("id-ID").format(value.value)}
                  </span>
                </button>
              ))}
            </div>

            {printerCharacteristic && (
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={testPrint}
                  className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700"
                >
                  Test Print
                </button>
                <button
                  onClick={openDrawer}
                  className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700"
                >
                  Buka Laci
                </button>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="number"
                id="cash"
                value={cash}
                onChange={(e) => setCash(parseFloat(e.target.value) || 0)}
                step="1000"
                className="border flex border-gray-300 max-w-screen-md rounded px-3 py-2 mr-2"
                style={{ width: "50%", maxWidth: "200px" }}
              />
              <button
                onClick={handleReset}
                className="bg-red-500 flex-auto text-white text-center py-2 px-3 rounded hover:bg-red-600"
                style={{ width: "50%", minWidth: "100px" }}
              >
                Reset
              </button>
              <button
                onClick={handlePrintLast}
                disabled={!invoice}
                className={`ml-2 flex-auto text-white text-center py-2 px-3 rounded ${
                  !invoice
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
                style={{ width: "50%", minWidth: "120px" }}
              >
                Cetak Ulang
              </button>
            </div>
          </div>

          <hr className="my-2 border-t-2 border-gray-300" />

          {items.length > 0 && (
            <div className="mt-4 text-center text-white">
              <p className="font-bold text-lg">
                Total: Rp. {new Intl.NumberFormat("id-ID").format(totalAmount)}
              </p>
            </div>
          )}
          {returnAmount > 0 && totalAmount > 0 && (
            <div className="text-center text-green-300">
              <p className="font-bold text-lg">
                Kembali: Rp.{" "}
                {new Intl.NumberFormat("id-ID").format(returnAmount)}
              </p>

              <button
                onClick={saveTransaction}
                disabled={loading || items.length === 0 || returnAmount < 0}
                className={`mt-2 w-full py-2 px-4 rounded ${
                  loading || items.length === 0 || returnAmount < 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {loading ? "Memproses..." : "Cetak Struk"}
              </button>

              {/* Print status indicator */}
              {printStatus && (
                <div
                  className={`mt-2 text-sm ${
                    printStatus === "sending"
                      ? "text-blue-500"
                      : printStatus === "success"
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {printStatus === "sending" && "Mengirim ke printer..."}
                  {printStatus === "success" && "Struk berhasil dicetak!"}
                  {printStatus === "error" && "Gagal mencetak struk. Coba lagi."}
                </div>
              )}
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-4 bg-white p-3 rounded shadow">
              <p className="font-bold mb-2">Pesanan:</p>
              <ul className="space-y-2">
                {items.map((item, index) => (
                  <li
                    key={index}
                    className="flex justify-between items-center text-sm border-b pb-1"
                  >
                    <div className="flex-1">
                      <span className="font-medium">{item.name}</span>
                      <div className="text-xs text-gray-500">
                        Rp. {new Intl.NumberFormat("id-ID").format(item.price)}{" "}
                        x {item.quantity}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleDecrementItem(item.name)}
                        className="bg-yellow-500 text-white px-2 py-1 rounded text-xs"
                      >
                        -
                      </button>
                      <button
                        onClick={() => handleMenuItemClick(item)}
                        className="bg-green-500 text-white px-2 py-1 rounded text-xs"
                      >
                        +
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item.name)}
                        className="bg-red-600 text-white px-2 py-1 rounded text-xs ml-2"
                      >
                        Hapus
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-bold mb-4">Pengaturan Menu</h2>
          
          {/* Add New Item */}
          <div className="mb-6 p-3 border rounded bg-gray-50">
            <h3 className="text-sm font-bold mb-2">Tambah Menu Baru</h3>
            <div className="flex flex-col space-y-2">
              <input
                type="text"
                placeholder="Nama Menu"
                value={newMenuItem.name}
                onChange={(e) => setNewMenuItem({...newMenuItem, name: e.target.value})}
                className="border p-2 rounded text-sm"
              />
              <input
                type="number"
                placeholder="Harga"
                value={newMenuItem.price}
                onChange={(e) => setNewMenuItem({...newMenuItem, price: parseInt(e.target.value) || 0})}
                className="border p-2 rounded text-sm"
              />
              <button
                onClick={handleAddMenu}
                disabled={loading}
                className="bg-green-600 text-white p-2 rounded text-sm font-bold"
              >
                {loading ? "Menambahkan..." : "Tambah Menu"}
              </button>
            </div>
          </div>

          {/* Menu List */}
          <div className="space-y-3">
            {menuItems.map((item) => (
              <div key={item._id || item.name} className="border-b pb-2">
                {editingItem && editingItem._id === item._id ? (
                  <div className="flex flex-col space-y-2">
                    <input
                      type="text"
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                      className="border p-1 rounded text-sm"
                    />
                    <input
                      type="number"
                      value={editingItem.price}
                      onChange={(e) => setEditingItem({...editingItem, price: parseInt(e.target.value) || 0})}
                      className="border p-1 rounded text-sm"
                    />
                    <div className="flex space-x-2">
                      <button onClick={() => handleUpdateMenu(editingItem)} className="text-green-600 text-xs font-bold">Simpan</button>
                      <button onClick={() => setEditingItem(null)} className="text-gray-500 text-xs">Batal</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">Rp. {new Intl.NumberFormat("id-ID").format(item.price)}</p>
                    </div>
                    <div className="flex space-x-3">
                      <button onClick={() => setEditingItem(item)} className="text-blue-600 text-xs">Edit</button>
                      <button onClick={() => handleDeleteMenu(item._id)} className="text-red-600 text-xs">Hapus</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Seed Button - Only show if not from DB */}
          {!isFromDB && (
            <div className="mt-8 pt-4 border-t">
              <p className="text-xs text-gray-500 mb-2">
                Gunakan tombol di bawah untuk menyimpan menu awal ke database.
              </p>
              <button
                onClick={handleSaveInitialMenu}
                disabled={loading}
                className="w-full bg-blue-600 text-white p-2 rounded text-xs font-bold hover:bg-blue-700"
              >
                Simpan Menu Utama
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hidden Invoice for printing */}
      <div style={{ display: "none" }}>
        <div
          ref={invoiceRef}
          className="p-4"
          style={{
            width: "80mm",
            fontFamily: "monospace",
            backgroundColor: "white", // Add this to ensure it's visible when printing
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "10px" }}>
            <h2 style={{ margin: "0", fontSize: "14px", fontWeight: "bold" }}>
              BINGKA61
            </h2>
            <p style={{ margin: "3px 0", fontSize: "12px" }}>
              Jl. KHW HASYIM No. 152
            </p>
            <p style={{ margin: "3px 0", fontSize: "12px" }}>
              Telp: +62 859-3305-9045
            </p>
            <hr style={{ margin: "10px 0", border: "1px dashed #000" }} />
          </div>

          {invoice && (
            <>
              <div style={{ marginBottom: "10px", fontSize: "12px" }}>
                <p style={{ margin: "3px 0" }}>No: {invoice.invoiceNumber}</p>
                <p style={{ margin: "3px 0" }}>
                  Tanggal:{" "}
                  {format(new Date(invoice.timestamp), "dd/MM/yyyy HH:mm")}
                </p>
              </div>

              <hr style={{ margin: "10px 0", border: "1px dashed #000" }} />

              <table
                style={{
                  width: "100%",
                  fontSize: "12px",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Item</th>
                    <th style={{ textAlign: "right" }}>Qty</th>
                    <th style={{ textAlign: "right" }}>Harga</th>
                    <th style={{ textAlign: "right" }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={index}>
                      <td style={{ textAlign: "left" }}>{item.name}</td>
                      <td style={{ textAlign: "right" }}>{item.quantity}</td>
                      <td style={{ textAlign: "right" }}>
                        {new Intl.NumberFormat("id-ID").format(item.price)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {new Intl.NumberFormat("id-ID").format(
                          item.price * item.quantity
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <hr style={{ margin: "10px 0", border: "1px dashed #000" }} />

              <div style={{ fontSize: "12px" }}>
                <p
                  style={{
                    margin: "3px 0",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Total:</span>
                  <span>
                    Rp.{" "}
                    {new Intl.NumberFormat("id-ID").format(invoice.totalAmount)}
                  </span>
                </p>
                <p
                  style={{
                    margin: "3px 0",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Tunai:</span>
                  <span>
                    Rp.{" "}
                    {new Intl.NumberFormat("id-ID").format(
                      invoice.cashReceived
                    )}
                  </span>
                </p>
                <p
                  style={{
                    margin: "3px 0",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Kembali:</span>
                  <span>
                    Rp.{" "}
                    {new Intl.NumberFormat("id-ID").format(
                      invoice.changeAmount
                    )}
                  </span>
                </p>
              </div>

              <hr style={{ margin: "10px 0", border: "1px dashed #000" }} />

              <div
                style={{
                  textAlign: "center",
                  marginTop: "10px",
                  fontSize: "12px",
                }}
              >
                <p style={{ margin: "3px 0" }}>Terima Kasih</p>
                <p style={{ margin: "3px 0" }}>Atas Kunjungan Anda</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
