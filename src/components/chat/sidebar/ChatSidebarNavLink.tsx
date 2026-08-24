import { NavLinkItem } from "@/constants/chat-sidebar-nav";
import classNames from "classnames";
import Link from "next/link";

type ChatSidebarNavLinkProps = {
  item: NavLinkItem;
  pathname: string;
  isOpen: boolean;
};

export default function ChatSidebarNavLink({
  item,
  pathname,
  isOpen,
}: ChatSidebarNavLinkProps) {
  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const linkClass = classNames("chat-sidebar-nav--link", {
    "chat-sidebar-nav--link-active": isActive,
    "chat-sidebar-nav--link-collapsed": !isOpen,
  });

  const labelClass = classNames("chat-sidebar-nav--label", {
    "chat-sidebar-nav--label-collapsed": !isOpen,
  });

  return (
    <Link href={item.href} aria-label={item.label} className={linkClass}>
      <i className={classNames(item.icon, "text-base")} aria-hidden="true"></i>
      <span className={labelClass}>{item.label}</span>
    </Link>
  );
}
