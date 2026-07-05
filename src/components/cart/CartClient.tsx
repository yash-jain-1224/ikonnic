"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { CartSummary } from "@/components/cart/CartSummary";
import { EmptyState } from "@/components/ui/EmptyState";
import { HappinessGuarantee } from "@/components/ui/HappinessGuarantee";
import { QuantitySelector } from "@/components/ui/QuantitySelector";
import { useCartStore } from "@/store/cart";

export function CartClient() {
  const items = useCartStore((state) => state.items);
  const coupon = useCartStore((state) => state.coupon);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const applyCoupon = useCartStore((state) => state.applyCoupon);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-72 animate-pulse rounded-3xl bg-white" />;
  if (!items.length) return <EmptyState />;

  const subtotal = items.reduce((sum, item) => sum + (item.finalTotal ?? item.price * item.quantity), 0);

  return (
    <div className="grid gap-7 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.lineId} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
            <Link href={`/product/${item.slug}`}>
              <img src={item.previewImage || item.uploadedImagePreview || item.image} alt="" className="h-40 w-full rounded-xl bg-slate-100 object-cover sm:size-32" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/product/${item.slug}`} className="font-black text-slate-950 hover:text-ikonnic-red">{item.title}</Link>
              <p className="mt-2 text-xs capitalize text-slate-500">
                {item.selectedOptions.size} · {item.selectedOptions.thickness ?? "standard"} · {item.selectedOptions.frameColor ?? "no frame"}
              </p>
              <p className="mt-1 text-xs text-slate-500">Border: {item.selectedOptions.border ?? "clean"} · Background: {item.selectedOptions.background ?? "original"}</p>
              <p className="mt-3 text-sm font-black">Rs {(item.unitPrice ?? item.price).toLocaleString("en-IN")} base</p>
              {item.customisationJson ? <p className="mt-1 text-[11px] font-semibold text-emerald-700">Customisation JSON attached</p> : null}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <QuantitySelector value={item.quantity} onChange={(quantity) => updateQuantity(item.lineId, quantity)} compact />
                <button type="button" onClick={() => removeItem(item.lineId)} className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-2 text-xs font-bold text-ikonnic-red hover:bg-red-100">
                  <Trash2 size={14} />Remove
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="font-black text-slate-950">Coupon</h2>
          <div className="mt-3 flex gap-2">
            <input defaultValue={coupon ?? ""} onBlur={(event) => applyCoupon(event.target.value)} placeholder="IKONNIC10" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-ikonnic-red" />
            <button type="button" onClick={() => applyCoupon("IKONNIC10")} className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white">Apply</button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Coupon validation is a placeholder until checkout APIs are connected.</p>
        </section>
        <CartSummary subtotal={subtotal} checkoutHref="/checkout" />
        <HappinessGuarantee />
      </div>
    </div>
  );
}
