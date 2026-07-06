"use client";

import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { DollarSign, ShoppingCart, Users, TrendingUp, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";

type RecentOrder = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  user?: { firstName?: string; lastName?: string; email?: string } | null;
};

type LowStockProduct = {
  id: string;
  slug: string;
  title: string;
  image?: string | null;
  stockCount: number | null;
  stockStatus: string;
};

type DashboardMetrics = {
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  recentOrders: number;
  aov: number;
  ordersByStatus: { status: string; _count: number }[];
  recentOrdersList?: RecentOrder[];
  lowStockProducts?: LowStockProduct[];
  lowStockCount?: number;
};

export function AdminDashboardClient() {
  const { isAuthenticated, user } = useAuthStore();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN")) {
      adminAPI.dashboard()
        .then(({ data }) => setMetrics(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated || (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN")) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="font-black text-red-800">Access Denied</p>
        <p className="mt-2 text-sm text-red-600">Admin credentials required.</p>
        <Link href="/login" className="mt-4 inline-block rounded-full bg-ikonnic-red px-5 py-2 text-sm font-bold text-white">Login</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-ikonnic-red" size={32} /></div>;
  }

  if (!metrics) {
    return <p className="text-center text-sm text-slate-500">Failed to load dashboard metrics.</p>;
  }

  const cards = [
    { label: "Total Revenue", value: `₹${metrics.totalRevenue.toLocaleString("en-IN")}`, icon: DollarSign, color: "bg-emerald-50 text-emerald-700" },
    { label: "Total Orders", value: metrics.totalOrders.toString(), icon: ShoppingCart, color: "bg-blue-50 text-blue-700" },
    { label: "Customers", value: metrics.totalUsers.toString(), icon: Users, color: "bg-purple-50 text-purple-700" },
    { label: "Avg Order Value", value: `₹${Math.round(metrics.aov).toLocaleString("en-IN")}`, icon: TrendingUp, color: "bg-amber-50 text-amber-700" },
  ];

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-sm">
            <div className={`inline-flex size-10 items-center justify-center rounded-xl ${card.color}`}>
              <card.icon size={20} />
            </div>
            <p className="mt-3 text-xs font-bold text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Orders by Status */}
      <div className="rounded-2xl border border-rosegold-200/60 bg-white p-6 shadow-sm">
        <h2 className="font-black text-slate-950">Orders by Status</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.ordersByStatus.map((item) => (
            <div key={item.status} className="flex items-center justify-between rounded-xl bg-rosegold-50 px-4 py-3">
              <span className="text-xs font-bold text-slate-600">{item.status.replace(/_/g, " ")}</span>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-black text-slate-900 shadow-sm">{item._count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="rounded-2xl border border-rosegold-200/60 bg-white p-6 shadow-sm">
        <h2 className="font-black text-slate-950">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/admin/orders" className="rounded-full bg-ikonnic-red px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700">Manage Orders</Link>
          <Link href="/admin/products" className="rounded-full border border-rosegold-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-rosegold-100">Products</Link>
          <Link href="/admin/categories" className="rounded-full border border-rosegold-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-rosegold-100">Categories</Link>
          <Link href="/admin/inventory" className="rounded-full border border-rosegold-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-rosegold-100">Inventory</Link>
          <Link href="/admin/coupons" className="rounded-full border border-rosegold-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-rosegold-100">Coupons</Link>
          <Link href="/admin/analytics" className="rounded-full border border-rosegold-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-rosegold-100">Analytics</Link>
        </div>
        <p className="mt-4 text-sm text-slate-500"><strong>{metrics.recentOrders}</strong> orders in the last 30 days</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-2xl border border-rosegold-200/60 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-slate-950">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs font-black text-ikonnic-red hover:underline">View all →</Link>
          </div>
          {metrics.recentOrdersList && metrics.recentOrdersList.length > 0 ? (
            <div className="mt-4 divide-y divide-slate-100">
              {metrics.recentOrdersList.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{o.orderNumber}</p>
                    <p className="truncate text-[11px] text-slate-400">
                      {o.user?.firstName || o.user?.email || "Guest"} · {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-rosegold-100 px-2 py-0.5 text-[10px] font-black text-slate-600">{o.status.replace(/_/g, " ")}</span>
                    <span className="text-sm font-black text-slate-900">₹{o.total.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No orders yet.</p>
          )}
        </div>

        {/* Low-stock alerts */}
        <div className="rounded-2xl border border-rosegold-200/60 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-black text-slate-950">
              <AlertTriangle size={16} className="text-amber-500" /> Low-Stock Alerts
              {typeof metrics.lowStockCount === "number" && metrics.lowStockCount > 0 && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">{metrics.lowStockCount}</span>
              )}
            </h2>
            <Link href="/admin/inventory" className="text-xs font-black text-ikonnic-red hover:underline">Manage →</Link>
          </div>
          {metrics.lowStockProducts && metrics.lowStockProducts.length > 0 ? (
            <div className="mt-4 divide-y divide-slate-100">
              {metrics.lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    {p.image && <img src={p.image} alt="" className="size-8 rounded-lg object-cover" />}
                    <p className="truncate text-sm font-bold text-slate-900">{p.title}</p>
                  </div>
                  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-black ${p.stockStatus === "out_of_stock" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                    {p.stockCount ?? 0} left
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">All products are well stocked. 🎉</p>
          )}
        </div>
      </div>
    </div>
  );
}
