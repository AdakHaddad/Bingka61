import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  format,
  parseISO,
  subDays,
  startOfDay,
  endOfDay,
  differenceInDays,
} from "date-fns";
import { id } from "date-fns/locale";

export default function StatsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState("today"); // today, week, month, all
  const [startDate, setStartDate] = useState(
    format(subDays(new Date(), 7), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/transactions");
        const data = await response.json();

        if (data.success) {
          setTransactions(data.data);
        } else {
          setError("Failed to load transactions");
        }
      } catch (err) {
        setError("Error connecting to the server");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Filter transactions based on date range
  const filteredTransactions = React.useMemo(() => {
    if (!transactions.length) return [];

    const now = new Date();
    let start, end;

    switch (dateRange) {
      case "today":
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case "week":
        start = startOfDay(subDays(now, 7));
        end = endOfDay(now);
        break;
      case "month":
        start = startOfDay(subDays(now, 30));
        end = endOfDay(now);
        break;
      case "custom":
        start = startOfDay(new Date(startDate));
        end = endOfDay(new Date(endDate));
        break;
      default:
        // All time
        return transactions;
    }

    return transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.timestamp);
      return transactionDate >= start && transactionDate <= end;
    });
  }, [transactions, dateRange, startDate, endDate]);

  // Calculate total revenue
  const totalRevenue = filteredTransactions.reduce(
    (sum, transaction) => sum + transaction.totalAmount,
    0
  );

  // Calculate average transaction value
  const averageTransactionValue =
    filteredTransactions.length > 0
      ? totalRevenue / filteredTransactions.length
      : 0;

  // Calculate total items sold
  const totalItemsSold = filteredTransactions.reduce(
    (sum, transaction) =>
      sum +
      transaction.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );

  // Generate sales by product data
  const salesByProduct = React.useMemo(() => {
    const productMap = {};

    filteredTransactions.forEach((transaction) => {
      transaction.items.forEach((item) => {
        if (!productMap[item.name]) {
          productMap[item.name] = {
            name: item.name,
            quantity: 0,
            revenue: 0,
          };
        }
        productMap[item.name].quantity += item.quantity;
        productMap[item.name].revenue += item.price * item.quantity;
      });
    });

    return Object.values(productMap).sort((a, b) => b.revenue - a.revenue);
  }, [filteredTransactions]);

  // Generate sales by day data
  const salesByDay = React.useMemo(() => {
    const dayMap = {};

    filteredTransactions.forEach((transaction) => {
      const day = format(new Date(transaction.timestamp), "yyyy-MM-dd");
      if (!dayMap[day]) {
        dayMap[day] = {
          date: day,
          revenue: 0,
          transactions: 0,
          items: 0,
        };
      }
      dayMap[day].revenue += transaction.totalAmount;
      dayMap[day].transactions += 1;
      dayMap[day].items += transaction.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
    });

    // Fill in missing days for better visualization
    if (
      dateRange === "week" ||
      dateRange === "month" ||
      dateRange === "custom"
    ) {
      const start =
        dateRange === "custom"
          ? new Date(startDate)
          : dateRange === "week"
          ? subDays(new Date(), 7)
          : subDays(new Date(), 30);

      const end = new Date(endDate || new Date());
      const dayCount = differenceInDays(end, start) + 1;

      for (let i = 0; i < dayCount; i++) {
        const currentDate = format(
          subDays(end, dayCount - i - 1),
          "yyyy-MM-dd"
        );
        if (!dayMap[currentDate]) {
          dayMap[currentDate] = {
            date: currentDate,
            revenue: 0,
            transactions: 0,
            items: 0,
          };
        }
      }
    }

    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTransactions, dateRange, startDate, endDate]);

  // Colors for the charts
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#8dd1e1",
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl font-semibold text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl font-semibold text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
    
      {/* Date range filter */}
      <div className="mb-8 bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Date Range</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setDateRange("today")}
            className={`px-4 py-2 rounded ${
              dateRange === "today"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setDateRange("week")}
            className={`px-4 py-2 rounded ${
              dateRange === "week"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDateRange("month")}
            className={`px-4 py-2 rounded ${
              dateRange === "month"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setDateRange("all")}
            className={`px-4 py-2 rounded ${
              dateRange === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setDateRange("custom")}
            className={`px-4 py-2 rounded ${
              dateRange === "custom"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            Custom
          </button>
        </div>

        {dateRange === "custom" && (
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-500">Total Revenue</h2>
          <p className="text-3xl font-bold">
            Rp {new Intl.NumberFormat("id-ID").format(totalRevenue)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-500">Transactions</h2>
          <p className="text-3xl font-bold">{filteredTransactions.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-500">Items Sold</h2>
          <p className="text-3xl font-bold">{totalItemsSold}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-500">Average Order</h2>
          <p className="text-3xl font-bold">
            Rp {new Intl.NumberFormat("id-ID").format(averageTransactionValue)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue by Day */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Daily Revenue</h2>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <LineChart
                data={salesByDay}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), "dd/MM")}
                />
                <YAxis
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("id-ID", {
                      notation: "compact",
                      compactDisplay: "short",
                    }).format(value)
                  }
                />
                <Tooltip
                  formatter={(value) => [
                    `Rp ${new Intl.NumberFormat("id-ID").format(value)}`,
                    "Revenue",
                  ]}
                  labelFormatter={(date) =>
                    format(new Date(date), "dd MMMM yyyy", { locale: id })
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders by Day */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Daily Transactions</h2>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart
                data={salesByDay}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), "dd/MM")}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(date) =>
                    format(new Date(date), "dd MMMM yyyy", { locale: id })
                  }
                />
                <Legend />
                <Bar dataKey="transactions" fill="#8884d8" name="Orders" />
                <Bar dataKey="items" fill="#82ca9d" name="Items" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Products by Revenue */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            Top Products by Revenue
          </h2>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart
                data={salesByProduct.slice(0, 10)}
                layout="vertical"
                margin={{
                  top: 5,
                  right: 30,
                  left: 100,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("id-ID", {
                      notation: "compact",
                      compactDisplay: "short",
                    }).format(value)
                  }
                />
                <YAxis type="category" dataKey="name" />
                <Tooltip
                  formatter={(value) => [
                    `Rp ${new Intl.NumberFormat("id-ID").format(value)}`,
                    "Revenue",
                  ]}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products by Quantity */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            Top Products by Quantity
          </h2>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={salesByProduct.slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="quantity"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {salesByProduct.slice(0, 8).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [value, "Units"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Invoice #
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Items
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.slice(0, 10).map((transaction) => (
                <tr key={transaction._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {transaction.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {format(
                      new Date(transaction.timestamp),
                      "dd MMM yyyy HH:mm",
                      { locale: id }
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {transaction.items.map((item) => (
                      <div key={item._id}>
                        {item.name} x {item.quantity}
                      </div>
                    ))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    Rp{" "}
                    {new Intl.NumberFormat("id-ID").format(
                      transaction.totalAmount
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
