import classNames from "classnames";

interface PageHeadProps {
  title: string;
  subtitle?: string | null;
  children?: React.ReactNode;
  align?: "left" | "center" | "right";
  headingLevel?: "h1" | "h2" | "h3";
}

export default function PageHead({
  title,
  subtitle,
  children,
  align = "left",
  headingLevel = "h1",
}: PageHeadProps) {
  const HeadingTag = headingLevel;

  return (
    <div
      className={classNames("PageHead flex flex-col gap-3", {
        "items-center": align === "center",
        "items-end": align === "right",
        "items-start": align === "left",
      })}
    >
      <HeadingTag className="heading-3 leading-tight">{title}</HeadingTag>
      {subtitle && <p className="body-1">{subtitle}</p>}
      {children}
    </div>
  );
}
