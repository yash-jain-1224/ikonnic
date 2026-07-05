"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Edit3, LogOut, Package, RotateCcw, Star, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useOrderStore } from "@/store/orders";
import { ordersAPI } from "@/lib/api";
import { AddressBook } from "@/components/account/AddressBook";

type BackendOrder = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  itemCount: number;
  createdAt: string;
};

export function AccountClient() {
  const router = useRouter();
  const { user, isAuthenticated, logout, fetchProfile } = useAuthStore();
  const localOrders = useOrderStore((state) => state.orders);
  const [mounted, setMounted] = useState(false);
  const [backendOrders, setBackendOrders] = useState<BackendOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchProfile();
  }, [fetchProfile]);

  // Fetch orders for authenticated users
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoadingOrders(true);
    ordersAPI.list(1, 10)
      .then(({ data }) => setBackendOrders(data.orders || data.items || data || []))
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (!mounted) return <div className="h-72 animate-pulse rounded-3xl bg-white" />;

  // Not authenticated — show guest state with login CTA
  if (!isAuthenticated) {
    return (
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="grid size-16 place-items-center rounded-full bg-slate-100">
            <User size={28} className="text-slate-400" />
          </div>
          <h2 className="mt-4 font-black text-slate-950">Guest User</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in to access your orders, addresses, wishlist, and profile settings.</p>
          <Link href="/login" className="mt-5 block rounded-full bg-ikonnic-red px-4 py-3 text-center text-xs font-black text-white hover:bg-red-700">Sign in</Link>
          <Link href="/register" className="mt-3 block rounded-full border border-slate-200 px-4 py-3 text-center text-xs font-black text-slate-700">Create account</Link>
        </aside>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-lg font-black text-slate-950">Recent local orders</h2>
          {!localOrders.length ? (
            <p className="mt-3 text-sm text-slate-500">No orders yet. Place a checkout order to see tracking.</p>
          ) : (
            <div className="mt-5 space-y-4">
              {localOrders.map((order) => (
                <article key={order.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-ikonnic-red">{order.id}</p>
                      <h3 className="mt-1 font-black text-slate-950">{order.status}</h3>
                      <p className="mt-1 text-xs text-slate-500">{order.items.length} item(s) · ₹{order.total.toLocaleString("en-IN")}</p>
                    </div>
                    <Link href="/orders-tracking" className="rounded-full bg-red-50 px-3 py-2 text-xs font-black text-ikonnic-red">Track</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // Authenticated — full account page
  const orders = backendOrders.length > 0 ? backendOrders : localOrders.map((o) => ({
    id: o.id,
    orderNumber: o.id,
    status: o.status,
    total: o.total,
    itemCount: o.items.length,
    createdAt: o.createdAt,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="h-fit space-y-4">
        {/* Profile Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-full bg-ikonnic-red text-white text-lg font-black">
              {user?.firstName?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <h2 className="font-black text-slate-950">{user?.firstName} {user?.lastName}</h2>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          {user?.phone && <p className="mt-3 text-xs text-slate-500">📱 {user.phone}</p>}
          <div className="mt-4 flex gap-2">
            <button className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
              <Edit3 size={12} /> Edit
            </button>
            <button onClick={handleLogout} className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
              <LogOut size={12} /> Logout
            </button>
          </div>
        </div>

        {/* Addresses */}
        <AddressBook />

        {/* Quick Links */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h3 className="font-black text-slate-950">Quick links</h3>
          <nav className="mt-3 space-y-2">
            <Link href="/wishlist" className="block text-sm font-bold text-slate-600 hover:text-ikonnic-red">❤️ Wishlist</Link>
            <Link href="/orders-tracking" className="block text-sm font-bold text-slate-600 hover:text-ikonnic-red">📦 Track orders</Link>
            <Link href="/contact-us" className="block text-sm font-bold text-slate-600 hover:text-ikonnic-red">💬 Help & support</Link>
          </nav>
        </div>
      </aside>

      {/* Orders */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Package size={20} /> My Orders</h2>
          {orders.length > 5 && (
            <Link href="/orders-tracking" className="text-xs font-black text-ikonnic-red hover:underline">View all →</Link>
          )}
        </div>

        {loadingOrders ? (
          <div className="mt-5 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : !orders.length ? (
          <div className="mt-8 text-center">
            <Package size={40} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">No orders yet. Start shopping!</p>
            <Link href="/" className="mt-3 inline-block rounded-full bg-ikonnic-red px-5 py-2.5 text-xs font-black text-white">Browse products</Link>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="rounded-xl border border-slate-100 p-4 transition-colors hover:border-slate-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    {backendOrders.length > 0 ? (
                      <Link href={`/account/orders/${order.id}`} className="text-xs font-black uppercase tracking-[0.12em] text-ikonnic-red hover:underline">{order.orderNumber || order.id}</Link>
                    ) : (
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-ikonnic-red">{order.orderNumber || order.id}</p>
                    )}
                    <h3 className="mt-1 font-black text-slate-950">{order.status}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {order.itemCount || (order as any).items?.length} item(s) · ₹{order.total.toLocaleString("en-IN")}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {backendOrders.length > 0 && (
                      <Link href={`/account/orders/${order.id}`} className="rounded-full bg-ikonnic-red px-3 py-2 text-xs font-black text-white">View</Link>
                    )}
                    <Link href="/orders-tracking" className="rounded-full bg-red-50 px-3 py-2 text-xs font-black text-ikonnic-red">Track</Link>
                    <button type="button" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"><RotateCcw size={13} />Reorder</button>
                    <button type="button" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"><Download size={13} />Invoice</button>
                    <button type="button" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"><Star size={13} />Review</button>
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
