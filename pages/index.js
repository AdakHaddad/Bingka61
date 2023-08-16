import Order from "@/components/order.js";
import Nav from "@/components/nav.js";
import Ucapan from "@/components/ucapan";
import Footer from "@/components/footer";
export default function Page() {
  return (
    <>
      <Nav />
      <div className="hidden lg:block absolute right-10 top-64 ">
        <img
          src="/images/Bingke.png"
          alt="Bingke"
          width="400"
          height="400"
          loading="lazy"
        />
      </div>

      <Ucapan />
      <Order />
      <Footer />
    </>
  );
}
