import React, { useState, useEffect } from "react";

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

  useEffect(() => {
    const total = items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    const returnAmt = cash - total;
    setReturnAmount(returnAmt);
  }, [items, cash]);

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
    setCash(cash + value.value); // Fixed to extract the value
  };

  const handleReset = () => {
    setItems([]);
    setCash(0);
    setReturnAmount(0);
  };

  return (
    <div className="container mx-auto p-2">
      <div className="grid grid-cols-2 gap-1 text-sm">
        {MENU_ITEMS.map((item, index) => (
          <button
            key={index}
            onClick={() => handleMenuItemClick(item)}
            className={` py-4 rounded active:bg-opacity-60 ${
              item.name === "Blodar" ||
              item.name === "Tar Susu" ||
              item.name === "Berendam" ||
              item.name === "Original" ||
              item.name === "Keju" ||
              item.name === "Kentang" ||
              item.name === "Ubi" ||
              item.name === "Daging" ||
              item.name === "Pandan"
                ? "bg-yellow-400"
                : item.name === "Nasi Kebuli"
                ? "bg-slate-300 text-black" // White for Nasi Kebuli
                : item.name === " Rendang"
                ? "bg-red-600 text-white"
                : item.name === " Kari"
                ? "bg-orange-500 text-white"
                : item.name === " Semur"
                ? "bg-orange-800 text-white"
                : "" // No additional class for other items
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
              style={{ backgroundColor: value.color }}
              className={`text-white py-2 rounded mb-2 mx-2 sm:mx-0 ${
                value.value === 100000 ? "w-full" : "w-24"
              }`}
            >
              {new Intl.NumberFormat("id-ID").format(value.value)}
            </button>
          ))}
        </div>

        <div className="flex items-center">
          <input
            type="number"
            id="cash"
            value={cash}
            onChange={(e) => setCash(parseFloat(e.target.value))}
            className="border flex border-gray-300 max-w-screen-md rounded px-3 py-2 mr-2"
            style={{ width: "50%", maxWidth: "200px" }} // Adjust the width and maximum width as needed
          />
          <button
            onClick={handleReset}
            className="bg-red-500 flex-auto text-white text-center py-2 px-3 rounded hover:bg-red-600"
            style={{ width: "50%", minWidth: "100px" }} // Adjust the width and minimum width as needed
          >
            Reset
          </button>
        </div>
      </div>
      {returnAmount > 0 && (
        <div className="mt-4">
          <p className="font-bold">Kembali:</p>
          <p className="text-center font-black text-xl">{returnAmount}</p>
        </div>
      )}
      {items.length > 0 && (
        <div className="mt-4">
          <p className="font-bold ">Pesanan:</p>
          <ul>
            {items.map((item, index) => (
              <li key={index}>
                {item.name} - Rp.{item.price} x {item.quantity}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
