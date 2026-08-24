"use client";

import { useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import ThemeSwitch from "@/components/shared/ThemeSwitch";
import AvatarMenu from "@/components/shared/AvatarMenu";
import Button from "@/components/shared/Button";
import Logo from "@/components/shared/app-logo";
import { MainNavLink } from "@/types/MainNav";
import PublicMobileNav from "./PublicMobileNav";

const MAIN_NAV_LINKS = [
  { href: "/about", label: "About", requiresAuth: false },
  { href: "/personas", label: "Personas", requiresAuth: false },
  { href: "/plans", label: "Plans", requiresAuth: false },
  { href: "/app", label: "App", requiresAuth: true },
] as MainNavLink[];

export default function PublicHeader() {
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

  const headerCss = classNames("public-header", {
    "public-header-scrolled": scrolled,
  });

  return (
    <header id="public-header" className={headerCss}>
      <div className="public-header-wrapper">
        <div className="public-header-main">
          <div className="public-header-logo">
            <Logo size={30} />
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
          </div>

          <nav className="public-header-nav" aria-label="Main navigation">
            {visibleMainLinks.map((link) => (
              <Link
                key={link.href}
                className="public-header-nav-link menu-item"
                href={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="public-header-utils">
            {!isSignedIn && (
              <Link className="btn btn-sm btn-text uppercase" href="/sign-in">
                Login
              </Link>
            )}

            <ThemeSwitch />

            {isSignedIn && <AvatarMenu />}
          </div>
        </div>

        <PublicMobileNav
          open={mobileMenuOpen}
          navLinks={visibleMainLinks}
          onClose={handleMobileMenuClose}
        />
      </div>
    </header>
  );
}
