import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";

export default async function NewConversationPage() {
  const { userId } = await auth();
  const userData = userId ? await ensureUserSynced(userId) : null;

  if (!userData) {
    redirect("/sign-in");
  }

  const defaultPersonaId = userData.preferences?.defaultPersonaId;
  const targetUrl = defaultPersonaId
    ? `/app?persona=${defaultPersonaId}`
    : "/app";

  redirect(targetUrl);
}
