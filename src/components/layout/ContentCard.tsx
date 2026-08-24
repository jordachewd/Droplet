import Link from "next/link";
import { ReactNode } from "react";

type ContentCardProps = {
  eyebrow?: string;
  title?: string;
  tagline?: string;
  icon?: string;
  description?: string;
  href?: string;
  children?: ReactNode;
};

export default function ContentCard({
  eyebrow,
  title,
  tagline,
  icon,
  description,
  href,
  children,
}: ContentCardProps) {
  const hasHead = eyebrow || title || tagline || icon;

  const cardContent = (
    <>
      {hasHead && (
        <div className="card-head">
          <div className="card-head-wrap">
            {eyebrow && <p className="card-eyebrow">{eyebrow}</p>}
            {title && <h4 className="card-title">{title}</h4>}
            {tagline && <p className="card-tagline">{tagline}</p>}
          </div>

          {icon && (
            <div className="card-icon">
              <i className={icon} aria-hidden="true"></i>
            </div>
          )}
        </div>
      )}

      {description && <div className="card-desc">{description}</div>}

      {children}
    </>
  );

  if (hasHead || description || children) {
    if (!href) {
      return <div className="card">{cardContent}</div>;
    }

    return (
      <Link href={href} className="card card-has-link">
        {cardContent}
      </Link>
    );
  }
}
