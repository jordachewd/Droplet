interface PageHeadProps {
  title: string;
  subtitle?: string | null;
  children?: React.ReactNode;
}
export default function PageHead({ title, subtitle, children }: PageHeadProps) {
  return (
    <div className="PageHead flex flex-col gap-3">
      <h1 className="heading-3 leading-tight">{title}</h1>
      {subtitle && <p className="body-1">{subtitle}</p>}
      {children}
    </div>
  );
}
