import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminLayoutShell } from "@/components/admin/layout/AdminLayoutShell";

export const metadata: Metadata = {
  title: { default: "Admin | Ikonnic", template: "%s | Ikonnic Admin" },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
