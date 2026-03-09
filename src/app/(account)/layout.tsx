import RouteGroupLayout from "@/components/layout/route-group-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RouteGroupLayout>{children}</RouteGroupLayout>;
}
