import { DriverLayout } from "@/components/layout/DriverLayout";

export default function DriverRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DriverLayout>{children}</DriverLayout>;
}
