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

type LibraryTabId = "chats" | "images" | "audios" | "videos";

interface LibraryPageProps {
  searchParams: Promise<{
    tab?: string;
    chatsPage?: string;
    imagesPage?: string;
    audiosPage?: string;
  }>;
}

interface PaginationState {
  currentPage: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

const CHAT_PAGE_SIZE = 12;
const MEDIA_PAGE_SIZE = 12;

function parsePage(value: string | undefined): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function parseTab(value: string | undefined): LibraryTabId {
  if (value === "images" || value === "audios" || value === "videos") {
    return value;
  }

  return "chats";
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const { tab, chatsPage, imagesPage, audiosPage } = await searchParams;
  const { userId } = await auth();
  const activeTabId = parseTab(tab);
  const conversationsPage = parsePage(chatsPage);
  const imagesPageNumber = parsePage(imagesPage);
  const audiosPageNumber = parsePage(audiosPage);

  const conversationsOffset = (conversationsPage - 1) * CHAT_PAGE_SIZE;
  const imagesOffset = (imagesPageNumber - 1) * MEDIA_PAGE_SIZE;
  const audiosOffset = (audiosPageNumber - 1) * MEDIA_PAGE_SIZE;

  let conversations: LibraryConversationCardItem[] = [];
  let imageItems: LibraryMediaCardItem[] = [];
  let audioItems: LibraryMediaCardItem[] = [];
  const videoItems: LibraryMediaCardItem[] = [];
  let conversationsPagination: PaginationState = {
    currentPage: conversationsPage,
    hasPreviousPage: conversationsPage > 1,
    hasNextPage: false,
  };
  let imagesPagination: PaginationState = {
    currentPage: imagesPageNumber,
    hasPreviousPage: imagesPageNumber > 1,
    hasNextPage: false,
  };
  let audiosPagination: PaginationState = {
    currentPage: audiosPageNumber,
    hasPreviousPage: audiosPageNumber > 1,
    hasNextPage: false,
  };
  let hasLoadError = false;

  if (!userId) {
    redirect("/sign-in");
  }

  try {
    const taskHistory = await getRecentTasksByUserId(
      userId,
      CHAT_PAGE_SIZE + 1,
      conversationsOffset,
    );
    const [images, audios] = await Promise.all([
      getMediaItemsByUserId(
        userId,
        "image_url",
        MEDIA_PAGE_SIZE + 1,
        imagesOffset,
      ),
      getMediaItemsByUserId(
        userId,
        "audio_url",
        MEDIA_PAGE_SIZE + 1,
        audiosOffset,
      ),
    ]);

    const pagedTaskHistory = taskHistory.slice(0, CHAT_PAGE_SIZE);
    const pagedImages = images.slice(0, MEDIA_PAGE_SIZE);
    const pagedAudios = audios.slice(0, MEDIA_PAGE_SIZE);

    conversationsPagination = {
      currentPage: conversationsPage,
      hasPreviousPage: conversationsPage > 1,
      hasNextPage: taskHistory.length > CHAT_PAGE_SIZE,
    };
    imagesPagination = {
      currentPage: imagesPageNumber,
      hasPreviousPage: imagesPageNumber > 1,
      hasNextPage: images.length > MEDIA_PAGE_SIZE,
    };
    audiosPagination = {
      currentPage: audiosPageNumber,
      hasPreviousPage: audiosPageNumber > 1,
      hasNextPage: audios.length > MEDIA_PAGE_SIZE,
    };

    conversations = pagedTaskHistory.map((task) => ({
      id: task._id,
      title: task.title,
      personaLabel: getPersona(task.personaId).label,
      personaIcon: getPersona(task.personaId).icon,
      updatedAtLabel: mapDateToLabel(task.updatedAt),
      href: `/app/c/${task._id}`,
    }));

    imageItems = pagedImages.map((item) => ({
      ...item,
      personaLabel: getPersona(item.personaId).label,
      personaIcon: getPersona(item.personaId).icon,
      createdAtLabel: mapDateToLabel(item.createdAt),
      href: `/app/c/${item.taskId}`,
    }));

    audioItems = pagedAudios.map((item) => ({
      ...item,
      personaLabel: getPersona(item.personaId).label,
      personaIcon: getPersona(item.personaId).icon,
      createdAtLabel: mapDateToLabel(item.createdAt),
      href: `/app/c/${item.taskId}`,
    }));
  } catch (error) {
    hasLoadError = true;
    const message = error instanceof Error ? error.message : "Unknown error";
    process.stderr.write(
      `[LibraryPage] Failed to load library data: ${message}\n`,
    );
  }

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
          initialTabId={activeTabId}
          conversationsPagination={conversationsPagination}
          imagesPagination={imagesPagination}
          audiosPagination={audiosPagination}
          hasLoadError={hasLoadError}
        />
      </section>
    </PageWrapper>
  );
}
