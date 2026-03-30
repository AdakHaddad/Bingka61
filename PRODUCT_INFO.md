# Bingka61 POS - Production Ready POS System

A modern, web-based Point of Sale system designed for small businesses, featuring direct hardware integration and 100% dynamic configuration.

## 🚀 Core Philosophy: Zero Hardcoding
Unlike basic templates, this POS is built for end-user customization. Every aspect of the business logic is stored in a **MongoDB database**, meaning the application does not need a developer to change prices, names, or layouts.

---

## 🛠 Features

### 1. Hardware Integration (Web Bluetooth)
*   **Direct Printing**: Uses the Web Bluetooth API to talk directly to thermal printers (Optimized for **ZJ-5809**).
*   **Driverless**: No need to install local print servers or drivers. Works directly from Chrome/Edge browsers.
*   **Cash Drawer Support**: Includes standard ESC/POS commands to trigger cash drawer opening (`Buka Laci`).
*   **58mm Optimized**: Automatic 32-character wrapping logic to ensure receipts look perfect on small thermal paper.

### 2. Interactive "Wiggle" Menu Management
*   **Visual Editor**: Enter "Wiggle Mode" (iOS-style) to manage your store layout.
*   **Drag & Drop**: Reorder menu tiles simply by dragging them to the desired position.
*   **Live Editing**: Change item names and prices directly on the grid tiles.
*   **Database Sync**: Every move and edit is instantly persisted to the MongoDB `Menu` collection.

### 3. WYSIWYG Receipt Designer
*   **1:1 Preview**: A dedicated designer view with a realistic "Paper Style" preview.
*   **Custom Branding**: Dynamic fields for:
    *   Store Name
    *   Store Address
    *   Phone Number
    *   Footer Greetings (Line 1 & 2)
*   **Global Application**: Changes saved here automatically update both Bluetooth receipts and server-side print jobs.

### 4. Advanced Analytics & Reporting
*   **Sales Dashboard**: Real-time revenue tracking.
*   **Date Filtering**: View stats by Today, Week, Month, or Custom Ranges.
*   **Product Insights**: Bar and Pie charts showing Top Products by Revenue and Quantity.
*   **Transaction History**: Detailed logs of every invoice generated.

---

## 🏗 Technical Stack
*   **Frontend**: Next.js (React) with Tailwind CSS.
*   **Icons**: FontAwesome (Pro-style icon implementation).
*   **Database**: MongoDB (via Mongoose models).
*   **Communication**: Web Bluetooth API (GATT Services).
*   **Formatting**: `date-fns` for internationalized timestamps and `Intl.NumberFormat` for Indonesian Rupiah (IDR).

---

## 📈 Deployment Readiness
This system is ready for SaaS (Software as a Service) scaling. 
*   **Config-Free**: No `.env` or code changes required to change business details.
*   **Seeding Tool**: Built-in "Simpan Menu Utama" feature to quickly initialize a new business database with default items.
*   **Scalable Architecture**: API routes are modularized for Menu, Transactions, and Settings.

---
*Created for Bingka61 - Optimized for Productivity.*
