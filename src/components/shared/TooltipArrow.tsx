import classNames from "classnames";
import { ReactNode } from "react";

interface TooltipArrowProps {
  title?: ReactNode | null;
  placement?: "top" | "right" | "bottom" | "left";
  children: ReactNode;
}

const placementStyles = {
  top: "app-tooltip-content--top",
  right: "app-tooltip-content--right",
  bottom: "app-tooltip-content--bottom",
  left: "app-tooltip-content--left",
};

const arrowStyles = {
  top: "app-tooltip-arrow--top",
  right: "app-tooltip-arrow--right",
  bottom: "app-tooltip-arrow--bottom",
  left: "app-tooltip-arrow--left",
};

export const TooltipArrow = ({
  title,
  placement = "top",
  children,
}: TooltipArrowProps) => {
  if (!title) {
    return <>{children}</>;
  }

  const contentCss = classNames(
    "app-tooltip-content",
    placementStyles[placement],
  );

  const arrowCss = classNames("app-tooltip-arrow", arrowStyles[placement]);

  return (
    <div className="app-tooltip group">
      {children}
      <span className={contentCss} role="tooltip">
        {title}
        <span className={arrowCss} />
      </span>
    </div>
  );
};
