import type { Metadata } from "next";
import { Sidebar } from "@/components/admin/Sidebar";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s - Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <div className="flex min-h-screen flex-wrap bg-admin-bg text-ink">
      <Sidebar />
      <main className="box-border min-w-0 flex-[999_1_560px] p-6 md:px-12 md:py-10">{children}</main>
    </div>
  );
}
