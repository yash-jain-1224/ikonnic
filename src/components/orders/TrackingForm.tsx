"use client";

import { CheckCircle2, Circle, PackageCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { trackingStatuses, useOrderStore } from "@/store/orders";

export function TrackingForm() {
  const orders = useOrderStore((state) => state.orders);
  const [query, setQuery] = useState("");
  const [tracked, setTracked] = useState(false);

  const matched = orders.find((order) => order.id.toLowerCase() === query.toLowerCase());
  const activeIndex = matched ? trackingStatuses.indexOf(matched.status) : 2;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTracked(true);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
      <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="text-lg font-black">Find your shipment</h2>
        <div className="mt-5 space-y-4">
          <label className="block text-xs font-bold text-slate-600">Order ID<input required name="orderId" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="GFT-2026-ABCDE" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-giftora-red" /></label>
          <label className="block text-xs font-bold text-slate-600">Email or phone<input required name="identity" placeholder="Used during checkout" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-giftora-red" /></label>
        </div>
        <button type="submit" className="mt-5 w-full rounded-full bg-giftora-red px-5 py-3.5 text-sm font-black text-white hover:bg-red-700">Track Order</button>
        <p className="mt-4 text-xs leading-5 text-slate-500">This demo checks local orders first and otherwise shows a realistic placeholder timeline without submitting private data.</p>
      </form>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        {tracked ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-giftora-red">{matched ? matched.id : "Mock result"}</p>
                <h2 className="mt-1 text-xl font-black">{matched ? matched.status : "Image processing"}</h2>
              </div>
              <PackageCheck className="text-giftora-red" size={32} />
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {trackingStatuses.map((status, index) => {
                const done = index <= activeIndex;
                return (
                  <div key={status} className="flex gap-3 rounded-xl border border-slate-100 p-3">
                    <div className={`grid size-8 shrink-0 place-items-center rounded-full ${done ? "bg-red-50 text-giftora-red" : "bg-slate-100 text-slate-400"}`}>
                      {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-black">{status}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{done ? "Status enabled in workflow" : "Upcoming or conditional status"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-72 flex-col items-center justify-center text-center">
            <PackageCheck size={44} className="text-slate-300" />
            <h2 className="mt-4 font-black">Tracking updates appear here</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Submit the form to preview the full Giftora production and delivery journey.</p>
          </div>
        )}
      </div>
    </div>
  );
}
