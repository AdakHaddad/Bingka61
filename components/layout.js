export const metadata = {
  title: "Bingka 61",
  description: "Website Bingke 61",
};

export default function RootLayout({ children }) {
  return (
    <div>
      <body>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={metadata.description} />
        <title>{metadata.title}</title>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=Poppins"
        />
        <link rel="icon" href="/favicon.ico" />
        {children}
      </body>
    </div>
  );
}