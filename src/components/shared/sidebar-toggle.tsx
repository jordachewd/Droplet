import classNames from "classnames";
import { TooltipArrow } from "./tooltip-arrow";

interface SidebarToggleProps {
  title?: string | null;
  show?: boolean;
  icon: string;
  toggleSidebar: () => void;
  controlsId?: string;
  expanded?: boolean;
}

export default function SidebarToggle({
  title = null,
  show = true,
  icon,
  toggleSidebar,
  controlsId,
  expanded,
}: SidebarToggleProps) {
  function handleToggle() {
    toggleSidebar();
  }

  return show ? (
    <TooltipArrow placement="right" title={show ? title : null}>
      <button
        type="button"
        onClick={handleToggle}
        className="icon-btn"
        aria-label={title || "Toggle sidebar"}
        aria-controls={controlsId}
        aria-expanded={expanded}
      >
        <i className={classNames("bi", icon)} aria-hidden="true"></i>
      </button>
    </TooltipArrow>
  ) : null;
}
