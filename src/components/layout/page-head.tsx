import classNames from "classnames";

interface PageHeadProps {
  title: string;
  subtitle?: string | null;
  children?: React.ReactNode;
  align?: "left" | "center" | "right";
}

export default function PageHead({
  title,
  subtitle,
  children,
  align = "left",
}: PageHeadProps) {
  return (
    <div
      className={classNames("PageHead flex flex-col gap-3", {
        "items-center": align === "center",
        "items-end": align === "right",
        "items-start": align === "left",
      })}
    >
      <h1 className="heading-3 leading-tight">{title}</h1>
      {subtitle && <p className="body-1">{subtitle}</p>}
      {children}
    </div>
  );
}
