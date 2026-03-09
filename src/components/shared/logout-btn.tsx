"use client";

import { useClerk } from "@clerk/nextjs";

export default function LogoutBtn() {
  const { signOut } = useClerk();

  function handleLogout() {
    void signOut({ redirectUrl: "/" });
  }

  return (
    <button
      type="button"
      className="LogoutBtn flex flex-1 items-center"
      onClick={handleLogout}
    >
      <i className="bi bi-box-arrow-right mr-4" />
      Logout
    </button>
  );
}
