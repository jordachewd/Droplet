import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ChatPageWrapper from "@/components/chat/chat-page-wrapper";
import PageHead from "@/components/layout/page-head";
import LibraryTabs from "@/components/chat/library-tabs";
import type {
  LibraryConversationCardItem,
  LibraryMediaCardItem,
  LibraryPaginationState,
} from "@/types/LibraryData.d";
import {
  getMediaItemsByUserId,
  getRecentTasksByUserId,
} from "@/lib/utils/task-queries";
import { mapDateToLabel } from "@/lib/utils/map-date-to-label";
import {
  getEffectivePersonaConfig,
  getPersonaFromConfig,
} from "@/lib/utils/effective-persona-config";

type LibraryTabId = "chats" | "images" | "audios" | "videos";

interface LibraryPageProps {
  searchParams: Promise<{
    tab?: string;
    chatsPage?: string;
    imagesPage?: string;
    audiosPage?: string;
    videosPage?: string;
  }>;
}

const CHAT_PAGE_SIZE = 12;
const MEDIA_PAGE_SIZE = 12;

function parsePage(value: string | undefined): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return Math.min(parsed, 1000);
}

function parseTab(value: string | undefined): LibraryTabId {
  if (value === "images" || value === "audios" || value === "videos") {
    return value;
  }

  return "chats";
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const { tab, chatsPage, imagesPage, audiosPage, videosPage } =
    await searchParams;
  const { userId } = await auth();
  const activeTabId = parseTab(tab);
  const conversationsPage = parsePage(chatsPage);
  const imagesPageNumber = parsePage(imagesPage);
  const audiosPageNumber = parsePage(audiosPage);
  const videosPageNumber = parsePage(videosPage);

  const conversationsOffset = (conversationsPage - 1) * CHAT_PAGE_SIZE;
  const imagesOffset = (imagesPageNumber - 1) * MEDIA_PAGE_SIZE;
  const audiosOffset = (audiosPageNumber - 1) * MEDIA_PAGE_SIZE;
  const videosOffset = (videosPageNumber - 1) * MEDIA_PAGE_SIZE;

  let conversations: LibraryConversationCardItem[] = [];
  let imageItems: LibraryMediaCardItem[] = [];
  let audioItems: LibraryMediaCardItem[] = [];
  let videoItems: LibraryMediaCardItem[] = [];
  let conversationsPagination: LibraryPaginationState = {
    currentPage: conversationsPage,
    hasPreviousPage: conversationsPage > 1,
    hasNextPage: false,
  };
  let imagesPagination: LibraryPaginationState = {
    currentPage: imagesPageNumber,
    hasPreviousPage: imagesPageNumber > 1,
    hasNextPage: false,
  };
  let audiosPagination: LibraryPaginationState = {
    currentPage: audiosPageNumber,
    hasPreviousPage: audiosPageNumber > 1,
    hasNextPage: false,
  };
  let videosPagination: LibraryPaginationState = {
    currentPage: videosPageNumber,
    hasPreviousPage: videosPageNumber > 1,
    hasNextPage: false,
  };
  let hasLoadError = false;

  if (!userId) {
    redirect("/sign-in");
  }

  try {
    const [taskHistory, images, audios, videos, personas] = await Promise.all([
      getRecentTasksByUserId(userId, CHAT_PAGE_SIZE + 1, conversationsOffset),
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
      getMediaItemsByUserId(
        userId,
        "video_url",
        MEDIA_PAGE_SIZE + 1,
        videosOffset,
      ),
      getEffectivePersonaConfig(),
    ]);

    const pagedTaskHistory = taskHistory.slice(0, CHAT_PAGE_SIZE);
    const pagedImages = images.slice(0, MEDIA_PAGE_SIZE);
    const pagedAudios = audios.slice(0, MEDIA_PAGE_SIZE);
    const pagedVideos = videos.slice(0, MEDIA_PAGE_SIZE);

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
    videosPagination = {
      currentPage: videosPageNumber,
      hasPreviousPage: videosPageNumber > 1,
      hasNextPage: videos.length > MEDIA_PAGE_SIZE,
    };

    conversations = pagedTaskHistory.map((task) => {
      const persona = getPersonaFromConfig({
        personas,
        personaId: task.personaId,
      });

      return {
        id: task._id,
        title: task.title,
        personaLabel: persona.label,
        personaIcon: persona.icon,
        updatedAtLabel: mapDateToLabel(task.updatedAt),
        href: `/app/c/${task._id}`,
      };
    });

    imageItems = pagedImages.map((item) => {
      const persona = getPersonaFromConfig({
        personas,
        personaId: item.personaId,
      });

      return {
        ...item,
        personaLabel: persona.label,
        personaIcon: persona.icon,
        createdAtLabel: mapDateToLabel(item.createdAt),
        href: `/app/c/${item.taskId}`,
      };
    });

    audioItems = pagedAudios.map((item) => {
      const persona = getPersonaFromConfig({
        personas,
        personaId: item.personaId,
      });

      return {
        ...item,
        personaLabel: persona.label,
        personaIcon: persona.icon,
        createdAtLabel: mapDateToLabel(item.createdAt),
        href: `/app/c/${item.taskId}`,
      };
    });

    videoItems = pagedVideos.map((item) => {
      const persona = getPersonaFromConfig({
        personas,
        personaId: item.personaId,
      });

      return {
        ...item,
        personaLabel: persona.label,
        personaIcon: persona.icon,
        createdAtLabel: mapDateToLabel(item.createdAt),
        href: `/app/c/${item.taskId}`,
      };
    });
  } catch (error) {
    hasLoadError = true;
    const message = error instanceof Error ? error.message : "Unknown error";
    process.stderr.write(
      `[LibraryPage] Failed to load library data: ${message}\n`,
    );
  }

  return (
    <ChatPageWrapper id="LibraryPage" scrollable>
      <section className="LibraryPage mx-auto flex w-full max-w-screen-2xl flex-col gap-6 p-4">
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
          videosPagination={videosPagination}
          hasLoadError={hasLoadError}
        />
      </section>
    </ChatPageWrapper>
  );
}
