import type { Metadata } from "next";
import { PageContainer } from "@/components/ui/PageContainer";
import { CartClient } from "@/components/cart/CartClient";

export const metadata: Metadata = { title: "Your Cart" };

export default function CartPage() {
  return <PageContainer className="py-10"><h1 className="mb-7 text-3xl font-black text-slate-950">Your Cart</h1><CartClient /></PageContainer>;
}
