import Link from "next/link";
import classNames from "classnames";
import ChatPageWrapper from "@/components/chat/chat-page-wrapper";

interface HttpStatusPageProps {
  code: 401 | 403 | 404 | 500;
  title: string;
  message: string;
  details: string;
  ctaHref: string;
  ctaLabel: string;
}

const panelClassByCode: Record<HttpStatusPageProps["code"], string> = {
  401: "bg-red-600",
  403: "bg-red-600",
  404: "bg-slate-600",
  500: "bg-amber-600",
};

export default function HttpStatusPage({
  code,
  title,
  message,
  details,
  ctaHref,
  ctaLabel,
}: HttpStatusPageProps) {
  const statusPanelClass = classNames(
    "flex max-w-2xl flex-col items-center gap-2 rounded-xl p-8 text-white shadow-lg",
    panelClassByCode[code],
  );

  return (
    <ChatPageWrapper className="HttpStatusPage items-center justify-center gap-16 px-4 -mt-4">
      <p className="text-sm font-semibold uppercase text-midnightBlue-500 dark:text-lavenderHaze-500">
        ERROR: {code}
      </p>

      <h1 className="heading-2 text-center">{title}</h1>

      <div className={statusPanelClass}>
        <h2 className="heading-6 text-center text-white">{message}</h2>
        <p className="body-2 text-center text-white">{details}</p>
      </div>

      <Link href={ctaHref} className="btn btn-sm btn-outlined">
        {ctaLabel}
      </Link>
    </ChatPageWrapper>
  );
}
