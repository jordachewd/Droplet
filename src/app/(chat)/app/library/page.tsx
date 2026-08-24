import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ChatPageWrapper from "@/components/chat/chat-page-wrapper";
import PageHead from "@/components/layout/PageHead";
import LibraryTabs from "@/components/chat/library-tabs";
import type {
  LibraryConversationCardItem,
  LibraryMediaCardItem,
  LibraryPaginationState,
  LibraryUploadCardItem,
} from "@/types/LibraryData.d";
import {
  getMediaItemsByUserId,
  getRecentTasksByUserId,
  getUploadsByUserId,
} from "@/lib/utils/task-queries";
import { mapDateToLabel } from "@/lib/utils/map-date-to-label";
import {
  getEffectivePersonaConfig,
  getPersonaFromConfig,
} from "@/lib/utils/effective-persona-config";

type LibraryTabId = "chats" | "images" | "audios" | "uploaded";

interface LibraryPageProps {
  searchParams: Promise<{
    tab?: string;
    chatsPage?: string;
    imagesPage?: string;
    audiosPage?: string;
    uploadedPage?: string;
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
  if (value === "images" || value === "audios" || value === "uploaded") {
    return value;
  }

  return "chats";
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const { tab, chatsPage, imagesPage, audiosPage, uploadedPage } =
    await searchParams;
  const { userId } = await auth();
  const activeTabId = parseTab(tab);
  const conversationsPage = parsePage(chatsPage);
  const imagesPageNumber = parsePage(imagesPage);
  const audiosPageNumber = parsePage(audiosPage);
  const uploadedPageNumber = parsePage(uploadedPage);

  const conversationsOffset = (conversationsPage - 1) * CHAT_PAGE_SIZE;
  const imagesOffset = (imagesPageNumber - 1) * MEDIA_PAGE_SIZE;
  const audiosOffset = (audiosPageNumber - 1) * MEDIA_PAGE_SIZE;
  const uploadedOffset = (uploadedPageNumber - 1) * MEDIA_PAGE_SIZE;

  let conversations: LibraryConversationCardItem[] = [];
  let imageItems: LibraryMediaCardItem[] = [];
  let audioItems: LibraryMediaCardItem[] = [];
  let uploadItems: LibraryUploadCardItem[] = [];
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
  let uploadsPagination: LibraryPaginationState = {
    currentPage: uploadedPageNumber,
    hasPreviousPage: uploadedPageNumber > 1,
    hasNextPage: false,
  };
  let hasLoadError = false;

  if (!userId) {
    redirect("/sign-in");
  }

  try {
    const [taskHistory, images, audios, uploads, personas] = await Promise.all([
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
      getUploadsByUserId(userId, MEDIA_PAGE_SIZE + 1, uploadedOffset),
      getEffectivePersonaConfig(),
    ]);

    const pagedTaskHistory = taskHistory.slice(0, CHAT_PAGE_SIZE);
    const pagedImages = images.slice(0, MEDIA_PAGE_SIZE);
    const pagedAudios = audios.slice(0, MEDIA_PAGE_SIZE);
    const pagedUploads = uploads.slice(0, MEDIA_PAGE_SIZE);

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
    uploadsPagination = {
      currentPage: uploadedPageNumber,
      hasPreviousPage: uploadedPageNumber > 1,
      hasNextPage: uploads.length > MEDIA_PAGE_SIZE,
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

    uploadItems = pagedUploads.map((item) => ({
      id: item.id,
      fileName: item.fileName,
      contentType: item.contentType,
      sizeBytes: item.sizeBytes,
      createdAtLabel: mapDateToLabel(item.createdAt),
      url: item.s3Url,
      href: item.taskId ? `/app/c/${item.taskId}` : undefined,
    }));
  } catch (error) {
    hasLoadError = true;
    const message = error instanceof Error ? error.message : "Unknown error";
    process.stderr.write(
      `[LibraryPage] Failed to load library data: ${message}\n`,
    );
  }

  return (
    <ChatPageWrapper id="LibraryPage" scrollable>
      <PageHead
        id="library-page-head"
        title="Conversation Library"
        subtitle="Saved sessions grouped by persona."
        align="center"
      />

      <LibraryTabs
        conversations={conversations}
        images={imageItems}
        audios={audioItems}
        uploads={uploadItems}
        initialTabId={activeTabId}
        conversationsPagination={conversationsPagination}
        imagesPagination={imagesPagination}
        audiosPagination={audiosPagination}
        uploadsPagination={uploadsPagination}
        hasLoadError={hasLoadError}
      />
    </ChatPageWrapper>
  );
}
