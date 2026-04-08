import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <DashboardLayout userName={user?.name || "Owner"} userRole={user?.role || "owner"}>
      {children}
    </DashboardLayout>
  );
}
