export interface NavLinkItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

export const WORKSPACE_LINKS: NavLinkItem[] = [
  {
    href: "/app",
    label: "Home",
    icon: "bi bi-house",
    exact: true,
  },
  { href: "/app/new", label: "New Chat", icon: "bi bi-plus-circle" },
  { href: "/app/library", label: "Library", icon: "bi bi-collection" },
];
