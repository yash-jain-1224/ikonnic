"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { paymentsAPI } from "@/lib/api";
import { useCartStore } from "@/store/cart";

type PaymentStatus = "loading" | "success" | "failed";

function VerifyingState() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <Loader2 className="mx-auto animate-spin text-ikonnic-red" size={48} />
      <h2 className="mt-5 text-xl font-black">Verifying your payment...</h2>
      <p className="mt-2 text-sm text-slate-500">Please wait while we confirm your transaction with PhonePe.</p>
    </div>
  );
}

function PaymentVerifyContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<PaymentStatus>("loading");
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    const verify = async () => {
      const txnId = searchParams.get("txnId") || sessionStorage.getItem("phonepe_txn_id");
      const paymentId = sessionStorage.getItem("phonepe_payment_id");

      if (!txnId || !paymentId) {
        setStatus("failed");
        return;
      }

      try {
        await paymentsAPI.verify(paymentId, { merchantTransactionId: txnId });
        setStatus("success");
        clearCart();

        // Clean up session storage
        sessionStorage.removeItem("phonepe_payment_id");
        sessionStorage.removeItem("phonepe_order_id");
        sessionStorage.removeItem("phonepe_txn_id");
      } catch {
        setStatus("failed");
      }
    };

    verify();
  }, [searchParams, clearCart]);

  if (status === "loading") {
    return <VerifyingState />;
  }

  if (status === "success") {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-emerald-200 bg-white px-6 py-16 text-center shadow-card">
        <CheckCircle2 className="mx-auto text-emerald-600" size={56} />
        <h2 className="mt-5 text-2xl font-black">Payment Successful! 🎉</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Thank you for your order. We&apos;ll start working on your personalised items right away.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/orders-tracking" className="rounded-full bg-ikonnic-red px-5 py-3 text-sm font-black text-white">Track order</Link>
          <Link href="/account" className="rounded-full border border-rosegold-200 px-5 py-3 text-sm font-black text-slate-700">My account</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-red-200 bg-white px-6 py-16 text-center shadow-card">
      <XCircle className="mx-auto text-red-500" size={56} />
      <h2 className="mt-5 text-2xl font-black">Payment Failed</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Your payment could not be verified. If money was deducted, it will be refunded within 5-7 business days.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/checkout" className="rounded-full bg-ikonnic-red px-5 py-3 text-sm font-black text-white">Try again</Link>
        <Link href="/contact-us" className="rounded-full border border-rosegold-200 px-5 py-3 text-sm font-black text-slate-700">Contact support</Link>
      </div>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense fallback={<VerifyingState />}>
      <PaymentVerifyContent />
    </Suspense>
  );
}
