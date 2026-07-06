"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Loader2, Package, Save, Truck } from "lucide-react";

const STATUS_OPTIONS = [
  "PENDING", "PAYMENT_CONFIRMED", "IMAGE_PROCESSING", "DESIGN_APPROVAL",
  "PRINTING", "QUALITY_CHECK", "PACKING", "SHIPPED", "OUT_FOR_DELIVERY",
  "DELIVERED", "CANCELLED", "RETURNED", "REFUNDED", "REPRINT_INITIATED",
];

const statusColor: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PAYMENT_CONFIRMED: "bg-blue-100 text-blue-800",
  IMAGE_PROCESSING: "bg-purple-100 text-purple-800",
  PRINTING: "bg-indigo-100 text-indigo-800",
  SHIPPED: "bg-sky-100 text-sky-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
};

type Address = {
  fullName: string; phone: string; streetLine1: string; streetLine2?: string | null;
  landmark?: string | null; city: string; state: string; pincode: string; country: string;
};
type OrderItem = {
  id: string; title: string; quantity: number; unitPrice: number; optionsPrice: number; total: number;
  sku?: string | null; selectedOptions?: Record<string, unknown> | null;
  uploadedImageRef?: string | null; previewImage?: string | null; customisationJson?: unknown;
  product?: { slug?: string; image?: string; title?: string } | null;
};
type AdminOrder = {
  id: string; orderNumber: string; status: string; subtotal: number; discount: number; tax: number;
  shippingCost: number; total: number; couponCode?: string | null; paymentMethod?: string | null;
  customerNotes?: string | null; internalNotes?: string | null; createdAt: string;
  estimatedDelivery?: string | null; deliveredAt?: string | null; cancelReason?: string | null;
  user?: { firstName?: string; lastName?: string; email?: string; phone?: string } | null;
  items: OrderItem[];
  statusHistory: { id: string; status: string; note?: string | null; changedBy?: string | null; createdAt: string }[];
  payments: { id: string; amount: number; status: string; method: string; paidAt?: string | null }[];
  shippingAddress?: Address | null;
  billingAddress?: Address | null;
  shipment?: { id: string; courier: string; trackingNumber?: string | null; awbNumber?: string | null; status: string; labelUrl?: string | null } | null;
};

function money(n: number) {
  return `₹${(n ?? 0).toLocaleString("en-IN")}`;
}

function AddressCard({ title, a }: { title: string; a?: Address | null }) {
  return (
    <div className="rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-sm">
      <h2 className="font-black text-slate-950">{title}</h2>
      {a ? (
        <div className="mt-2 text-sm leading-6 text-slate-600">
          <p className="font-bold text-slate-900">{a.fullName}</p>
          <p>{a.phone}</p>
          <p>{a.streetLine1}{a.streetLine2 ? `, ${a.streetLine2}` : ""}</p>
          {a.landmark && <p>Landmark: {a.landmark}</p>}
          <p>{a.city}, {a.state} {a.pincode}</p>
          <p>{a.country}</p>
        </div>
      ) : <p className="mt-2 text-sm text-slate-400">No address on file.</p>}
    </div>
  );
}

