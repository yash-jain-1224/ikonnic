"use client";

import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Loader2,
  AlertTriangle,
  CreditCard,
  Factory,
  Boxes,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

// Real OrderStatus enum values (backend) — used for correct colouring and
// for deriving the "in production" workflow count.
const PRODUCTION_STATUSES = [
  "IMAGE_PROCESSING",
  "DESIGN_APPROVAL",
  "PRINTING",
  "QUALITY_CHECK",
  "PACKING",
  "REPRINT_INITIATED",
];

const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-100",
  PAYMENT_CONFIRMED: "bg-blue-50 text-blue-700 border-blue-100",
  IMAGE_PROCESSING: "bg-violet-50 text-violet-700 border-violet-100",
  DESIGN_APPROVAL: "bg-violet-50 text-violet-700 border-violet-100",
  PRINTING: "bg-indigo-50 text-indigo-700 border-indigo-100",
  QUALITY_CHECK: "bg-indigo-50 text-indigo-700 border-indigo-100",
  PACKING: "bg-sky-50 text-sky-700 border-sky-100",
  SHIPPED: "bg-sky-50 text-sky-700 border-sky-100",
  OUT_FOR_DELIVERY: "bg-cyan-50 text-cyan-700 border-cyan-100",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  CANCELLED: "bg-red-50 text-red-700 border-red-100",
  RETURNED: "bg-orange-50 text-orange-700 border-orange-100",
  REFUNDED: "bg-slate-50 text-slate-700 border-slate-100",
  REPRINT_INITIATED: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100",
};

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
  failedPayments?: number;
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center max-w-sm">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-red-100">
            <AlertTriangle size={24} className="text-red-600" />
          </div>
          <p className="font-semibold text-red-800">Access Denied</p>
          <p className="mt-1 text-sm text-red-600">Admin credentials required.</p>
          <Link href="/login" className="mt-4 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-slate-400" size={28} />
          <p className="text-sm text-slate-500">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">Failed to load dashboard metrics.</p>
      </div>
    );
  }

  // Derived metrics — all computed from real data (no fabricated trends)
  const countFor = (statuses: string[]) =>
    metrics.ordersByStatus.filter((s) => statuses.includes(s.status)).reduce((sum, s) => sum + s._count, 0);
  const pendingProduction = countFor(PRODUCTION_STATUSES);
  const delivered = countFor(["DELIVERED"]);
  const failedPayments = metrics.failedPayments ?? 0;
  const lowStock = metrics.lowStockCount || 0;

  const kpiCards = [
    {
      label: "Revenue",
      value: `₹${metrics.totalRevenue.toLocaleString("en-IN")}`,
      icon: DollarSign,
      note: "Excl. cancelled",
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Orders",
      value: metrics.totalOrders.toLocaleString("en-IN"),
      icon: ShoppingCart,
      note: `${metrics.recentOrders} in last 30 days`,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Avg Order Value",
      value: `₹${Math.round(metrics.aov).toLocaleString("en-IN")}`,
      icon: TrendingUp,
      note: "Per fulfilled order",
      color: "bg-violet-50 text-violet-600",
    },
    {
      label: "Delivered",
      value: delivered.toLocaleString("en-IN"),
      icon: CheckCircle2,
      note: "Completed orders",
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "In Production",
      value: pendingProduction.toString(),
      icon: Factory,
      note: "In the fulfilment workflow",
      color: "bg-orange-50 text-orange-600",
    },
    {
      label: "Failed Payments",
      value: failedPayments.toString(),
      icon: CreditCard,
      note: failedPayments > 0 ? "Needs attention" : "All clear",
      alert: failedPayments > 0,
      color: failedPayments > 0 ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-600",
    },
    {
      label: "Inventory Alerts",
      value: lowStock.toString(),
      icon: Boxes,
      note: lowStock > 0 ? "Low / out of stock" : "All stocked",
      alert: lowStock > 0,
      color: lowStock > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Overview of your store performance and metrics.</p>
        </div>
        <Link
          href="/admin/analytics"
          className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 sm:mt-0"
        >
          <TrendingUp size={14} /> View analytics
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        {kpiCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-sm">
            <div className={`grid size-8 place-items-center rounded-lg ${card.color}`}>
              <card.icon size={16} />
            </div>
            <p className="mt-3 text-[22px] font-bold text-slate-900 leading-tight">{card.value}</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">{card.label}</p>
            <p className={`mt-2 text-[11px] font-medium ${card.alert ? "text-red-600" : "text-slate-400"}`}>
              {card.note}
            </p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Orders by Status */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Order Status Distribution</h2>
            <Link href="/admin/orders" className="text-[12px] font-medium text-slate-500 hover:text-slate-900 transition">
              View all →
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.ordersByStatus.map((item) => {
              const colorClass = ORDER_STATUS_COLORS[item.status] || "bg-slate-50 text-slate-700 border-slate-100";
              return (
                <div key={item.status} className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${colorClass}`}>
                  <span className="text-[12px] font-medium">{item.status.replace(/_/g, " ")}</span>
                  <span className="text-[13px] font-bold">{item._count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Revenue Summary</h2>
          <div className="space-y-4">
            <div className="text-center py-6">
              <p className="text-3xl font-bold text-slate-900">₹{metrics.totalRevenue.toLocaleString("en-IN")}</p>
              <p className="text-sm text-slate-500 mt-1">Total Revenue</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-lg font-bold text-slate-900">{metrics.totalOrders}</p>
                <p className="text-[11px] text-slate-500">Total Orders</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-lg font-bold text-slate-900">₹{Math.round(metrics.aov).toLocaleString("en-IN")}</p>
                <p className="text-[11px] text-slate-500">Avg Order</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-lg font-bold text-slate-900">{metrics.totalUsers}</p>
                <p className="text-[11px] text-slate-500">Customers</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-lg font-bold text-slate-900">{metrics.recentOrders}</p>
                <p className="text-[11px] text-slate-500">This Month</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent Orders</h2>
            <Link href="/admin/orders" className="text-[12px] font-medium text-slate-500 hover:text-slate-900 transition">
              View all →
            </Link>
          </div>
          {metrics.recentOrdersList && metrics.recentOrdersList.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {metrics.recentOrdersList.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{o.orderNumber}</p>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-slate-400">
                      {o.user?.firstName || o.user?.email || "Guest"} · {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 whitespace-nowrap">₹{o.total.toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <ShoppingCart size={24} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">No orders yet.</p>
            </div>
          )}
        </div>

        {/* Low-Stock Alerts */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <AlertTriangle size={14} className="text-amber-500" />
              Inventory Alerts
              {typeof metrics.lowStockCount === "number" && metrics.lowStockCount > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  {metrics.lowStockCount}
                </span>
              )}
            </h2>
            <Link href="/admin/inventory" className="text-[12px] font-medium text-slate-500 hover:text-slate-900 transition">
              Manage →
            </Link>
          </div>
          {metrics.lowStockProducts && metrics.lowStockProducts.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {metrics.lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-center gap-3">
                    {p.image && (
                      <img src={p.image} alt="" className="size-9 rounded-lg object-cover border border-slate-100" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{p.title}</p>
                      <p className="text-[11px] text-slate-400">
                        {p.stockStatus === "out_of_stock" ? "Out of stock" : "Low stock"}
                      </p>
                    </div>
                  </div>
                  <span className={`whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold ${
                    p.stockStatus === "out_of_stock"
                      ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-700"
                  }`}>
                    {p.stockCount ?? 0} left
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Boxes size={24} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">All products are well stocked. 🎉</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  // Reuse the shared map (strip the border class it also carries)
  const style = ORDER_STATUS_COLORS[status] || "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${style}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
