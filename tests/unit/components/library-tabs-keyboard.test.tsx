/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LibraryTabs from "@/components/chat/library-tabs";

describe("LibraryTabs keyboard navigation", () => {
  const defaultPagination = {
    currentPage: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  };

  it("implements roving tabindex with Arrow/Home/End keyboard controls", () => {
    render(
      <LibraryTabs
        conversations={[]}
        images={[]}
        audios={[]}
        videos={[]}
        uploads={[]}
        conversationsPagination={defaultPagination}
        imagesPagination={defaultPagination}
        audiosPagination={defaultPagination}
        videosPagination={defaultPagination}
        uploadsPagination={defaultPagination}
      />,
    );

    const tablist = screen.getByRole("tablist", {
      name: "Library content tabs",
    });
    const chatsTab = screen.getByRole("tab", { name: /Chats/i });
    const imagesTab = screen.getByRole("tab", { name: /Images/i });
    const audiosTab = screen.getByRole("tab", { name: /Audios/i });
    const videosTab = screen.getByRole("tab", { name: /Videos/i });
    const uploadedTab = screen.getByRole("tab", { name: /Uploaded/i });

    expect(chatsTab.getAttribute("tabindex")).toBe("0");
    expect(imagesTab.getAttribute("tabindex")).toBe("-1");
    expect(audiosTab.getAttribute("tabindex")).toBe("-1");
    expect(videosTab.getAttribute("tabindex")).toBe("-1");
    expect(uploadedTab.getAttribute("tabindex")).toBe("-1");

    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(imagesTab.getAttribute("aria-selected")).toBe("true");
    expect(imagesTab.getAttribute("tabindex")).toBe("0");

    fireEvent.keyDown(tablist, { key: "ArrowLeft" });
    expect(chatsTab.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(tablist, { key: "End" });
    expect(uploadedTab.getAttribute("aria-selected")).toBe("true");
    expect(uploadedTab.getAttribute("tabindex")).toBe("0");

    fireEvent.keyDown(tablist, { key: "Home" });
    expect(chatsTab.getAttribute("aria-selected")).toBe("true");
    expect(chatsTab.getAttribute("tabindex")).toBe("0");
  });
});
