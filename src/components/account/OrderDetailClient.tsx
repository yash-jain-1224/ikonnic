"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, MapPin, Package, Truck, XCircle } from "lucide-react";
import { ordersAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

type OrderItem = {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
  optionsPrice?: number;
  total: number;
  previewImage?: string | null;
  product?: { slug?: string; image?: string; title?: string } | null;
};

type StatusEvent = { id: string; status: string; note?: string | null; createdAt: string };

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  subtotal: number;
  discount: number;
  tax: number;
  shippingCost: number;
  total: number;
  couponCode?: string | null;
  paymentMethod?: string | null;
  customerNotes?: string | null;
  items: OrderItem[];
  statusHistory: StatusEvent[];
  payments?: { id: string; status: string; method: string; amount: number }[];
  shipment?: {
    trackingNumber?: string | null;
    courierName?: string | null;
    trackingEvents?: { id: string; status: string; location?: string | null; timestamp: string }[];
  } | null;
  shippingAddress?: { fullName: string; phone: string; streetLine1: string; streetLine2?: string | null; city: string; state: string; pincode: string } | null;
};

const CANCELLABLE_STATUSES = ["PENDING", "PAYMENT_CONFIRMED", "IMAGE_PROCESSING"];

function statusColor(status: string) {
  if (status === "DELIVERED") return "bg-emerald-50 text-emerald-700";
  if (status === "CANCELLED" || status === "REFUNDED") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
}

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    ordersAPI.getById(orderId)
      .then(({ data }) => setOrder(data))
      .catch(() => setError("Order not found or you don't have access to it."))
      .finally(() => setLoading(false));
  }, [isAuthenticated, orderId]);

  const cancelOrder = async () => {
    if (!order) return;
    const reason = window.prompt("Why are you cancelling this order?");
    if (reason === null) return;
    setCancelling(true);
    try {
      await ordersAPI.cancel(order.id, reason || "Cancelled by customer");
      const { data } = await ordersAPI.getById(orderId);
      setOrder(data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not cancel this order";
      alert(Array.isArray(message) ? message[0] : message);
    } finally {
      setCancelling(false);
    }
  };

  if (!mounted) return <div className="h-72 animate-pulse rounded-3xl bg-white" />;

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-card">
        <Package size={36} className="mx-auto text-slate-300" />
        <p className="mt-3 font-black text-slate-950">Sign in to view this order</p>
        <Link href="/login" className="mt-4 inline-block rounded-full bg-ikonnic-red px-5 py-2.5 text-sm font-black text-white">Sign in</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-ikonnic-red" size={32} /></div>;
  }

  if (error || !order) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
        <XCircle size={36} className="mx-auto text-red-400" />
        <p className="mt-3 font-black text-red-800">{error || "Order not found"}</p>
        <Link href="/account" className="mt-4 inline-block rounded-full border border-red-200 px-5 py-2.5 text-sm font-black text-red-700">← Back to account</Link>
      </div>
    );
  }

  const canCancel = CANCELLABLE_STATUSES.includes(order.status);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/account" className="inline-flex items-center gap-1 text-xs font-black text-slate-500 hover:text-ikonnic-red"><ArrowLeft size={13} /> My account</Link>
          <h1 className="mt-2 text-2xl font-black text-slate-950">{order.orderNumber}</h1>
          <p className="mt-1 text-xs text-slate-500">
            Placed {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1.5 text-xs font-black ${statusColor(order.status)}`}>{order.status.replace(/_/g, " ")}</span>
          {canCancel && (
            <button type="button" disabled={cancelling} onClick={cancelOrder} className="rounded-full border border-red-200 px-4 py-2 text-xs font-black text-red-600 hover:bg-red-50 disabled:opacity-60">
              {cancelling ? "Cancelling…" : "Cancel order"}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {/* Items */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-black text-slate-950"><Package size={16} /> Items ({order.items.length})</h2>
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <img src={item.previewImage || item.product?.image || "/images/placeholder.png"} alt="" className="size-14 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Qty {item.quantity} · ₹{item.unitPrice.toLocaleString("en-IN")} each</p>
                  </div>
                  <strong className="text-sm text-slate-900">₹{item.total.toLocaleString("en-IN")}</strong>
                </div>
              ))}
            </div>
          </section>

          {/* Status timeline */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-black text-slate-950"><Truck size={16} /> Order timeline</h2>
            <ol className="mt-4 space-y-4">
              {order.statusHistory.map((event, index) => (
                <li key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <CheckCircle2 size={18} className={index === order.statusHistory.length - 1 ? "text-ikonnic-red" : "text-emerald-500"} />
                    {index < order.statusHistory.length - 1 && <div className="mt-1 w-px flex-1 bg-slate-200" />}
                  </div>
                  <div className="pb-1">
                    <p className="text-sm font-black text-slate-900">{event.status.replace(/_/g, " ")}</p>
                    {event.note && <p className="mt-0.5 text-xs text-slate-500">{event.note}</p>}
                    <p className="mt-0.5 text-[11px] text-slate-400">{new Date(event.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </li>
              ))}
            </ol>
            {order.shipment?.trackingNumber && (
              <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600">
                {order.shipment.courierName || "Courier"} · AWB {order.shipment.trackingNumber}
              </p>
            )}
          </section>
        </div>

        <div className="space-y-5">
          {/* Payment summary */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-black text-slate-950"><CreditCard size={16} /> Payment</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-bold">₹{order.subtotal.toLocaleString("en-IN")}</dd></div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600"><dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd className="font-bold">-₹{order.discount.toLocaleString("en-IN")}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-slate-500">GST</dt><dd className="font-bold">₹{order.tax.toLocaleString("en-IN")}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Shipping</dt><dd className="font-bold">{order.shippingCost === 0 ? "FREE" : `₹${order.shippingCost.toLocaleString("en-IN")}`}</dd></div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base"><dt className="font-black">Total</dt><dd className="font-black text-ikonnic-red">₹{order.total.toLocaleString("en-IN")}</dd></div>
            </dl>
            {order.paymentMethod && <p className="mt-3 text-xs font-bold text-slate-500">Paid via {order.paymentMethod}</p>}
          </section>

          {/* Shipping address */}
          {order.shippingAddress && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="flex items-center gap-2 font-black text-slate-950"><MapPin size={16} /> Delivery address</h2>
              <div className="mt-3 text-sm text-slate-600">
                <p className="font-bold text-slate-900">{order.shippingAddress.fullName}</p>
                <p className="mt-1">{[order.shippingAddress.streetLine1, order.shippingAddress.streetLine2, order.shippingAddress.city, `${order.shippingAddress.state} ${order.shippingAddress.pincode}`].filter(Boolean).join(", ")}</p>
                <p className="mt-1 text-xs text-slate-400">📱 {order.shippingAddress.phone}</p>
              </div>
            </section>
          )}

          {order.customerNotes && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="font-black text-slate-950">Order notes</h2>
              <p className="mt-2 text-sm text-slate-600">{order.customerNotes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
