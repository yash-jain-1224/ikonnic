import type { Metadata } from "next";
import { PageContainer } from "@/components/ui/PageContainer";
import { AdminCustomerDetailClient } from "@/components/admin/AdminCustomerDetailClient";

export const metadata: Metadata = { title: "Admin — Customer Detail | Ikonnic" };

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer className="py-8 sm:py-10">
      <AdminCustomerDetailClient userId={id} />
    </PageContainer>
  );
}
