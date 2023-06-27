import Head from "next/head";
import React from "react";

export const metadata = {
  title: "Bingke 61",
  description:
    "Experience the authentic flavors of Indonesian cuisine at Bingke 61. We offer a wide range of delicious dishes in Pontianak, Kalimantan Barat. Visit us today and indulge in the rich culinary heritage of Indonesia.",
};

export default function RootLayout({ children }) {
  return (
    <div>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={metadata.description} />
        <title>{metadata.title}</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="google-site-verification"
          content="jp4c1QT3ewOcc0RQ0_pDKs-I8RlOAciS2CoM2eRREyg"
        />
        <meta
          name="keywords"
          content="Indonesian food, Pontianak, Bingke 61, Kalimantan Barat, authentic cuisine"
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
      </Head>
      <main className="flex-grow">{children}</main>
    </div>
  );
}
