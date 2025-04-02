import "../css/globals.css";
import RootLayout from "../components/layout.js";
import { Analytics } from "@vercel/analytics/react";

export default function MyApp({ Component, pageProps }) {
  return (
    <RootLayout>
      <Component {...pageProps} />
      <Analytics /> {/* Ensure Analytics is included */}
    </RootLayout>
  );
}
