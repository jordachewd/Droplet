import classNames from "classnames";
import Button from "@/components/shared/button";
import { TooltipArrow } from "../layout/TooltipArrow";

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
      <Button
        variant="icon"
        onClick={handleToggle}
        aria-label={title || "Toggle sidebar"}
        aria-controls={controlsId}
        aria-expanded={expanded}
      >
        <i className={classNames("bi", icon)} aria-hidden="true"></i>
      </Button>
    </TooltipArrow>
  ) : null;
}
