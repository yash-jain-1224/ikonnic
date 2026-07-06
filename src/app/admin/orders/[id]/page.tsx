import type { Metadata } from "next";
import { PageContainer } from "@/components/ui/PageContainer";
import { AdminOrderDetailClient } from "@/components/admin/AdminOrderDetailClient";

export const metadata: Metadata = { title: "Admin — Order Detail | Ikonnic" };

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer className="py-8 sm:py-10">
      <AdminOrderDetailClient orderId={id} />
    </PageContainer>
  );
}
