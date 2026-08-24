import classNames from "classnames";
import PublicSection from "@/components/public/PublicSection";

interface PageHeadProps {
  id: string;
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  align?: "left" | "center" | "right";
  headingLevel?: "h1" | "h2" | "h3";
  type?: "page" | "section";
}

export default function PageHead({
  id,
  eyebrow,
  title,
  subtitle,
  align = "left",
  headingLevel = "h1",
  type = "page",
}: PageHeadProps) {
  const HTag = headingLevel;

  const headClass = classNames(
    {
      "heading-1": HTag === "h1",
      "heading-2": HTag === "h2",
      "heading-3": HTag === "h3",
    },
    "leading-tight",
  );

  const wrapperClass = classNames(`${type}-head-wrapper`, {
    "items-start": align === "left",
    "items-center": align === "center",
    "items-end": align === "right",
  });

  const subtitleClass = classNames("heading-6 max-w-3xl", {
    "text-left": align === "left",
    "text-center": align === "center",
    "text-right": align === "right",
  });

  if (type === "section") {
    return (
      <div id={id} className={wrapperClass}>
        {eyebrow && <p className="card-eyebrow mb-0!">{eyebrow}</p>}
        <HTag className={headClass}>{title}</HTag>
        {subtitle && <p className={subtitleClass}>{subtitle}</p>}
      </div>
    );
  }

  return (
    <PublicSection
      id={id}
      sectionClass="page-head-section"
      wrapperClass={wrapperClass}
    >
      {eyebrow && <p className="card-eyebrow mb-0!">{eyebrow}</p>}
      <HTag className={headClass}>{title}</HTag>
      {subtitle && <p className={subtitleClass}>{subtitle}</p>}
    </PublicSection>
  );
}
