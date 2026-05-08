import classNames from "classnames";
import { ReactNode } from "react";

type PublicSectionProps = {
  id: string;
  children: ReactNode;
  sectionClass?: string;
  wrapperClass?: string;
  fullWidth?: boolean;
};

export default function PublicSection({
  id,
  children,
  sectionClass,
  wrapperClass,
  fullWidth = false,
}: PublicSectionProps) {
  const sectionCss = classNames("public-section", sectionClass);
  const wrapperCss = classNames("public-section-content", wrapperClass, {
    "max-w-screen-2xl 2xl:px-4": !fullWidth,
  });

  return (
    <section className={sectionCss} id={id}>
      <div className={wrapperCss}>{children}</div>
    </section>
  );
}
