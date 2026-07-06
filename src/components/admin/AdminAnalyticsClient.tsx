"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Download, IndianRupee, LineChart, Loader2, ShoppingCart, TrendingUp, UserPlus } from "lucide-react";

type Analytics = {
  days: number;
  totalRevenue: number;
  totalOrders: number;
  newUsers: number;
  aov: number;
  revenueByDay: { date: string; revenue: number; orders: number }[];
  ordersByStatus: { status: string; _count: number }[];
  topProducts: { productId: string; title: string; image?: string; slug?: string; quantity: number; revenue: number }[];
};

const RANGES = [7, 30, 90] as const;

export function AdminAnalyticsClient() {
  const { isAuthenticated, user } = useAuthStore();
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = isAuthenticated && (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN");

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    adminAPI.analytics(days)
      .then(({ data }) => setData(data))
      .catch(() => setError("Failed to load analytics. Is the backend running?"))
      .finally(() => setLoading(false));
  }, [isAdmin, days]);

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="font-black text-red-800">Access Denied</p>
        <p className="mt-2 text-sm text-red-600">Admin credentials required.</p>
        <Link href="/login" className="mt-4 inline-block rounded-full bg-ikonnic-red px-5 py-2 text-sm font-bold text-white">Login</Link>
      </div>
    );
  }

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Date", "Revenue", "Orders"],
      ...data.revenueByDay.map((d) => [d.date, String(d.revenue), String(d.orders)]),
      [],
      ["Top Products", "Quantity", "Revenue"],
      ...data.topProducts.map((p) => [p.title.replace(/"/g, '""'), String(p.quantity), String(p.revenue)]),
      [],
      ["Orders by Status", "Count"],
      ...data.ordersByStatus.map((s) => [s.status, String(s._count)]),
    ];
    const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c}"` : c)).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ikonnic-analytics-${data.days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxDayRevenue = Math.max(1, ...(data?.revenueByDay.map((d) => d.revenue) ?? [1]));
  const maxStatusCount = Math.max(1, ...(data?.ordersByStatus.map((s) => s._count) ?? [1]));
  const cards = data
    ? [
        { label: `Revenue (${data.days}d)`, value: `₹${Math.round(data.totalRevenue).toLocaleString("en-IN")}`, icon: IndianRupee, color: "bg-emerald-50 text-emerald-700" },
        { label: `Orders (${data.days}d)`, value: data.totalOrders.toString(), icon: ShoppingCart, color: "bg-blue-50 text-blue-700" },
        { label: `New Customers (${data.days}d)`, value: data.newUsers.toString(), icon: UserPlus, color: "bg-purple-50 text-purple-700" },
        { label: "Avg Order Value", value: `₹${Math.round(data.aov).toLocaleString("en-IN")}`, icon: TrendingUp, color: "bg-amber-50 text-amber-700" },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-950"><LineChart size={24} /> Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Revenue, order flow, and top sellers.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-full border border-rosegold-200/60 bg-white p-1">
            {RANGES.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDays(range)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-black ${days === range ? "bg-ikonnic-red text-white" : "text-slate-600 hover:text-ikonnic-red"}`}
              >
                {range}d
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!data}
            className="inline-flex items-center gap-1.5 rounded-full border border-rosegold-200 bg-white px-3.5 py-1.5 text-xs font-black text-slate-700 hover:border-ikonnic-red hover:text-ikonnic-red disabled:opacity-40"
          >
            <Download size={13} /> Export CSV
          </button>
          <Link href="/admin" className="text-xs font-black text-ikonnic-red hover:underline">← Admin Console</Link>
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-ikonnic-red" size={32} /></div>
      ) : data ? (
        <div className="space-y-6">
          {/* Metric cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-sm">
                <div className={`grid size-10 place-items-center rounded-xl ${color}`}><Icon size={20} /></div>
                <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Revenue by day */}
          <section className="rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-950">Daily revenue</h2>
            <div
              className="mt-4 flex h-40 items-end gap-px overflow-hidden"
              role="img"
              aria-label={`Daily revenue over the last ${data.days} days, peaking at ₹${Math.round(maxDayRevenue).toLocaleString("en-IN")}`}
            >
              {data.revenueByDay.map((day) => (
                <div key={day.date} className="group relative flex-1">
                  <div
                    className="mx-auto w-full min-w-[2px] rounded-t bg-ikonnic-red/80 transition group-hover:bg-ikonnic-red"
                    style={{ height: `${Math.max(2, (day.revenue / maxDayRevenue) * 152)}px` }}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-white group-hover:block">
                    {new Date(day.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ₹{Math.round(day.revenue).toLocaleString("en-IN")} · {day.orders} order{day.orders === 1 ? "" : "s"}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-400">
              <span>{new Date(data.revenueByDay[0]?.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              <span>{new Date(data.revenueByDay[data.revenueByDay.length - 1]?.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Orders by status */}
            <section className="rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-sm">
              <h2 className="font-black text-slate-950">Orders by status <span className="text-xs font-bold text-slate-400">(all time)</span></h2>
              {data.ordersByStatus.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No orders yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {[...data.ordersByStatus].sort((a, b) => b._count - a._count).map((s) => (
                    <div key={s.status}>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-600">{s.status.replace(/_/g, " ")}</span>
                        <span className="text-slate-900">{s._count}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-rosegold-100">
                        <div className="h-full rounded-full bg-ikonnic-red/80" style={{ width: `${(s._count / maxStatusCount) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Top products */}
            <section className="rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-sm">
              <h2 className="font-black text-slate-950">Top products <span className="text-xs font-bold text-slate-400">(all time)</span></h2>
              {data.topProducts.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No sales yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {data.topProducts.map((p, index) => (
                    <div key={p.productId} className="flex items-center gap-3">
                      <span className="w-5 text-center text-xs font-black text-slate-400">{index + 1}</span>
                      {p.image && <img src={p.image} alt="" className="size-9 rounded-lg object-cover" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">{p.title}</p>
                        <p className="text-[11px] text-slate-400">{p.quantity} sold</p>
                      </div>
                      <strong className="text-sm text-slate-900">₹{Math.round(p.revenue).toLocaleString("en-IN")}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
