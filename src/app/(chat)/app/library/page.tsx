import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getPersona } from "@/constants/assistant-personas";
import PageWrapper from "@/components/layout/page-wrapper";
import PageHead from "@/components/layout/page-head";
import LibraryTabs from "@/components/chat/library-tabs";
import type {
  LibraryConversationCardItem,
  LibraryMediaCardItem,
} from "@/components/chat/library-tabs";
import {
  getMediaItemsByUserId,
  getRecentTasksByUserId,
} from "@/lib/utils/task-queries";
import { mapDateToLabel } from "@/lib/utils/map-date-to-label";

export default async function LibraryPage() {
  const { userId } = await auth();
  let conversations: LibraryConversationCardItem[] = [];
  let imageItems: LibraryMediaCardItem[] = [];
  let audioItems: LibraryMediaCardItem[] = [];
  let videoItems: LibraryMediaCardItem[] = [];

  if (!userId) {
    redirect("/sign-in");
  }

  try {
    const taskHistory = await getRecentTasksByUserId(userId, 20);
    const [images, audios, videos] = await Promise.all([
      getMediaItemsByUserId(userId, "image_url", 60),
      getMediaItemsByUserId(userId, "audio_url", 60),
      getMediaItemsByUserId(userId, "video_url", 60),
    ]);

    conversations = taskHistory.map((task) => ({
      id: task._id,
      title: task.title,
      personaLabel: getPersona(task.personaId).label,
      personaIcon: getPersona(task.personaId).icon,
      updatedAtLabel: mapDateToLabel(task.updatedAt),
      href: `/app/c/${task._id}`,
    }));

    imageItems = images.map((item) => ({
      ...item,
      personaLabel: getPersona(item.personaId).label,
      personaIcon: getPersona(item.personaId).icon,
      createdAtLabel: mapDateToLabel(item.createdAt),
      href: `/app/c/${item.taskId}`,
    }));

    audioItems = audios.map((item) => ({
      ...item,
      personaLabel: getPersona(item.personaId).label,
      personaIcon: getPersona(item.personaId).icon,
      createdAtLabel: mapDateToLabel(item.createdAt),
      href: `/app/c/${item.taskId}`,
    }));

    videoItems = videos.map((item) => ({
      ...item,
      personaLabel: getPersona(item.personaId).label,
      personaIcon: getPersona(item.personaId).icon,
      createdAtLabel: mapDateToLabel(item.createdAt),
      href: `/app/c/${item.taskId}`,
    }));
  } catch {}

  return (
    <PageWrapper id="LibraryPage" scrollable>
      <section className="LibraryPage mx-auto flex w-full max-w-6xl flex-col gap-6 p-4">
        <PageHead
          title="Conversation Library"
          subtitle="Saved sessions grouped by persona."
        />

        <LibraryTabs
          conversations={conversations}
          images={imageItems}
          audios={audioItems}
          videos={videoItems}
        />
      </section>
    </PageWrapper>
  );
}
