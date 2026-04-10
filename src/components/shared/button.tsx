"use client";

import classNames from "classnames";
import { ButtonHTMLAttributes, ReactNode } from "react";
import LoadingBubbles from "@/components/shared/loading-bubbles";

type ButtonVariant = "contained" | "outlined" | "text" | "icon";
type ButtonSize = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
  children: ReactNode;
}

export default function Button({
  variant = "contained",
  size = "sm",
  loading = false,
  disabled = false,
  type = "button",
  className,
  children,
  ...buttonProps
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const isIcon = variant === "icon";

  return (
    <button
      className={classNames(
        "Button",
        isIcon ? "icon-btn" : ["btn", `btn-${size}`, `btn-${variant}`],
        className,
      )}
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      {...buttonProps}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <LoadingBubbles size="small" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
