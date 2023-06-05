import React from "react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white py-12 px-6">
      <div className="container mx-auto flex justify-between items-center">
        <div>
          <p className="mr-28">
            Alamat: Jl. Kiai Haji Wahid Hasyim No.61, Sungai Bangkong, Pontianak
            Kota, Kota Pontianak, Kalimantan Barat 78117
          </p>
        </div>
        <div>
          <a
            href="https://goo.gl/maps/SZ9rPmPmuXaC2f2EA"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-300 hover:text-blue-500"
          >
            Lihat di Google Maps
          </a>
        </div>
      </div>
      <div className="container mx-auto">
        <iframe
          width="100%"
          height="450"
          style={{ border: 0, margin: "20px 0" }}
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d249.36362096970893!2d109.32607569817452!3d-0.025164847101731155!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e1d58f6dbf76fcf%3A0xc0e7959c0dd6385c!2sBingka%2061!5e0!3m2!1sen!2sid!4v1685907717888!5m2!1sen!2sid"
          allowFullScreen
          loading="lazy"
        ></iframe>
        <p className="text-xs text-gray-500">&copy;{currentYear} Bingke 61</p>
      </div>
    </footer>
  );
}
