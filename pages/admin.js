import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns"; // Make sure to import this as it's used in your invoice template
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGear,
  faStore,
  faPrint,
  faPlus,
  faMinus,
  faTrash,
  faArrowLeft,
  faRotateRight,
  faMoneyBillWave,
  faArrowUp,
  faArrowDown,
  faPencil,
  faXmark,
  faReceipt,
  faMicrophone,
  faMicrophoneSlash,
  faChartSimple
} from "@fortawesome/free-solid-svg-icons";
import { faBluetooth } from "@fortawesome/free-brands-svg-icons";
import Link from "next/link";

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

const INDONESIAN_NUMBERS = {
  satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5,
  enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10,
};

const levenshteinDistance = (a, b) => {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] =
        a[i - 1] === b[j - 1]
          ? matrix[i - 1][j - 1]
          : 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
    }
  }
  return matrix[a.length][b.length];
};

export default function Admin() {
  const [menuItems, setMenuItems] = useState([]);
  const [isFromDB, setIsFromDB] = useState(false); // Track if data is from DB
  const [isEditing, setIsEditing] = useState(false); // New editing mode state
  const [isOnline, setIsOnline] = useState(true); // Track online status
  const [view, setView] = useState("pos"); // 'pos' or 'receipt'
  const [settings, setSettings] = useState({
    storeName: "BINGKA61",
    storeAddress: "Jl. KHW HASYIM No. 152",
    storePhone: "+62 859-3305-9045",
    footerGreeting1: "Terima Kasih",
    footerGreeting2: "Atas Kunjungan Anda",
  });
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

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState(null);

  // New Menu Management States
  const [editingItem, setEditingItem] = useState(null);
  const [newMenuItem, setNewMenuItem] = useState({ name: "", price: 0 });

  // Voice recognition refs
  const recognitionRef = useRef(null);
  const menuItemsRef = useRef(menuItems);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);

  useEffect(() => {
    fetchMenu();
    fetchSettings();

    // Online/Offline Listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Keep menuItemsRef in sync
  useEffect(() => {
    menuItemsRef.current = menuItems;
  }, [menuItems]);

  // Voice recognition — auto-start in POS mode
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (view !== "pos" || isEditing || isVoiceMuted) {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      return;
    }

    let active = true;
    const recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        processVoiceCommand(last[0].transcript);
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Voice:", event.error);
      }
    };

    recognition.onend = () => {
      if (active) {
        setTimeout(() => {
          if (active && recognitionRef.current) {
            try { recognitionRef.current.start(); } catch (e) {}
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch (e) {}

    return () => {
      active = false;
      recognition.abort();
      recognitionRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, isEditing, isVoiceMuted]);

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

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        alert("Pengaturan struk berhasil disimpan!");
      }
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan pengaturan");
    } finally {
      setLoading(false);
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

  // Drag and Drop Handlers
  const onDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newMenuItems = [...menuItems];
    const draggedItem = newMenuItems[draggedIndex];
    newMenuItems.splice(draggedIndex, 1);
    newMenuItems.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setMenuItems(newMenuItems);
  };

  const onDragEnd = async () => {
    setDraggedIndex(null);
    const updates = menuItems.map((item, idx) => ({
      id: item._id,
      order: idx,
    }));
    try {
      await fetch("/api/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error(error);
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
    commands.push(encoder.encode(`${settings.storeName}\n`));
    commands.push(new Uint8Array([0x1b, 0x45, 0x00])); // Bold Off
    commands.push(encoder.encode(`${settings.storeAddress}\n`));
    commands.push(encoder.encode(`Telp: ${settings.storePhone}\n`));
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
    commands.push(encoder.encode(`${settings.footerGreeting1}\n`));
    commands.push(encoder.encode(`${settings.footerGreeting2}\n\n\n\n`));
    
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

  // Voice command helpers
  const matchSingleItem = (text) => {
    const menu = menuItemsRef.current;
    if (!menu.length || !text) return null;
    // Exact
    for (const item of menu) {
      if (text === item.name.toLowerCase()) return item;
    }
    // Fuzzy
    let bestMatch = null, bestScore = Infinity;
    for (const item of menu) {
      const name = item.name.toLowerCase();
      const dist = levenshteinDistance(text, name);
      const threshold = Math.max(1, Math.floor(name.length * 0.35));
      if (dist < bestScore && dist <= threshold) { bestScore = dist; bestMatch = item; }
    }
    return bestMatch;
  };

  const processVoiceCommand = (spokenText) => {
    const menu = menuItemsRef.current;
    if (!menu.length) return;

    const normalized = spokenText.toLowerCase().trim();
    const words = normalized.split(/\s+/);
    const matched = [];
    let i = 0;

    while (i < words.length) {
      const word = words[i];

      // Skip number words/digits (they attach to the next or previous item)
      if (INDONESIAN_NUMBERS[word] || /^\d+$/.test(word)) {
        i++;
        continue;
      }

      // Try two-word match first (e.g. "tar susu", "nasi kebuli")
      let item = null;
      if (i + 1 < words.length) {
        const twoWord = word + " " + words[i + 1];
        item = matchSingleItem(twoWord);
        if (item) {
          // Check for quantity before or after
          const prevWord = i > 0 ? words[i - 1] : null;
          const nextWord = i + 2 < words.length ? words[i + 2] : null;
          const qty = INDONESIAN_NUMBERS[prevWord] || INDONESIAN_NUMBERS[nextWord] ||
            (prevWord && /^\d+$/.test(prevWord) ? parseInt(prevWord) : null) ||
            (nextWord && /^\d+$/.test(nextWord) ? parseInt(nextWord) : null) || 1;
          matched.push({ item, quantity: qty });
          i += 2;
          if (nextWord && (INDONESIAN_NUMBERS[nextWord] || /^\d+$/.test(nextWord))) i++;
          continue;
        }
      }

      // Single word match
      item = matchSingleItem(word);
      if (item) {
        const prevWord = i > 0 ? words[i - 1] : null;
        const nextWord = i + 1 < words.length ? words[i + 1] : null;
        const qty = INDONESIAN_NUMBERS[prevWord] || INDONESIAN_NUMBERS[nextWord] ||
          (prevWord && /^\d+$/.test(prevWord) ? parseInt(prevWord) : null) ||
          (nextWord && /^\d+$/.test(nextWord) ? parseInt(nextWord) : null) || 1;
        matched.push({ item, quantity: qty });
        i++;
        if (nextWord && (INDONESIAN_NUMBERS[nextWord] || /^\d+$/.test(nextWord))) i++;
        continue;
      }

      i++;
    }

    if (!matched.length) return;

    setItems((prev) => {
      let updated = [...prev];
      for (const { item, quantity } of matched) {
        const idx = updated.findIndex((i) => i.name === item.name);
        if (idx !== -1) {
          updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + quantity };
        } else {
          updated.push({ ...item, quantity });
        }
      }
      return updated;
    });
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
    if (!isOnline) {
      alert("Anda sedang OFFLINE. Hubungkan internet untuk menyimpan transaksi ke database.");
      return;
    }

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
        <div className="flex items-center space-x-3">
          <img
            src="/images/Bingke.svg"
            alt="Logo"
            className="w-10 h-10"
          />
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white leading-none">Bingka61 POS</h1>
            {!isOnline && (
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse flex items-center mt-1 w-fit">
                <span className="w-1.5 h-1.5 bg-white rounded-full mr-1"></span>
                OFFLINE
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setView("pos");
              setIsEditing(!isEditing);
            }}
            className={`p-2 rounded transition-colors ${
              isEditing ? "bg-green-600 shadow-inner" : "bg-orange-600 hover:bg-orange-700"
            } text-white`}
            title={isEditing ? "Selesai Edit" : "Pengaturan Menu"}
          >
            <FontAwesomeIcon icon={isEditing ? faStore : faGear} />
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setView(view === "receipt" ? "pos" : "receipt");
            }}
            className={`p-2 rounded transition-colors ${
              view === "receipt" ? "bg-blue-400 shadow-inner" : "bg-blue-600 hover:bg-blue-700"
            } text-white`}
            title="Pengaturan Struk"
          >
            <FontAwesomeIcon icon={faReceipt} />
          </button>
          <button
            onClick={connectBluetooth}
            className={`p-2 rounded text-white transition-colors ${
              printerCharacteristic ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"
            }`}
            title={printerCharacteristic ? "Printer Terhubung" : "Hubungkan Printer Bluetooth"}
          >
            <FontAwesomeIcon icon={printerCharacteristic ? faPrint : faBluetooth} />
          </button>
          <button
            onClick={() => setIsVoiceMuted(!isVoiceMuted)}
            className={`p-2 rounded text-white transition-colors ${
              isVoiceMuted ? "bg-red-500" : "bg-green-600"
            }`}
            title={isVoiceMuted ? "Suara: Mati" : "Suara: Aktif"}
          >
            <FontAwesomeIcon icon={isVoiceMuted ? faMicrophoneSlash : faMicrophone} />
          </button>
          <Link href="/stats">
            <button
              className="p-2 rounded text-white bg-purple-600 hover:bg-purple-700 transition-colors"
              title="Statistik Penjualan"
            >
              <FontAwesomeIcon icon={faChartSimple} />
            </button>
          </Link>
        </div>
      </div>

      {view === "receipt" ? (
        <div className="bg-gray-100 p-4 rounded-lg shadow-inner min-h-[80vh] flex flex-col items-center overflow-y-auto">
          <div className="flex justify-between w-full mb-4 items-center px-2">
            <h2 className="font-bold text-gray-700">Receipt Designer</h2>
            <button 
              onClick={() => setView("pos")}
              className="text-xs bg-gray-300 px-2 py-1 rounded"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-1" /> Kembali
            </button>
          </div>

          <div className="w-full flex flex-col md:flex-row md:space-x-6 items-start justify-center">
            {/* 1:1 Preview */}
            <div 
              className="bg-white p-6 shadow-2xl mb-6 md:mb-0 border-t-4 border-blue-500"
              style={{
                width: "300px", // Simulated 58mm
                fontFamily: "'Courier New', Courier, monospace",
                minHeight: "450px"
              }}
            >
              <div className="text-center mb-4">
                <div className="font-bold text-lg mb-1">{settings.storeName}</div>
                <div className="text-xs uppercase leading-tight mb-1">{settings.storeAddress}</div>
                <div className="text-xs">Telp: {settings.storePhone}</div>
                <div className="border-b border-dashed border-black my-3"></div>
              </div>

              <div className="text-[10px] space-y-1 mb-3">
                <div className="flex justify-between">
                  <span>No: INV/2026/001</span>
                  <span>22/03/2026 14:30</span>
                </div>
                <div className="border-b border-dashed border-black my-2"></div>
              </div>

              <div className="text-[10px] mb-3">
                <div className="flex font-bold mb-1 border-b border-black border-opacity-10">
                  <span className="w-1/2">ITEM</span>
                  <span className="w-1/6 text-right">QTY</span>
                  <span className="w-1/3 text-right">SUBTOTAL</span>
                </div>
                <div className="flex py-1">
                  <span className="w-1/2">Original</span>
                  <span className="w-1/6 text-right">2</span>
                  <span className="w-1/3 text-right">46.000</span>
                </div>
                <div className="flex py-1">
                  <span className="w-1/2">Keju</span>
                  <span className="w-1/6 text-right">1</span>
                  <span className="w-1/3 text-right">25.000</span>
                </div>
                <div className="border-b border-dashed border-black my-2"></div>
              </div>

              <div className="text-[10px] space-y-1 font-bold">
                <div className="flex justify-between text-xs">
                  <span>TOTAL</span>
                  <span>Rp. 71.000</span>
                </div>
                <div className="flex justify-between opacity-70">
                  <span>CASH</span>
                  <span>Rp. 100.000</span>
                </div>
                <div className="flex justify-between opacity-70">
                  <span>CHANGE</span>
                  <span>Rp. 29.000</span>
                </div>
                <div className="border-b border-dashed border-black my-3"></div>
              </div>

              <div className="text-center text-[10px] italic space-y-1 mt-4">
                <div>{settings.footerGreeting1}</div>
                <div>{settings.footerGreeting2}</div>
              </div>
              
              <div className="mt-8 text-center text-[8px] text-gray-300">
                --------------------------------
              </div>
            </div>

            {/* Editor Sidebar */}
            <div className="flex-1 w-full max-w-md bg-white p-4 rounded-lg shadow space-y-4">
              <h3 className="text-sm font-bold border-b pb-2 flex items-center">
                <FontAwesomeIcon icon={faPencil} className="mr-2 text-blue-500" />
                Customize Content
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">STORE NAME</label>
                  <input
                    type="text"
                    value={settings.storeName}
                    onChange={(e) => setSettings({...settings, storeName: e.target.value})}
                    className="w-full border p-2 rounded text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">ADDRESS</label>
                  <textarea
                    rows="2"
                    value={settings.storeAddress}
                    onChange={(e) => setSettings({...settings, storeAddress: e.target.value})}
                    className="w-full border p-2 rounded text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">PHONE NUMBER</label>
                  <input
                    type="text"
                    value={settings.storePhone}
                    onChange={(e) => setSettings({...settings, storePhone: e.target.value})}
                    className="w-full border p-2 rounded text-sm bg-gray-50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">FOOTER LINE 1</label>
                    <input
                      type="text"
                      value={settings.footerGreeting1}
                      onChange={(e) => setSettings({...settings, footerGreeting1: e.target.value})}
                      className="w-full border p-2 rounded text-sm bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">FOOTER LINE 2</label>
                    <input
                      type="text"
                      value={settings.footerGreeting2}
                      onChange={(e) => setSettings({...settings, footerGreeting2: e.target.value})}
                      className="w-full border p-2 rounded text-sm bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={loading || !isOnline}
                className={`w-full text-white py-3 rounded-lg font-bold transition-all shadow-lg flex items-center justify-center space-x-2 mt-4 ${
                  !isOnline ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading ? (
                  <FontAwesomeIcon icon={faRotateRight} spin />
                ) : (
                  <>
                    <FontAwesomeIcon icon={faStore} />
                    <span>{isOnline ? "SAVE RECEIPT DESIGN" : "OFFLINE - CANNOT SAVE"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {isEditing && (
            <div className="mb-4 bg-white p-3 rounded shadow animate-in fade-in slide-in-from-top duration-300">
              <h3 className="text-sm font-bold mb-2">
                {isOnline ? "Tambah Menu Baru" : "Tambah Menu (Online Saja)"}
              </h3>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Nama"
                  disabled={!isOnline}
                  value={newMenuItem.name}
                  onChange={(e) => setNewMenuItem({...newMenuItem, name: e.target.value})}
                  className="border p-2 rounded text-sm flex-1 disabled:bg-gray-100"
                />
                <input
                  type="number"
                  placeholder="Harga"
                  disabled={!isOnline}
                  value={newMenuItem.price}
                  onChange={(e) => setNewMenuItem({...newMenuItem, price: parseInt(e.target.value) || 0})}
                  className="border p-2 rounded text-sm w-24 disabled:bg-gray-100"
                />
                <button
                  onClick={handleAddMenu}
                  disabled={loading || !isOnline}
                  className={`px-4 py-2 rounded text-sm font-bold text-white ${
                    !isOnline ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  +
                </button>
              </div>
              
              {!isFromDB && (
                <button
                  onClick={handleSaveInitialMenu}
                  disabled={!isOnline}
                  className={`mt-3 w-full p-2 rounded text-xs font-bold transition-colors flex items-center justify-center text-white ${
                    !isOnline ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" />
                  {isOnline ? "Simpan Menu" : "OFFLINE - TIDAK DAPAT SIMPAN"}
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-1 text-sm font-medium">
            {menuItems.map((item, index) => (
              <div
                key={item._id || item.name}
                draggable={isEditing}
                onDragStart={(e) => onDragStart(e, index)}
                onDragOver={(e) => onDragOver(e, index)}
                onDragEnd={onDragEnd}
                className={`relative group ${isEditing ? "wiggle" : ""}`}
              >
                <button
                  onClick={() => !isEditing && handleMenuItemClick(item)}
                  className={`w-full py-4 rounded active:bg-opacity-60 transition-all ${
                    item.name === "Nasi Kebuli"
                      ? "bg-slate-300 text-black"
                      : item.name === "Rendang"
                      ? "bg-red-600 text-white"
                      : item.name === "Kari"
                      ? "bg-orange-500 text-white"
                      : item.name === "Semur"
                      ? "bg-orange-800 text-white"
                      : item.displayColor || "bg-yellow-400"
                  } ${isEditing ? "cursor-move ring-2 ring-blue-400 ring-inset" : ""}`}
                >
                  {item.name} - {item.price} x{" "}
                  {items.find((i) => i.name === item.name)?.quantity || 0}
                </button>

                {isEditing && isOnline && (
                  <div className="absolute inset-0 flex items-center justify-center space-x-4 bg-black bg-opacity-10 rounded">
                    <button
                      onClick={() => {
                        const newName = prompt("Nama Menu:", item.name);
                        const newPrice = prompt("Harga Menu:", item.price);
                        if (newName && newPrice) {
                          handleUpdateMenu({ ...item, name: newName, price: parseInt(newPrice) });
                        }
                      }}
                      className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-transform hover:scale-110"
                    >
                      <FontAwesomeIcon icon={faPencil} size="xs" />
                    </button>
                    <button
                      onClick={() => handleDeleteMenu(item._id)}
                      className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-transform hover:scale-110"
                    >
                      <FontAwesomeIcon icon={faXmark} size="xs" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

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
                height: "45px",
                width: "45px"
              }}
            >
              <span className="bg-white bg-opacity-20 px-2 py-1 rounded text-[10px]">
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
            className="bg-red-500 flex-auto text-white text-center py-2 px-3 rounded hover:bg-red-600 transition-colors"
            style={{ width: "50%", minWidth: "100px" }}
            title="Reset Pesanan"
          >
            <FontAwesomeIcon icon={faRotateRight} className="mr-2" />
            Reset
          </button>
          <button
            onClick={handlePrintLast}
            disabled={!invoice}
            className={`ml-2 flex-auto text-white text-center py-2 px-3 rounded transition-colors ${
              !invoice
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
            style={{ width: "50%", minWidth: "120px" }}
            title="Cetak Ulang Transaksi Terakhir"
          >
            <FontAwesomeIcon icon={faPrint} className="mr-2" />
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
      {returnAmount >= 0 && totalAmount > 0 && (
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
                    className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600 transition-colors"
                    title="Kurangi"
                  >
                    <FontAwesomeIcon icon={faMinus} />
                  </button>
                  <button
                    onClick={() => handleMenuItemClick(item)}
                    className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition-colors"
                    title="Tambah"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  </button>
                  <button
                    onClick={() => handleRemoveItem(item.name)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-xs ml-2 hover:bg-red-700 transition-colors"
                    title="Hapus"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
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
            backgroundColor: "white",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "10px" }}>
            <h2 style={{ margin: "0", fontSize: "14px", fontWeight: "bold" }}>
              {settings.storeName}
            </h2>
            <p style={{ margin: "3px 0", fontSize: "12px" }}>
              {settings.storeAddress}
            </p>
            <p style={{ margin: "3px 0", fontSize: "12px" }}>
              Telp: {settings.storePhone}
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
                <p style={{ margin: "3px 0" }}>{settings.footerGreeting1}</p>
                <p style={{ margin: "3px 0" }}>{settings.footerGreeting2}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
