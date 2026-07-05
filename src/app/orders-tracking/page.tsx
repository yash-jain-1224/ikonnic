import type { Metadata } from "next";
import { TrackingForm } from "@/components/orders/TrackingForm";
import { PageContainer } from "@/components/ui/PageContainer";

export const metadata: Metadata = { title: "Track Your Order" };

export default function TrackingPage() {
  return <PageContainer className="py-10 sm:py-14"><h1 className="text-3xl font-black text-slate-950">Track Your Order</h1><p className="mb-7 mt-2 text-sm text-slate-500">Check the latest mock production and delivery status for your Ikonnic order.</p><TrackingForm /></PageContainer>;
}
