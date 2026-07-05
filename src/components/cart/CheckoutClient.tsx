"use client";

import Link from "next/link";
import { CheckCircle2, CreditCard } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { CartSummary } from "@/components/cart/CartSummary";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCartStore } from "@/store/cart";
import { useOrderStore } from "@/store/orders";

export function CheckoutClient() {
  const items = useCartStore((state) => state.items);
  const coupon = useCartStore((state) => state.coupon);
  const clearCart = useCartStore((state) => state.clearCart);
  const createOrder = useOrderStore((state) => state.createOrder);
  const [mounted, setMounted] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState("");
  const [pin, setPin] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [loadingPin, setLoadingPin] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (pin.length === 6) {
      setLoadingPin(true);
      fetch(`https://api.postalpincode.in/pincode/${pin}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data[0] && data[0].Status === "Success") {
            const postOffice = data[0].PostOffice[0];
            setCity(postOffice.District);
            setStateName(postOffice.State);
          }
        })
        .finally(() => setLoadingPin(false));
    }
  }, [pin]);

  if (!mounted) return <div className="h-72 animate-pulse rounded-3xl bg-white" />;
  if (!items.length && !placedOrderId) return <EmptyState title="Nothing to check out yet" />;

  const subtotal = items.reduce((sum, item) => sum + (item.finalTotal ?? item.price * item.quantity), 0);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const order = createOrder({
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      items,
      total: subtotal,
    });
    setPlacedOrderId(order.id);
    clearCart();
  };

  if (placedOrderId) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-white px-6 py-16 text-center shadow-card">
        <CheckCircle2 className="mx-auto text-emerald-600" size={56} />
        <h2 className="mt-5 text-2xl font-black">Order created</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Payment is still a placeholder, but the order and customisation JSON were saved in local demo storage.
        </p>
        <p className="mt-4 font-black text-slate-950">{placedOrderId}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/orders-tracking" className="rounded-full bg-giftora-red px-5 py-3 text-sm font-black text-white">Track order</Link>
          <Link href="/account" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-700">My account</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-7 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-black">Customer details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">Full name<input required name="name" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-giftora-red" /></label>
            <label className="text-xs font-bold text-slate-600">Email<input required type="email" name="email" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-giftora-red" /></label>
            <label className="text-xs font-bold text-slate-600">Phone<input required type="tel" name="phone" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-giftora-red" /></label>
            <label className="text-xs font-bold text-slate-600">Coupon<input name="coupon" defaultValue={coupon ?? ""} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none focus:border-giftora-red" /></label>
          </div>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-black">Billing and shipping</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600 sm:col-span-2">Street address<input required name="address" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-giftora-red" /></label>
            <label className="text-xs font-bold text-slate-600">PIN code
              <div className="relative">
                <input required name="pin" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-giftora-red" />
                {loadingPin && <div className="absolute right-3 top-5 size-4 animate-spin rounded-full border-2 border-giftora-red border-t-transparent" />}
              </div>
            </label>
            <label className="text-xs font-bold text-slate-600">City<input required name="city" value={city} onChange={(e) => setCity(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-giftora-red" /></label>
            <label className="text-xs font-bold text-slate-600">State<input required name="state" value={stateName} onChange={(e) => setStateName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-giftora-red" /></label>
            <label className="text-xs font-bold text-slate-600 sm:col-span-2">Country<select name="country" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-giftora-red"><option>India</option></select></label>
          </div>
        </section>
      </div>
      <div className="space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="font-black">Order summary</h2>
          <div className="mt-4 max-h-80 space-y-3 overflow-auto pr-1">
            {items.map((item) => (
              <div key={item.lineId} className="flex gap-3 border-b border-slate-100 pb-3">
                <img src={item.previewImage || item.uploadedImagePreview || item.image} alt="" className="size-14 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{item.title}</p>
                  <p className="mt-1 text-[11px] text-slate-500">Qty {item.quantity} · {item.selectedOptions.size}</p>
                </div>
                <strong className="text-xs">Rs {(item.finalTotal ?? item.price * item.quantity).toLocaleString("en-IN")}</strong>
              </div>
            ))}
          </div>
        </section>
        <CartSummary subtotal={subtotal} />
        <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-full bg-giftora-red px-6 py-4 text-sm font-black text-white hover:bg-red-700"><CreditCard size={17} />Place demo order</button>
        <p className="text-center text-xs font-semibold text-slate-500">Payment gateway, email, SMS, and WhatsApp hooks are placeholders.</p>
      </div>
    </form>
  );
}
