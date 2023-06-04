export const metadata = {
  title: "Bingka 61",
  description: "Website Bingke 61",
};

export default function RootLayout({ children }) {
  return (
    <div>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content={metadata.description} />
      <title>{metadata.title}</title>
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap"
        rel="stylesheet"
      />

      <link href="../public/Fonts/Poppins" rel="stylesheet" />
      <link rel="icon" href="/favicon.ico" />
      {children}
    </div>
  );
}
