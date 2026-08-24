export interface AdminLinkItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

export const ADMIN_LINKS: AdminLinkItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: "bi bi-speedometer2",
    exact: true,
  },
  { href: "/admin/users", label: "Users", icon: "bi bi-people" },
  {
    href: "/admin/transactions",
    label: "Transactions",
    icon: "bi bi-credit-card-2-front",
  },
  { href: "/admin/usage", label: "Usage", icon: "bi bi-graph-up-arrow" },
  { href: "/admin/settings", label: "Settings", icon: "bi bi-sliders" },
  {
    href: "/admin/website",
    label: "Website",
    icon: "bi bi-layout-text-window",
  },
];
