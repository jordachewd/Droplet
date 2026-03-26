import classNames from "classnames";
import { ReactNode } from "react";

interface PageHeadProps {
  title: string;
  subtitle?: string | null;
  children?: ReactNode;
  align?: "left" | "center" | "right";
  headingLevel?: "h1" | "h2" | "h3";
  className?: string;
}

export default function PageHead({
  title,
  subtitle,
  children,
  align = "left",
  headingLevel = "h1",
  className = "",
}: PageHeadProps) {
  const HeadingTag = headingLevel;

  return (
    <section
      className={classNames(
        "PageHead flex flex-col gap-3 mx-auto w-full max-w-screen-2xl",
        className,
        {
          "items-center": align === "center",
          "items-end": align === "right",
          "items-start": align === "left",
        },
      )}
    >
      <HeadingTag className="heading-3 leading-tight">{title}</HeadingTag>
      {subtitle && <p className="body-1">{subtitle}</p>}
      {children}
    </section>
  );
}
