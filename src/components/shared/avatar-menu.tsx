"use client";

import getFullName, { getNameLetters } from "@/lib/utils/getFullName";
import classNames from "classnames";
import Image from "next/image";
import {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { TooltipArrow } from "./tooltip-arrow";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import LogoutBtn from "./logout-btn";

export default function AvatarMenu() {
  const { user } = useUser();
  const [open, setOpen] = useState<boolean>(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const wasOpenRef = useRef<boolean>(false);

  useEffect(() => {
    const onOutsideClick = (event: globalThis.MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("click", onOutsideClick);
    return () => window.removeEventListener("click", onOutsideClick);
  }, []);

  useEffect(() => {
    if (open) {
      const firstMenuItem =
        menuRef.current?.querySelector<HTMLElement>("[role='menuitem']");
      firstMenuItem?.focus();
    } else if (wasOpenRef.current) {
      triggerRef.current?.focus();
    }

    wasOpenRef.current = open;
  }, [open]);

  if (!user)
    return (
      <Link className="btn btn-text btn-sm uppercase" href="/sign-in">
        Login
      </Link>
    );

  const { username, firstName, lastName, publicMetadata, imageUrl } = user;
  const fullName = getFullName({
    firstName: firstName || "",
    lastName: lastName || "",
    username: username || "",
  });
  const initials = getNameLetters(fullName).children;

  const handleToggleUserMenu = (event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    setOpen((prevState) => !prevState);
  };

  const handleCloseUserMenu = () => setOpen(false);

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    const menuItems = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ?? [],
    );

    if (menuItems.length === 0) {
      return;
    }

    const activeElement = document.activeElement;
    const currentIndex = menuItems.findIndex((item) => item === activeElement);
    const fallbackIndex = currentIndex === -1 ? 0 : currentIndex;

    event.preventDefault();

    if (event.key === "Home") {
      menuItems[0]?.focus();
      return;
    }

    if (event.key === "End") {
      menuItems[menuItems.length - 1]?.focus();
      return;
    }

    const nextIndex =
      event.key === "ArrowDown"
        ? (fallbackIndex + 1) % menuItems.length
        : (fallbackIndex - 1 + menuItems.length) % menuItems.length;

    menuItems[nextIndex]?.focus();
  };

  const userInitialsClass = classNames(
    "inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full",
    "bg-lavenderHaze-500 text-[13px] font-semibold text-white",
    "shadow-[0px_0px_5px_0px_rgba(122,75,204,0.3)]",
  );

  const accountMenuClass = classNames(
    "absolute right-0 top-full z-40 mt-2 min-w-[180px] rounded-lg py-2",
    "bg-lavenderHaze-100 shadow-[0px_0px_6px_0px_rgba(122,75,204,0.2)]",
    "dark:bg-nightIndigo-900",
  );

  const accountMenuLinkClass = classNames(
    "flex min-w-[180px] items-center px-5 py-2 text-sm",
    "transition-all duration-300 ease-in-out hover:text-white",
    "dark:hover:text-lavenderHaze-200",
  );

  return (
    <div className="AvatarMenu relative flex" ref={wrapperRef}>
      <TooltipArrow title="Account" placement="bottom">
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggleUserMenu}
          className="inline-flex rounded-full bg-transparent p-0"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? "my-account" : undefined}
          aria-label="Account menu"
        >
          <span className={userInitialsClass}>
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={fullName ? `${fullName} avatar` : "User avatar"}
                width={28}
                height={28}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </span>
        </button>
      </TooltipArrow>

      {open && (
        <div
          id="my-account"
          role="menu"
          aria-label="Account actions"
          className={accountMenuClass}
          ref={menuRef}
          onKeyDown={handleMenuKeyDown}
        >
          {publicMetadata.role === "admin" && (
            <Link
              href="/admin"
              className={accountMenuLinkClass}
              onClick={handleCloseUserMenu}
              role="menuitem"
              tabIndex={-1}
            >
              <i className="bi bi-speedometer2 mr-4" aria-hidden="true"></i>
              <span>Dashboard</span>
            </Link>
          )}

          <Link
            href="/app/plans"
            className={accountMenuLinkClass}
            onClick={handleCloseUserMenu}
            role="menuitem"
            tabIndex={-1}
          >
            <i className="bi bi-graph-up mr-4" aria-hidden="true"></i>
            <span>Plans</span>
          </Link>

          <Link
            href="/app/profile"
            className={accountMenuLinkClass}
            onClick={handleCloseUserMenu}
            role="menuitem"
            tabIndex={-1}
          >
            <i className="bi bi-person mr-4" aria-hidden="true"></i>
            <span>Profile</span>
          </Link>

          <hr className="my-1 border-nightIndigo-100/20" />

          <div className="flex min-w-45 items-center px-5 py-2 text-sm">
            <LogoutBtn role="menuitem" tabIndex={-1} />
          </div>
        </div>
      )}
    </div>
  );
}
