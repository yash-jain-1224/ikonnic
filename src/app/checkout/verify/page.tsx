"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") || "";

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-emerald-200 bg-white px-6 py-16 text-center shadow-card">
      <CheckCircle2 className="mx-auto text-emerald-600" size={56} />
      <h2 className="mt-5 text-2xl font-black">Order Placed! 🎉</h2>
      {orderNumber && (
        <p className="mt-2 text-lg font-bold text-ikonnic-red">{orderNumber}</p>
      )}
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Thank you for your order. We&apos;ll start working on your personalised items right away. 
        You&apos;ll receive a confirmation email shortly.
      </p>
      <p className="mt-3 text-xs font-semibold text-emerald-700 bg-emerald-50 inline-block rounded-full px-4 py-2">
        💰 Payment: Cash on Delivery
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href={`/orders-tracking${orderNumber ? `?order=${orderNumber}` : ''}`} className="rounded-full bg-ikonnic-red px-5 py-3 text-sm font-black text-white">Track Order</Link>
        <Link href="/account" className="rounded-full border border-rosegold-200 px-5 py-3 text-sm font-black text-slate-700">My Account</Link>
      </div>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse rounded-3xl bg-rosegold-100" />}>
      <VerifyContent />
    </Suspense>
  );
}
