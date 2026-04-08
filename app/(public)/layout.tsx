import { PublicLayout } from "@/components/layout/PublicLayout";

export default function PublicRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayout>{children}</PublicLayout>;
}
