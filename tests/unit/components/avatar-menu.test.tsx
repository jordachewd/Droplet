/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ImgHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AvatarMenu from "@/components/shared/AvatarMenu";
import { useClerk, useUser } from "@clerk/nextjs";

type MockNextImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  priority?: boolean;
  unoptimized?: boolean;
};

type MockNextLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(),
  useClerk: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: (props: MockNextImageProps) => {
    const sanitizedProps = { ...props };
    delete sanitizedProps.priority;
    delete sanitizedProps.unoptimized;

    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={sanitizedProps.alt ?? ""} {...sanitizedProps} />;
  },
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: MockNextLinkProps) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AvatarMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUser).mockReturnValue({
      user: {
        username: "droplet_admin",
        firstName: "Drop",
        lastName: "Admin",
        publicMetadata: { role: "admin" },
        imageUrl: "",
      },
    } as unknown as ReturnType<typeof useUser>);
    vi.mocked(useClerk).mockReturnValue({
      signOut: vi.fn(),
    } as unknown as ReturnType<typeof useClerk>);
  });

  it("renders menu semantics and focuses the first item on open", async () => {
    render(<AvatarMenu />);

    const trigger = screen.getByRole("button", { name: "Account menu" });
    fireEvent.click(trigger);

    const menu = await screen.findByRole("menu", { name: "Account actions" });
    const menuItems = screen.getAllByRole("menuitem");

    expect(menu).toBeTruthy();
    expect(menuItems.length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(document.activeElement).toBe(menuItems[0]);
    });
  });

  it("supports Arrow/Home/End navigation and Escape close with focus return", async () => {
    render(<AvatarMenu />);

    const trigger = screen.getByRole("button", { name: "Account menu" });
    fireEvent.click(trigger);

    const menu = await screen.findByRole("menu", { name: "Account actions" });
    const menuItems = screen.getAllByRole("menuitem");
    const firstItem = menuItems[0];
    const secondItem = menuItems[1];
    const lastItem = menuItems[menuItems.length - 1];

    await waitFor(() => {
      expect(document.activeElement).toBe(firstItem);
    });

    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(secondItem);

    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(document.activeElement).toBe(firstItem);

    fireEvent.keyDown(menu, { key: "End" });
    expect(document.activeElement).toBe(lastItem);

    fireEvent.keyDown(menu, { key: "Home" });
    expect(document.activeElement).toBe(firstItem);

    fireEvent.keyDown(menu, { key: "Escape" });

    await waitFor(() => {
      expect(
        screen.queryByRole("menu", { name: "Account actions" }),
      ).toBeNull();
    });
    expect(document.activeElement).toBe(trigger);
  });
});
