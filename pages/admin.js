import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns"; // Make sure to import this as it's used in your invoice template

const MENU_ITEMS = [
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
  const [items, setItems] = useState([]);
  const [cash, setCash] = useState(0);
  const [returnAmount, setReturnAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [printStatus, setPrintStatus] = useState(null); // New state for printer status
  const invoiceRef = useRef(null);

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

        // Send directly to thermal printer instead of opening print dialog
        await sendToPrinter(data.data);
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
      <div className="grid grid-cols-2 gap-1 text-sm font-medium">
        {MENU_ITEMS.map((item, index) => (
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
                : "bg-yellow-400"
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
            Kembali: Rp. {new Intl.NumberFormat("id-ID").format(returnAmount)}
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
          <p className="font-bold">Pesanan:</p>
          <ul>
            {items.map((item, index) => (
              <li key={index}>
                {item.name} - Rp.
                {new Intl.NumberFormat("id-ID").format(item.price)} x{" "}
                {item.quantity}
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