export function AdminOrderDetailClient({ orderId }: { orderId: string }) {
  const { isAuthenticated, user } = useAuthStore();
  const isAdmin = isAuthenticated && (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN");

  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminAPI.getOrder(orderId);
      setOrder(data);
      setStatus(data.status);
      setNotes(data.internalNotes || "");
    } catch {
      setError("Failed to load order. It may not exist.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const saveStatus = async () => {
    if (!order || status === order.status) return;
    setSavingStatus(true);
    setBanner(null);
    try {
      await adminAPI.updateOrderStatus(order.id, status, `Status set to ${status} by admin`);
      await load();
      setBanner("Status updated.");
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(Array.isArray(m) ? m[0] : m || "Could not update status");
      setStatus(order.status);
    } finally {
      setSavingStatus(false);
    }
  };

  const saveNotes = async () => {
    if (!order) return;
    setSavingNotes(true);
    try {
      await adminAPI.updateOrderNotes(order.id, notes);
      setBanner("Internal notes saved.");
    } catch {
      alert("Could not save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  const createShipment = async () => {
    if (!order) return;
    if (!window.confirm("Create a shipment for this order via Shiprocket?")) return;
    setCreatingShipment(true);
    try {
      await adminAPI.createShipment(order.id);
      await load();
      setBanner("Shipment created.");
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(Array.isArray(m) ? m[0] : m || "Could not create shipment (check Shiprocket config)");
    } finally {
      setCreatingShipment(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-black text-red-800">Access Denied</p>
          <p className="mt-2 text-sm text-red-600">Admin credentials required.</p>
          <Link href="/login" className="mt-4 inline-block rounded-full bg-ikonnic-red px-5 py-2 text-sm font-bold text-white">Login</Link>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-ikonnic-red" size={32} /></div>;
  if (error || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-sm font-bold text-slate-500">{error || "Order not found."}</p>
        <Link href="/admin/orders" className="mt-4 inline-block text-xs font-black text-ikonnic-red hover:underline">← Back to orders</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="text-xs font-black text-ikonnic-red hover:underline">← All orders</Link>
          <h1 className="mt-1 text-2xl font-black text-slate-950">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Placed {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            {order.estimatedDelivery && ` · ETA ${new Date(order.estimatedDelivery).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-black ${statusColor[order.status] || "bg-rosegold-100 text-slate-700"}`}>
          {order.status.replace(/_/g, " ")}
        </span>
      </div>

      {banner && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{banner}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Items */}
          <div className="rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-950">Items ({order.items.length})</h2>
            <div className="mt-4 space-y-4">
              {order.items.map((it) => (
                <div key={it.id} className="flex flex-wrap gap-4 border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                  <img src={it.previewImage || it.product?.image || it.uploadedImageRef || "/images/placeholder.webp"} alt="" className="size-16 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">{it.title}</p>
                    <p className="text-xs text-slate-500">Qty {it.quantity} · {money(it.unitPrice)}{it.optionsPrice ? ` + ${money(it.optionsPrice)} options` : ""}{it.sku ? ` · SKU ${it.sku}` : ""}</p>
                    {it.selectedOptions && Object.keys(it.selectedOptions).length > 0 && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        {Object.entries(it.selectedOptions).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-3 text-[11px] font-bold">
                      {it.uploadedImageRef && <a href={it.uploadedImageRef} target="_blank" rel="noreferrer" className="text-ikonnic-red hover:underline">Uploaded artwork ↗</a>}
                      {it.previewImage && <a href={it.previewImage} target="_blank" rel="noreferrer" className="text-ikonnic-red hover:underline">Preview ↗</a>}
                      {it.product?.slug && <a href={`/product/${it.product.slug}`} target="_blank" rel="noreferrer" className="text-slate-500 hover:underline">Product ↗</a>}
                    </div>
                    {it.customisationJson != null && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[11px] font-bold text-slate-500">Customisation JSON</summary>
                        <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 text-[10px] leading-relaxed text-slate-100">{JSON.stringify(it.customisationJson, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                  <div className="text-right font-black text-slate-900">{money(it.total)}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1 border-t border-rosegold-200/40 pt-4 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span><span>−{money(order.discount)}</span></div>}
              <div className="flex justify-between text-slate-600"><span>Tax (GST)</span><span>{money(order.tax)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Shipping</span><span>{order.shippingCost > 0 ? money(order.shippingCost) : "Free"}</span></div>
              <div className="flex justify-between pt-1 text-base font-black text-slate-950"><span>Total</span><span>{money(order.total)}</span></div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <AddressCard title="Shipping Address" a={order.shippingAddress} />
            <AddressCard title="Billing Address" a={order.billingAddress || order.shippingAddress} />
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-950">Status Timeline</h2>
            <div className="mt-4 space-y-3">
              {order.statusHistory.map((h) => (
                <div key={h.id} className="flex gap-3">
                  <div className="mt-1 size-2.5 shrink-0 rounded-full bg-ikonnic-red" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{h.status.replace(/_/g, " ")}</p>
                    {h.note && <p className="text-xs text-slate-500">{h.note}</p>}
                    <p className="text-[11px] text-slate-400">
                      {new Date(h.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      {h.changedBy && ` · by ${h.changedBy.slice(0, 8)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-950">Customer</h2>
            <div className="mt-2 text-sm text-slate-600">
              <p className="font-bold text-slate-900">{order.user?.firstName} {order.user?.lastName || ""}</p>
              {order.user?.email && <p className="break-all">{order.user.email}</p>}
              {order.user?.phone && <p>{order.user.phone}</p>}
            </div>
          </div>

          {/* Status update */}
          <div className="rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-950">Update Status</h2>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-3 w-full rounded-xl border border-rosegold-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-ikonnic-red"
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
            <button
              type="button"
              disabled={savingStatus || status === order.status}
              onClick={saveStatus}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-ikonnic-red px-4 py-2.5 text-xs font-black text-white hover:bg-red-700 disabled:opacity-50"
            >
              {savingStatus ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save status
            </button>
            {order.cancelReason && <p className="mt-2 text-[11px] text-red-600">Cancel reason: {order.cancelReason}</p>}
          </div>

          {/* Payment */}
          <div className="rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-950">Payment</h2>
            <p className="mt-2 text-sm text-slate-600">Method: <strong>{order.paymentMethod || "COD"}</strong></p>
            {order.payments?.map((p) => (
              <p key={p.id} className="mt-1 text-xs text-slate-500">{money(p.amount)} · {p.status}{p.paidAt ? ` · paid ${new Date(p.paidAt).toLocaleDateString("en-IN")}` : ""}</p>
            ))}
          </div>

          {/* Shipment */}
          <div className="rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-black text-slate-950"><Truck size={16} /> Shipment</h2>
            {order.shipment ? (
              <div className="mt-2 text-sm text-slate-600">
                <p>Courier: <strong>{order.shipment.courier}</strong></p>
                {order.shipment.trackingNumber && <p>Tracking: {order.shipment.trackingNumber}</p>}
                {order.shipment.awbNumber && <p>AWB: {order.shipment.awbNumber}</p>}
                <p>Status: {order.shipment.status}</p>
                {order.shipment.labelUrl && <a href={order.shipment.labelUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-ikonnic-red hover:underline">Shipping label ↗</a>}
              </div>
            ) : (
              <>
                <p className="mt-2 text-sm text-slate-400">No shipment created.</p>
                <button
                  type="button"
                  disabled={creatingShipment}
                  onClick={createShipment}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-rosegold-200 px-4 py-2.5 text-xs font-black text-slate-700 hover:border-ikonnic-red hover:text-ikonnic-red disabled:opacity-50"
                >
                  {creatingShipment ? <Loader2 size={13} className="animate-spin" /> : <Package size={13} />} Create shipment
                </button>
              </>
            )}
          </div>

          {/* Notes */}
          <div className="rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-950">Internal Notes</h2>
            {order.customerNotes && <p className="mt-2 rounded-lg bg-rosegold-50 p-2 text-[11px] text-slate-500">Customer note: {order.customerNotes}</p>}
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes (not visible to customer)…"
              className="mt-2 w-full rounded-xl border border-rosegold-200 px-3 py-2 text-sm outline-none focus:border-ikonnic-red"
            />
            <button
              type="button"
              disabled={savingNotes}
              onClick={saveNotes}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {savingNotes ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save notes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
