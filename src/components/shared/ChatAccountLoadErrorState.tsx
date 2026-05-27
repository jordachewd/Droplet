import AccountLoadErrorState from "@/components/shared/account-load-error-state";
import { getEffectiveSupportEmail } from "@/lib/utils/effective-plan-config";

interface ChatAccountLoadErrorStateProps {
  retryHref: string;
  containerClassName?: string;
}

export default async function ChatAccountLoadErrorState({
  retryHref,
  containerClassName,
}: ChatAccountLoadErrorStateProps) {
  const supportEmail = await getEffectiveSupportEmail();
  const resolvedClassName = containerClassName
    ? `ChatAccountLoadErrorState ${containerClassName}`
    : "ChatAccountLoadErrorState";

  return (
    <AccountLoadErrorState
      supportEmail={supportEmail}
      retryHref={retryHref}
      containerClassName={resolvedClassName}
    />
  );
}
