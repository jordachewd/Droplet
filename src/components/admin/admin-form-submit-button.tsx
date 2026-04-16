"use client";

import { useFormStatus } from "react-dom";
import Button from "@/components/shared/button";

type ButtonVariant =
  | "contained"
  | "outlined"
  | "text"
  | "icon"
  | "danger"
  | "hero";
type ButtonSize = "xs" | "sm" | "md" | "lg";

interface AdminFormSubmitButtonProps {
  label: string;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
}

export function AdminFormSubmitButton({
  label,
  pendingLabel,
  variant,
  size,
  className,
  disabled = false,
}: AdminFormSubmitButtonProps) {
  const { pending } = useFormStatus();
  const buttonLabel = pending ? (pendingLabel ?? `${label}...`) : label;

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      type="submit"
      disabled={disabled}
      loading={pending}
    >
      {buttonLabel}
    </Button>
  );
}
