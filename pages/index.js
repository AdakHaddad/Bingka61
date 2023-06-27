import Order from "@/components/order.js";
import Nav from "@/components/nav.js";
import Ucapan from "@/components/ucapan";
import Footer from "@/components/footer";
export default function Page() {
  return (
    <div
      className="bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500"
      style={{
        backgroundSize: "200% 200%",
        backgroundPosition: "center",
        animation: "gradientAnimation 10s ease infinite",
      }}
    >
      <Nav />
      <Ucapan />
      <img
        src="/favicon.jpg"
        className="hidden md:block w-12 h-12 z-0"
        style={{ top: "250px", left: "950px" }}
      />
      <Order />
      <Footer />
    </div>
  );
}
