import type { Metadata } from "next";
import { WishlistClient } from "@/components/wishlist/WishlistClient";
import { PageContainer } from "@/components/ui/PageContainer";

export const metadata: Metadata = { title: "Wishlist" };

export default function WishlistPage() {
  return (
    <PageContainer className="py-10 sm:py-14">
      <h1 className="text-3xl font-black text-slate-950">Wishlist</h1>
      <p className="mb-7 mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        Guest wishlist is stored locally now. Logged-in sync is part of the planned account API.
      </p>
      <WishlistClient />
    </PageContainer>
  );
}
