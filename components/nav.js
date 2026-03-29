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
      className={`bg-black bg-opacity-5 backdrop-filter backdrop-blur-xl py-4 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10 ${
        isNavbarVisible ? "opacity-100" : "opacity-0"
      } transition-opacity duration-500`}
    >
      <a href="#" className="flex items-center space-x-2 text-white font-bold text-xl">
        <img
          src="/images/Bingke.svg"
          alt="Logo"
          className="w-8 h-8"
        />
        <span className="hidden xs:inline">Bingke 61</span>
      </a>
      <div className="flex space-x-4 items-center">
        <div className="flex items-center">
          <SocialMediaButton
            icon={faBlogger}
            link="https://bingka61.blogspot.com"
            label="Blog"
          />
          <a
            href="https://bingka61.blogspot.com"
            className="text-white font-bold text-l ml-1 hidden sm:inline"
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
          link="https://wa.me/6289512777961"
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
