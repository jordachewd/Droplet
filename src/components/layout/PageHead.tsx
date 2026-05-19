import classNames from "classnames";
import PublicSection from "../public/PublicSection";

interface PageHeadProps {
  id: string;
  title: string;
  subtitle?: string | null;
  align?: "left" | "center" | "right";
  headingLevel?: "h1" | "h2" | "h3";
}

export default function PageHead({
  id,
  title,
  subtitle,
  align = "left",
  headingLevel = "h1",
}: PageHeadProps) {
  const HTag = headingLevel;

  const wrapperClass = classNames("page-head-wrapper", {
    "items-center": align === "center",
    "items-end": align === "right",
    "items-start": align === "left",
  });

  return (
    <PublicSection
      id={id}
      sectionClass="page-head-section"
      wrapperClass={wrapperClass}
    >
      <HTag className="heading-3 leading-tight">{title}</HTag>
      {subtitle && <p className="body-1">{subtitle}</p>}
    </PublicSection>
  );
}
