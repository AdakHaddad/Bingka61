import React from "react";
import { Helmet } from "react-helmet";

export const metadata = {
  title: "Bingke 61",
  description: "Website Bingke 61",
};

export default function RootLayout({ children }) {
  return (
    <div>
      <Helmet>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={metadata.description} />
        <title>{metadata.title}</title>
        <link rel="icon" href="/favicon.ico" />

        {/* Additional SEO tags */}
        <meta
          name="keywords"
          content="makanan Indonesia, Pontianak, Bingke 61, Kalimantan Barat,Bingkenye Umi, Sungai Jawi, Oleh-oleh"
        />
        <meta name="author" content="Bingke 61" />
        <meta name="robots" content="index, follow" />

        {/* Language settings */}
        <meta http-equiv="content-language" content="id" />
        <meta name="language" content="Indonesian" />

        {/* Open Graph tags for better social media sharing */}
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bingke61.vercel.app/" />
        <meta property="og:image" content="/public/favicon.jpg" />
      </Helmet>
      <main className="flex-grow">{children}</main>
    </div>
  );
}
