import type { Metadata } from "next";
import { PageContainer } from "@/components/ui/PageContainer";
import { AdminOrdersClient } from "@/components/admin/AdminOrdersClient";

export const metadata: Metadata = { title: "Admin — Orders" };

export default function AdminOrdersPage() {
  return (
    <PageContainer className="py-10 sm:py-14">
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-ikonnic-red">Admin</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Order Management</h1>
        <p className="mt-2 text-sm text-slate-500">View, manage, and update customer orders.</p>
      </div>
      <AdminOrdersClient />
    </PageContainer>
  );
}
