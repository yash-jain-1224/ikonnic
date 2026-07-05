import type { Metadata } from "next";
import { AccountClient } from "@/components/account/AccountClient";
import { PageContainer } from "@/components/ui/PageContainer";

export const metadata: Metadata = { title: "My Account" };

export default function AccountPage() {
  return (
    <PageContainer className="py-10 sm:py-14">
      <h1 className="text-3xl font-black text-slate-950">My Account</h1>
      <p className="mb-7 mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        Local demo profile, saved addresses placeholder, order history, reorder, invoice, tracking, and review entry points.
      </p>
      <AccountClient />
    </PageContainer>
  );
}
