import "../css/globals.css";
import RootLayout from "@/components/layout.js";

export default function MyApp({ Component, pageProps }) {
  return (
    <RootLayout>
      <Component {...pageProps} />
    </RootLayout>
  );
}
