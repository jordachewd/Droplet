"use client";

import { useEffect, useState } from "react";
import classNames from "classnames";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import ToggleTheme from "@/components/shared/toggle-theme";
import AvatarMenu from "@/components/shared/avatar-menu";
import Logo from "@/components/shared/app-logo";

export default function Header() {
  const [scrolled, setScrolled] = useState<boolean>(false);
  const { isSignedIn } = useUser();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <section
      className={classNames(
        "Header sticky left-0 right-0 top-0 z-20 flex w-full px-4 transition-all duration-300 ease-in-out",
        scrolled &&
          "bg-lavenderHaze-100/50 shadow-sm backdrop-blur-lg dark:bg-nightIndigo-900/50",
      )}
    >
      <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between py-3">
        <div className="flex items-center gap-18">
          <Logo size={30} />

          <nav className="hidden items-center gap-10 md:flex">
            <Link className="menu-item text-lg" href="/about">
              About
            </Link>
            <Link className="menu-item text-lg" href="/personas">
              Personas
            </Link>
            <Link className="menu-item text-lg" href="/plans">
              Plans
            </Link>
            <Link className="menu-item text-lg" href="/faqs">
              FAQs
            </Link>
            {isSignedIn && (
              <Link className="menu-item text-lg" href="/app">
                App
              </Link>
            )}
          </nav>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {!isSignedIn && (
            <Link className="btn btn-text btn-sm uppercase" href="/sign-in">
              Login
            </Link>
          )}

          <ToggleTheme />

          {isSignedIn && <AvatarMenu />}
        </div>
      </div>
    </section>
  );
}
