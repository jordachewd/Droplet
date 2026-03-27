"use client";

import { useClerk } from "@clerk/nextjs";
import classNames from "classnames";
import { ButtonHTMLAttributes } from "react";

type LogoutBtnProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "onClick"
>;

export default function LogoutBtn({
  className,
  ...buttonProps
}: LogoutBtnProps) {
  const { signOut } = useClerk();

  function handleLogout() {
    void signOut({ redirectUrl: "/" });
  }

  return (
    <button
      type="button"
      className={classNames("LogoutBtn flex flex-1 items-center", className)}
      onClick={handleLogout}
      {...buttonProps}
    >
      <i className="bi bi-box-arrow-right mr-4" aria-hidden="true" />
      Logout
    </button>
  );
}
