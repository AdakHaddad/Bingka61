import Order from "@/components/order.js";
import Nav from "@/components/nav.js";
import { useState } from "react";

export default function Page() {
  return (
    <>
      <Nav />
      <div className="mt-14 ">
        <h1>Selamat Datang,</h1>
        <h1 className="description">
          Pilih menu dan jumlah untuk melakukan pemesanan melalui Whatsapp{" "}
        </h1>
      </div>
      <Order />
    </>
  );
}
