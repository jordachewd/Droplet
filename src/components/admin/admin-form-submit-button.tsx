"use client";

import { useFormStatus } from "react-dom";
import Button from "@/components/shared/button";

interface AdminFormSubmitButtonProps {
  label: string;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function AdminFormSubmitButton({
  label,
  pendingLabel,
  className,
  disabled = false,
}: AdminFormSubmitButtonProps) {
  const { pending } = useFormStatus();
  const buttonLabel = pending ? (pendingLabel ?? `${label}...`) : label;

  return (
    <Button
      className={className}
      type="submit"
      disabled={disabled}
      loading={pending}
    >
      {buttonLabel}
    </Button>
  );
}
