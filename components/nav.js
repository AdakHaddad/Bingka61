import React, { useState, useEffect } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWhatsapp,
  faInstagram,
  faBlogger,
} from "@fortawesome/free-brands-svg-icons";

export default function Nav() {
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);

  useEffect(() => {
    let prevScrollPos = window.pageYOffset;

    const handleScroll = () => {
      const currentScrollPos = window.pageYOffset;
      setIsNavbarVisible(
        currentScrollPos <= 0 || currentScrollPos < prevScrollPos
      );
      prevScrollPos = currentScrollPos;
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <nav
      className={`bg-black bg-opacity-5 backdrop-filter backdrop-blur-xl py-4 px-6 flex items-center justify-between sticky top-0 z-10 ${
        isNavbarVisible ? "opacity-100" : "opacity-0"
      } transition-opacity duration-500`}
    >
      <a href="#" className="text-white font-bold text-xl">
        Bingke 61
      </a>
      <div className="flex space-x-4">
        <div>
          <SocialMediaButton
            icon={faBlogger}
            link="https://bingka61.blogspot.com"
            label="Blog"
          />
          <a
            href="https://bingka61.blogspot.com"
            className="text-white font-bold text-l ml-1"
          >
            Blog
          </a>
        </div>

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
