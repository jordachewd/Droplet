import classNames from "classnames";
import { ReactNode } from "react";

interface TooltipArrowProps {
  title?: ReactNode | null;
  placement?: "top" | "right" | "bottom" | "left";
  children: ReactNode;
}

const placementStyles = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2 p-1",
  right: "left-full top-1/2 -translate-y-1/2 ml-2 p-1",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2 p-1",
  left: "right-full top-1/2 -translate-y-1/2 mr-2 p-1",
};

const arrowStyles = {
  top: "left-1/2 top-full -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-nightIndigo-600",
  right:
    "right-full top-1/2 -translate-y-1/2 border-y-4 border-r-4 border-y-transparent border-r-nightIndigo-600",
  bottom:
    "left-1/2 bottom-full -translate-x-1/2 border-x-4 border-b-4 border-x-transparent border-b-nightIndigo-600",
  left: "left-full top-1/2 -translate-y-1/2 border-y-4 border-l-4 border-y-transparent border-l-nightIndigo-600",
};

export const TooltipArrow = ({
  title,
  placement = "top",
  children,
}: TooltipArrowProps) => {
  if (!title) {
    return <>{children}</>;
  }

  return (
    <div className="TooltipArrow group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={classNames(
          "tooltip-content whitespace-nowrap",
          placementStyles[placement],
        )}
      >
        {title}
        <span
          className={classNames("absolute h-0 w-0", arrowStyles[placement])}
        />
      </span>
    </div>
  );
};
