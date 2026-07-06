"use client";

import { CheckCircle2, Circle, Loader2, PackageCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { trackingStatuses, useOrderStore } from "@/store/orders";
import { ordersAPI, shippingAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

type TrackingEvent = {
  status: string;
  timestamp: string;
  note?: string;
  location?: string;
};

type TrackingResult = {
  orderNumber: string;
  status: string;
  events: TrackingEvent[];
  shippingTrackingNumber?: string;
  courier?: string;
  estimatedDelivery?: string;
};

export function TrackingForm() {
  const localOrders = useOrderStore((state) => state.orders);
  const { isAuthenticated } = useAuthStore();
  const [query, setQuery] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [tracked, setTracked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setTracked(false);

    try {
      // Try backend first
      const { data } = await ordersAPI.track(query, identifier || undefined);
      setResult({
        orderNumber: data.orderNumber || query,
        status: data.status,
        events: data.trackingEvents || data.events || [],
        shippingTrackingNumber: data.shippingTrackingNumber,
        courier: data.courier,
        estimatedDelivery: data.estimatedDelivery,
      });
      setTracked(true);
    } catch {
      // Fallback to local store
      const localMatch = localOrders.find((o) =>
        o.id.toLowerCase() === query.toLowerCase() ||
        o.email.toLowerCase() === identifier.toLowerCase()
      );
      if (localMatch) {
        setResult({
          orderNumber: localMatch.id,
          status: localMatch.status,
          events: localMatch.trackingEvents.map((e) => ({
            status: e.status,
            timestamp: e.timestamp,
            note: e.note,
          })),
        });
        setTracked(true);
      } else {
        setError("Order not found. Please check the order ID and email/phone.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch shipping details if tracking number is available
  const fetchShipmentDetails = async (trackingNumber: string) => {
    try {
      const { data } = await shippingAPI.track(trackingNumber);
      return data;
    } catch {
      return null;
    }
  };

  const activeIndex = result
    ? trackingStatuses.indexOf(result.status as any)
    : -1;

  return (
    <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
      <form onSubmit={submit} className="rounded-3xl border border-rosegold-200/60 bg-white p-6 shadow-card">
        <h2 className="text-lg font-black">Find your shipment</h2>
        <div className="mt-5 space-y-4">
          <label className="block text-xs font-bold text-slate-600">
            Order ID
            <input
              required
              name="orderId"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="GFT-2026-ABCDE or ORD-XXXX"
              className="mt-2 w-full rounded-xl border border-rosegold-200 px-4 py-3 text-sm outline-none focus:border-ikonnic-red"
            />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            Email or phone
            <input
              required={!isAuthenticated}
              name="identity"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Used during checkout"
              className="mt-2 w-full rounded-xl border border-rosegold-200 px-4 py-3 text-sm outline-none focus:border-ikonnic-red"
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-ikonnic-red px-5 py-3.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Looking up..." : "Track Order"}
        </button>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          We&apos;ll look up your order via our system and show real-time production and delivery status.
        </p>
      </form>

      <div className="rounded-3xl border border-rosegold-200/60 bg-white p-6 shadow-card">
        {tracked && result ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-ikonnic-red">{result.orderNumber}</p>
                <h2 className="mt-1 text-xl font-black">{result.status}</h2>
                {result.courier && (
                  <p className="mt-1 text-xs text-slate-500">Courier: {result.courier} · {result.shippingTrackingNumber}</p>
                )}
                {result.estimatedDelivery && (
                  <p className="mt-1 text-xs font-bold text-emerald-600">Est. delivery: {result.estimatedDelivery}</p>
                )}
              </div>
              <PackageCheck className="text-ikonnic-red" size={32} />
            </div>

            {/* Event timeline */}
            {result.events.length > 0 ? (
              <div className="mt-6 space-y-3">
                {result.events.map((event, i) => (
                  <div key={i} className="flex gap-3 rounded-xl border border-rosegold-200/40 p-3">
                    <div className={`grid size-8 shrink-0 place-items-center rounded-full ${i === 0 ? "bg-red-50 text-ikonnic-red" : "bg-rosegold-100 text-slate-400"}`}>
                      {i === 0 ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black">{event.status}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {new Date(event.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        {event.note && ` · ${event.note}`}
                        {event.location && ` · ${event.location}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Status grid fallback */
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {trackingStatuses.map((status, index) => {
                  const done = index <= activeIndex;
                  return (
                    <div key={status} className="flex gap-3 rounded-xl border border-rosegold-200/40 p-3">
                      <div className={`grid size-8 shrink-0 place-items-center rounded-full ${done ? "bg-red-50 text-ikonnic-red" : "bg-rosegold-100 text-slate-400"}`}>
                        {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-black">{status}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{done ? "Completed" : "Upcoming"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full min-h-72 flex-col items-center justify-center text-center">
            <PackageCheck size={44} className="text-slate-300" />
            <h2 className="mt-4 font-black">Tracking updates appear here</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Submit the form to see real-time production and delivery status of your Ikonnic order.</p>
          </div>
        )}
      </div>
    </div>
  );
}
