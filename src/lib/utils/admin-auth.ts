import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function requireAdminPageAccess(): Promise<string> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (sessionClaims?.metadata?.role !== "admin") {
    redirect("/403");
  }

  return userId;
}

export async function requireAdminActionAccess(): Promise<string> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  if (sessionClaims?.metadata?.role !== "admin") {
    throw new Error("Forbidden");
  }

  return userId;
}
