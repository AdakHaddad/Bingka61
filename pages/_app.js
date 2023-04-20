import "../css/globals.css";
import RootLayout from "@/components/layout";
import Head from "next/head";

export default function MyApp({ Component, pageProps }) {
  return (
    <RootLayout>
      <Component {...pageProps} />
    </RootLayout>
  );
}
