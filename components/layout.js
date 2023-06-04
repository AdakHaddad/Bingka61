export const metadata = {
  title: "Bingke 61",
  description: "Website Bingke 61",
};
import Footer from "@/components/footer";

export default function RootLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content={metadata.description} />
      <title>{metadata.title}</title>
      <link rel="icon" href="/favicon.ico" />
      <main className="flex-grow">{children}</main>
    </div>
  );
}
