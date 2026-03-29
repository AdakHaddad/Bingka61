import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  AreaChart,
  Area,
} from "recharts";
import {
  format,
  parseISO,
  subDays,
  startOfDay,
  endOfDay,
  differenceInDays,
  isSameDay,
  startOfToday,
  startOfYesterday,
} from "date-fns";
import { id } from "date-fns/locale";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faChartLine, faBagShopping, faMoneyBillTrendUp, faClock } from "@fortawesome/free-solid-svg-icons";

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

  // Comparative metrics (Today vs Yesterday)
  const statsComparison = React.useMemo(() => {
    const today = startOfToday();
    const yesterday = startOfYesterday();

    const todayTrans = transactions.filter(t => isSameDay(new Date(t.timestamp), today));
    const yesterdayTrans = transactions.filter(t => isSameDay(new Date(t.timestamp), yesterday));

    const todayRevenue = todayTrans.reduce((sum, t) => sum + t.totalAmount, 0);
    const yesterdayRevenue = yesterdayTrans.reduce((sum, t) => sum + t.totalAmount, 0);

    const revenueDiff = todayRevenue - yesterdayRevenue;
    const revenuePercent = yesterdayRevenue > 0 ? (revenueDiff / yesterdayRevenue) * 100 : 0;

    return {
      todayRevenue,
      yesterdayRevenue,
      revenueDiff,
      revenuePercent,
      todayCount: todayTrans.length,
      yesterdayCount: yesterdayTrans.length
    };
  }, [transactions]);

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

  // Busy Hours Data
  const busyHours = React.useMemo(() => {
    const hourMap = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      count: 0,
      revenue: 0
    }));

    filteredTransactions.forEach(t => {
      const hour = new Date(t.timestamp).getHours();
      hourMap[hour].count += 1;
      hourMap[hour].revenue += t.totalAmount;
    });

    return hourMap;
  }, [filteredTransactions]);

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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link href="/admin">
            <button className="p-2 rounded-full bg-white shadow hover:bg-gray-100 transition-colors">
              <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5 text-gray-600" />
            </button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Sales Dashboard</h1>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
          <span className="text-blue-600 font-medium">
            Today: Rp {new Intl.NumberFormat("id-ID").format(statsComparison.todayRevenue)}
          </span>
          <span className={`ml-3 text-xs ${statsComparison.revenueDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {statsComparison.revenueDiff >= 0 ? '↑' : '↓'} {Math.abs(statsComparison.revenuePercent).toFixed(1)}% vs yesterday
          </span>
        </div>
      </div>
    
      {/* Date range filter */}
      <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <FontAwesomeIcon icon={faClock} className="mr-2 text-blue-500" />
          Filter Data
        </h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {['today', 'week', 'month', 'all', 'custom'].map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateRange === range
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1).replace('week', 'Last 7 Days').replace('month', 'Last 30 Days').replace('all', 'All Time')}
            </button>
          ))}
        </div>

        {dateRange === "custom" && (
          <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard 
          title="Total Revenue" 
          value={`Rp ${new Intl.NumberFormat("id-ID").format(totalRevenue)}`}
          icon={faMoneyBillTrendUp}
          color="blue"
        />
        <MetricCard 
          title="Transactions" 
          value={filteredTransactions.length}
          icon={faChartLine}
          color="purple"
        />
        <MetricCard 
          title="Items Sold" 
          value={totalItemsSold}
          icon={faBagShopping}
          color="green"
        />
        <MetricCard 
          title="Avg Transaction" 
          value={`Rp ${new Intl.NumberFormat("id-ID").format(averageTransactionValue)}`}
          icon={faChartLine}
          color="orange"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue by Day */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-6 text-gray-800">Revenue Trends</h2>
          <div style={{ width: "100%", height: 350 }}>
            <ResponsiveContainer>
              <AreaChart data={salesByDay}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{fontSize: 12}}
                  tickFormatter={(date) => format(new Date(date), "dd/MM")}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{fontSize: 12}}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("id-ID", {
                      notation: "compact",
                      compactDisplay: "short",
                    }).format(value)
                  }
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [
                    `Rp ${new Intl.NumberFormat("id-ID").format(value)}`,
                    "Revenue",
                  ]}
                  labelFormatter={(date) =>
                    format(new Date(date), "dd MMMM yyyy", { locale: id })
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Busy Hours */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-6 text-gray-800">Busy Hours</h2>
          <div style={{ width: "100%", height: 350 }}>
            <ResponsiveContainer>
              <BarChart data={busyHours}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(hour) => `Time: ${hour}`}
                />
                <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Products by Revenue */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-6 text-gray-800">Top Products (Revenue)</h2>
          <div style={{ width: "100%", height: 350 }}>
            <ResponsiveContainer>
              <BarChart
                data={salesByProduct.slice(0, 8)}
                layout="vertical"
                margin={{ left: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("id-ID", {
                      notation: "compact",
                      compactDisplay: "short",
                    }).format(value)
                  }
                />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <Tooltip
                  cursor={{fill: '#f9fafb'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [
                    `Rp ${new Intl.NumberFormat("id-ID").format(value)}`,
                    "Revenue",
                  ]}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales Composition */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-6 text-gray-800">Sales Composition</h2>
          <div style={{ width: "100%", height: 350 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={salesByProduct.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="quantity"
                  nameKey="name"
                >
                  {salesByProduct.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`${value} units`, "Sold"]} 
                />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Recent Transactions</h2>
          <span className="text-sm text-gray-500">{filteredTransactions.length} results</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Invoice</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Items Summary</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Total Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {filteredTransactions.slice(0, 10).map((transaction) => (
                <tr key={transaction._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    {transaction.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {format(new Date(transaction.timestamp), "dd MMM, HH:mm", { locale: id })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <span className="truncate block max-w-xs">
                      {transaction.items.map(i => `${i.name} (${i.quantity})`).join(", ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 text-right">
                    Rp {new Intl.NumberFormat("id-ID").format(transaction.totalAmount)}
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

function MetricCard({ title, value, icon, color }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    green: "bg-green-50 text-green-600 border-green-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorMap[color]} border`}>
          <FontAwesomeIcon icon={icon} className="w-5 h-5" />
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
}
