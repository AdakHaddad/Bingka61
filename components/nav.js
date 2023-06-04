import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWhatsapp,
  faInstagram,
  faBlogger,
} from "@fortawesome/free-brands-svg-icons";

export default function Navbar() {
  return (
    <nav className="bg-blue-500 py-4 px-6 flex items-center justify-between sticky">
      <a href="#" className="text-white font-bold text-xl">
        Bingke 61
      </a>
      <div className="flex space-x-4">
        <SocialMediaButton
          icon={faBlogger}
          link="https://bingka61.blogspot.com"
          label="Blog"
        />

        <SocialMediaButton
          icon={faInstagram}
          link="https://instagram.com/bingke_61"
          label="Instagram"
        />
        <SocialMediaButton
          icon={faWhatsapp}
          link="https://wa.me/6285933059045"
          label="WhatsApp"
        />
      </div>
    </nav>
  );
}

function SocialMediaButton({ icon, link, label }) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="text-white hover:text-gray-200"
    >
      <FontAwesomeIcon icon={icon} size="lg" aria-label={label} />
    </a>
  );
}
