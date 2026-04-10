"use client";

import { useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import ToggleTheme from "@/components/shared/toggle-theme";
import AvatarMenu from "@/components/shared/avatar-menu";
import Button from "@/components/shared/button";
import Logo from "@/components/shared/app-logo";

const MAIN_NAV_LINKS = [
  { href: "/about", label: "About", requiresAuth: false },
  { href: "/personas", label: "Personas", requiresAuth: false },
  { href: "/plans", label: "Plans", requiresAuth: false },
  { href: "/app", label: "App", requiresAuth: true },
] as const;

export default function Header() {
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [openMenuPathname, setOpenMenuPathname] = useState<string | null>(null);
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  const mobileMenuOpen = openMenuPathname === pathname;
  const visibleMainLinks = useMemo(
    () =>
      MAIN_NAV_LINKS.filter(
        (link) => !link.requiresAuth || Boolean(isSignedIn),
      ),
    [isSignedIn],
  );
  const handleMobileMenuToggle = () => {
    setOpenMenuPathname((currentPathname) =>
      currentPathname === pathname ? null : pathname,
    );
  };
  const handleMobileMenuClose = () => {
    setOpenMenuPathname(null);
  };

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

  const scrolledHeader =
    "bg-lavenderHaze-100/50 shadow-sm backdrop-blur-lg dark:bg-nightIndigo-900/50";

  return (
    <header
      className={classNames(
        "Header sticky left-0 right-0 top-0 z-20 flex w-full transition-all duration-300 ease-in-out",
        scrolled && scrolledHeader,
      )}
    >
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col px-4">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-4 lg:gap-18">
            <Logo size={30} />

            <nav
              aria-label="Main navigation"
              className="hidden items-center gap-10 md:flex"
            >
              {visibleMainLinks.map((link) => (
                <Link
                  key={link.href}
                  className="menu-item text-lg"
                  href={link.href}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="ml-auto flex items-center gap-2 md:gap-4">
            <Button
              variant="icon"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-main-navigation"
              className="md:hidden"
              onClick={handleMobileMenuToggle}
            >
              <i
                className={mobileMenuOpen ? "bi bi-x-lg" : "bi bi-list"}
                aria-hidden="true"
              ></i>
            </Button>

            {!isSignedIn && (
              <Link className="btn btn-text btn-sm uppercase" href="/sign-in">
                Login
              </Link>
            )}

            <ToggleTheme />

            {isSignedIn && <AvatarMenu />}
          </div>
        </div>

        <nav
          id="mobile-main-navigation"
          aria-label="Mobile main navigation"
          aria-hidden={!mobileMenuOpen}
          hidden={!mobileMenuOpen}
          className={classNames(
            "overflow-hidden transition-all duration-300 md:hidden",
            mobileMenuOpen ? "max-h-80 pb-3 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="flex flex-col gap-2 rounded-xl border border-slate-300/80 bg-lavenderHaze-100/80 p-2 dark:border-slate-500 dark:bg-nightIndigo-900/80">
            {visibleMainLinks.map((link) => (
              <Link
                key={`mobile-${link.href}`}
                className="menu-item rounded-md px-2 py-2 text-base"
                href={link.href}
                onClick={handleMobileMenuClose}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
