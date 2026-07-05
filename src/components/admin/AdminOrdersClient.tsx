"use client";

import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Package, ChevronDown, RefreshCw, Loader2 } from "lucide-react";
import Link from "next/link";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
  items: { title: string; quantity: number; total: number }[];
};

const STATUS_OPTIONS = [
  "PENDING", "PAYMENT_CONFIRMED", "IMAGE_PROCESSING", "DESIGN_APPROVAL",
  "PRINTING", "QUALITY_CHECK", "PACKING", "SHIPPED", "OUT_FOR_DELIVERY",
  "DELIVERED", "CANCELLED", "RETURNED", "REFUNDED",
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

export function AdminOrdersClient() {
  const { isAuthenticated, user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getOrders(page, 20, statusFilter || undefined);
      setOrders(data.data);
      setTotalPages(data.meta.totalPages);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN")) {
      fetchOrders();
    }
  }, [isAuthenticated, user, page, statusFilter]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await adminAPI.updateOrderStatus(orderId, newStatus, `Status updated to ${newStatus} by admin`);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      alert("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isAuthenticated || (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN")) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="font-black text-red-800">Access Denied</p>
        <p className="mt-2 text-sm text-red-600">You must be logged in as an admin to view this page.</p>
        <Link href="/login" className="mt-4 inline-block rounded-full bg-ikonnic-red px-5 py-2 text-sm font-bold text-white">Login</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold outline-none focus:border-ikonnic-red"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <button onClick={fetchOrders} className="flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold hover:bg-slate-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-ikonnic-red" size={32} /></div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Package className="mx-auto text-slate-300" size={48} />
          <p className="mt-4 font-black text-slate-500">No orders found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-black text-slate-600">Order</th>
                <th className="px-4 py-3 font-black text-slate-600">Customer</th>
                <th className="px-4 py-3 font-black text-slate-600">Items</th>
                <th className="px-4 py-3 font-black text-slate-600">Total</th>
                <th className="px-4 py-3 font-black text-slate-600">Status</th>
                <th className="px-4 py-3 font-black text-slate-600">Date</th>
                <th className="px-4 py-3 font-black text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-25">
                  <td className="px-4 py-3 font-bold text-ikonnic-red">{order.orderNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold">{order.user.firstName} {order.user.lastName}</p>
                    <p className="text-xs text-slate-500">{order.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {order.items.slice(0, 2).map((i, idx) => <span key={idx} className="block">{i.title} ×{i.quantity}</span>)}
                    {order.items.length > 2 && <span className="text-slate-400">+{order.items.length - 2} more</span>}
                  </td>
                  <td className="px-4 py-3 font-bold">₹{order.total.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${statusColor[order.status] || "bg-slate-100 text-slate-700"}`}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        disabled={updatingId === order.id}
                        className="appearance-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-7 text-xs font-bold outline-none focus:border-ikonnic-red disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                      </select>
                      <ChevronDown size={12} className="pointer-events-none absolute right-2 top-2.5 text-slate-400" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded-lg border px-3 py-1 text-sm font-bold disabled:opacity-40">Prev</button>
          <span className="text-sm font-bold text-slate-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded-lg border px-3 py-1 text-sm font-bold disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
