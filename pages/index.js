import Order from "@/components/order";
// import Nav from "@/components/navbar";
export default function Page() {
  return (
    <>
      <div>{/* <Nav /> */}</div>
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
