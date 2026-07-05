import type { Metadata } from "next";
import { CheckoutClient } from "@/components/cart/CheckoutClient";
import { PageContainer } from "@/components/ui/PageContainer";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return <PageContainer className="py-10"><h1 className="mb-7 text-3xl font-black text-slate-950">Checkout</h1><CheckoutClient /></PageContainer>;
}
