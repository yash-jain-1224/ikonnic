"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Loader2, Mail, Phone, ShieldCheck, ShieldOff } from "lucide-react";

type Address = {
  id: string; fullName: string; phone: string; streetLine1: string; streetLine2?: string | null;
  city: string; state: string; pincode: string; country: string; isDefault: boolean;
};
type CustomerOrder = { id: string; orderNumber: string; status: string; total: number; paymentMethod?: string | null; createdAt: string };
type Customer = {
  id: string; email: string; firstName: string; lastName?: string | null; phone?: string | null;
  role: string; isVerified: boolean; isActive: boolean; authProvider: string;
  createdAt: string; lastLoginAt?: string | null; lifetimeValue: number;
  addresses: Address[]; orders: CustomerOrder[]; _count?: { orders: number; reviews: number };
};

const statusColor: Record<string, string> = {
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
  SHIPPED: "bg-sky-100 text-sky-800",
};

export function AdminCustomerDetailClient({ userId }: { userId: string }) {
  const { isAuthenticated, user } = useAuthStore();
  const isAdmin = isAuthenticated && (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN");

  const [c, setC] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminAPI.getUser(userId);
      setC(data);
    } catch {
      setError("Failed to load customer.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const toggleActive = async () => {
    if (!c) return;
    const next = !c.isActive;
    if (!window.confirm(`${next ? "Reactivate" : "Deactivate"} ${c.firstName}'s account? ${next ? "" : "They will be unable to log in."}`)) return;
    setToggling(true);
    try {
      await adminAPI.setUserStatus(c.id, next);
      await load();
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(Array.isArray(m) ? m[0] : m || "Could not update status");
    } finally {
      setToggling(false);
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
  if (error || !c) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-sm font-bold text-slate-500">{error || "Customer not found."}</p>
        <Link href="/admin/customers" className="mt-4 inline-block text-xs font-black text-ikonnic-red hover:underline">← Back to customers</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/admin/customers" className="text-xs font-black text-ikonnic-red hover:underline">← All customers</Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-full bg-ikonnic-red text-xl font-black text-white">{c.firstName?.[0]?.toUpperCase() || "U"}</div>
          <div>
            <h1 className="text-2xl font-black text-slate-950">{c.firstName} {c.lastName || ""}</h1>
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1"><Mail size={13} /> {c.email}</span>
              {c.phone && <span className="flex items-center gap-1"><Phone size={13} /> {c.phone}</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-rosegold-100 px-2 py-0.5 text-[10px] font-black text-slate-600">{c.role}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${c.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{c.isActive ? "ACTIVE" : "DEACTIVATED"}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${c.isVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{c.isVerified ? "VERIFIED" : "UNVERIFIED"}</span>
              <span className="rounded-full bg-rosegold-100 px-2 py-0.5 text-[10px] font-black text-slate-600">{c.authProvider}</span>
            </div>
          </div>
        </div>
        {c.role === "CUSTOMER" && (
          <button
            type="button"
            disabled={toggling}
            onClick={toggleActive}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-black text-white disabled:opacity-50 ${c.isActive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {toggling ? <Loader2 size={13} className="animate-spin" /> : c.isActive ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
            {c.isActive ? "Deactivate account" : "Reactivate account"}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Orders", value: c._count?.orders ?? c.orders.length },
          { label: "Lifetime Value", value: `₹${Math.round(c.lifetimeValue).toLocaleString("en-IN")}` },
          { label: "Reviews", value: c._count?.reviews ?? 0 },
          { label: "Joined", value: new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-rosegold-200/60 bg-white p-4 shadow-sm">
            <p className="text-xl font-black text-slate-950">{s.value}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Order history */}
        <div className="rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="font-black text-slate-950">Order History</h2>
          {c.orders.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No orders yet.</p>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {c.orders.map((o) => (
                <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-rosegold-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ikonnic-red">{o.orderNumber}</p>
                    <p className="text-[11px] text-slate-400">{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {o.paymentMethod || "COD"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${statusColor[o.status] || "bg-rosegold-100 text-slate-600"}`}>{o.status.replace(/_/g, " ")}</span>
                    <span className="text-sm font-black text-slate-900">₹{o.total.toLocaleString("en-IN")}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Addresses */}
        <div className="rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-sm">
          <h2 className="font-black text-slate-950">Addresses</h2>
          {c.addresses.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No saved addresses.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {c.addresses.map((a) => (
                <div key={a.id} className="rounded-xl bg-rosegold-50 p-3 text-xs leading-5 text-slate-600">
                  <p className="font-bold text-slate-900">{a.fullName} {a.isDefault && <span className="text-[10px] text-ikonnic-red">· default</span>}</p>
                  <p>{a.phone}</p>
                  <p>{a.streetLine1}{a.streetLine2 ? `, ${a.streetLine2}` : ""}, {a.city}, {a.state} {a.pincode}</p>
                </div>
              ))}
            </div>
          )}
          {c.lastLoginAt && <p className="mt-3 text-[11px] text-slate-400">Last login {new Date(c.lastLoginAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>}
        </div>
      </div>
    </div>
  );
}
