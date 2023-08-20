import React from "react";
import Head from "next/head";
export const metadata = {
  title: "Bingke 61",
  description:
    "Toko kue oleh-oleh lengkap khas Pontianak serta makanan ringan. Temukan rasa yang kaya dan warisan budaya Kalimantan Barat melalui pilihan eksklusif kami dari kue oleh-oleh. Kunjungi kami hari ini dan nikmati cita rasa masakan Indonesia yang otentik. ",
};

export default function RootLayout({ children }) {
  return (
    <>
      <Head>
        <title>{metadata.title}</title>
      </Head>
      <meta charSet="utf-8" />

      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content={metadata.description} />
      <link rel="icon" href="../public/favicon.ico" />

      <meta
        name="keywords"
        content="Indonesian food, Pontianak, Bingke 61, Kalimantan Barat, authentic cuisine"
      />
      <meta name="author" content="Admin" />
      <meta name="robots" content="index, follow" />

      {/* Language settings */}
      <meta httpEquiv="content-language" content="id" />
      <meta name="language" content="Indonesian" />

      {/* Open Graph tags for better social media sharing */}
      <meta property="og:title" content={metadata.title} />
      <meta property="og:description" content={metadata.description} />
      <meta property="og:type" content="website" />

      <main className="flex-grow  bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500">
        {children}
      </main>
    </>
  );
}
