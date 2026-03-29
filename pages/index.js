import Order from "@/components/order.js";
import Nav from "@/components/nav.js";
import Ucapan from "@/components/ucapan";
import Footer from "@/components/footer";
export default function Page() {
  return (
    <>
      <Nav />
      <div className="flex justify-center lg:absolute lg:right-10 lg:top-60 animate-bounce-custom z-0 mt-10 lg:mt-0">
        <img
          src="/images/Bingke.svg"
          alt="Bingke"
          className="w-48 h-48 lg:w-[400px] lg:h-[400px]"
          loading="eager"
        />
      </div>
      <Ucapan />
      <Order />
      <Footer />
    </>
  );
}
