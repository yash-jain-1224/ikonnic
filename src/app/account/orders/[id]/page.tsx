import type { Metadata } from "next";
import { PageContainer } from "@/components/ui/PageContainer";
import { OrderDetailClient } from "@/components/account/OrderDetailClient";

export const metadata: Metadata = { title: "Order Details" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer className="py-8 sm:py-12">
      <OrderDetailClient orderId={id} />
    </PageContainer>
  );
}
