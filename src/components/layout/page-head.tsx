interface PageHeadProps {
  title: string;
  subtitle?: string | null;
  children?: React.ReactNode;
}
export default function PageHead({ title, subtitle, children }: PageHeadProps) {
  return (
    <div className="PageHead flex flex-col items-center justify-center gap-3">
      <h1 className="heading-3 text-center leading-tight">{title}</h1>
      {subtitle && <p className="body-2 text-center">{subtitle}</p>}
      {children}
    </div>
  );
}
