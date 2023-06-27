"use client";
import { useState } from "react";

const MENU_ITEMS = [
  { name: "Telur (Original)", price: 22000 },
  { name: "Berendam", price: 24000 },
  { name: "Keju", price: 24000 },
  { name: "Kentang", price: 24000 },
  { name: "Ubi", price: 24000 },
  { name: "Daging", price: 24000 },
  { name: "Pandan", price: 22000 },
];

export default function Order() {
  const [orders, setOrders] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);

  const handleOrderChange = (item, amount) => {
    if (amount >= 0) {
      setOrders((prevOrders) => ({ ...prevOrders, [item.name]: amount }));
      setTotalPrice(
        (prevPrice) =>
          prevPrice + item.price * (amount - (orders[item.name] || 0))
      );
    }
  };

  const handleQuantityChange = (item, event) => {
    const quantity = parseInt(event.target.value);
    handleOrderChange(item, quantity);
  };

  const handleOrderSubmit = () => {
    const message = `Pesanan saya:\n\n${Object.keys(orders)
      .map((key) => `${key}: ${orders[key]}`)
      .join("\n")}\n\nTotal: Rp${totalPrice.toLocaleString()}`;
    const url = `https://wa.me/6285933059045?text=${encodeURIComponent(
      message
    )}`;
    window.open(url, "_blank");
  };

  return (
    <div className="top-5 md:mt-26 mt-24 mx-10 mb-28">
      <h1 className="text-center text-4xl font-bold text-white">Pemesanan</h1>
      <div className="bg-white top-5 mt-10 mb-2 shadow-md rounded-lg px-7 py-6 space-y-6 ">
        {MENU_ITEMS.map((item) => (
          <div key={item.name} className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium">{item.name}</h2>
              <span className="text-gray-500 text-sm">
                Rp{item.price.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                className="text-gray-500 font-bold text-2xl hover:text-gray-900"
                onClick={() =>
                  handleOrderChange(item, (orders[item.name] || 0) + 1)
                }
              >
                +
              </button>
              <input
                type="number"
                className="text-center w-16"
                value={orders[item.name] || 0}
                onChange={(e) =>
                  handleOrderChange(item, parseInt(e.target.value) || 0)
                }
              />
              <button
                className="text-gray-500 font-bold text-2xl hover:text-gray-900"
                onClick={() =>
                  handleOrderChange(
                    item,
                    Math.max(0, (orders[item.name] || 0) - 1)
                  )
                }
              >
                –
              </button>
            </div>
          </div>
        ))}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">Total:</h2>
          <span className="text-lg font-medium">
            Rp{totalPrice.toLocaleString()}
          </span>
        </div>
        <button
          className="bg-green-500 hover:bg-green-600 text-white flex justify-center font-bold py-2 px-6 rounded-lg  w-full "
          onClick={handleOrderSubmit}
        >
          Kirim Pesanan
        </button>
      </div>
    </div>
  );
}
