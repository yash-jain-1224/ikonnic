"use client";

import Link from "next/link";
import { Download, RotateCcw, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useOrderStore } from "@/store/orders";

export function AccountClient() {
  const orders = useOrderStore((state) => state.orders);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-72 animate-pulse rounded-3xl bg-white" />;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="font-black text-slate-950">Demo profile</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <p><strong className="text-slate-950">Name:</strong> Giftora Guest</p>
          <p><strong className="text-slate-950">Address:</strong> Add saved addresses after auth is connected.</p>
          <p><strong className="text-slate-950">Data rights:</strong> Export/delete request placeholder.</p>
        </div>
        <Link href="/login" className="mt-5 block rounded-full bg-slate-950 px-4 py-3 text-center text-xs font-black text-white">Login or register</Link>
      </aside>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="text-lg font-black text-slate-950">My orders</h2>
        {!orders.length ? (
          <p className="mt-3 text-sm text-slate-500">No local demo orders yet. Place a checkout order to see reorder, tracking, invoice, and review actions.</p>
        ) : (
          <div className="mt-5 space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="rounded-xl border border-slate-100 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-giftora-red">{order.id}</p>
                    <h3 className="mt-1 font-black text-slate-950">{order.status}</h3>
                    <p className="mt-1 text-xs text-slate-500">{order.items.length} item(s) · Rs {order.total.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/orders-tracking" className="rounded-full bg-red-50 px-3 py-2 text-xs font-black text-giftora-red">Track</Link>
                    <button type="button" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600"><RotateCcw size={13} />Reorder</button>
                    <button type="button" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600"><Download size={13} />Invoice</button>
                    <button type="button" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600"><Star size={13} />Review</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
