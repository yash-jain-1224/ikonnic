"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Users } from "lucide-react";

type AdminUser = {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  role: string;
  isVerified: boolean;
  createdAt: string;
  _count?: { orders: number };
};

export function AdminCustomersClient() {
  const { isAuthenticated, user } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = isAuthenticated && (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminAPI.getUsers(page, 20);
      setUsers(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch {
      setError("Failed to load customers. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="font-black text-red-800">Access Denied</p>
        <p className="mt-2 text-sm text-red-600">Admin credentials required.</p>
        <Link href="/login" className="mt-4 inline-block rounded-full bg-ikonnic-red px-5 py-2 text-sm font-bold text-white">Login</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-950"><Users size={24} /> Customers</h1>
          <p className="mt-1 text-sm text-slate-500">{total} registered users across all roles.</p>
        </div>
        <Link href="/admin" className="text-xs font-black text-ikonnic-red hover:underline">← Admin Console</Link>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No customers yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-black uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-center">Verified</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-full bg-ikonnic-red text-sm font-black text-white">
                        {u.firstName?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">{u.firstName} {u.lastName || ""}</p>
                        <p className="truncate text-[11px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${u.role === "CUSTOMER" ? "bg-slate-100 text-slate-600" : "bg-purple-50 text-purple-700"}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-center">{u.isVerified ? "✅" : "—"}</td>
                  <td className="px-4 py-3 text-right font-black text-slate-900">{u._count?.orders ?? 0}</td>
                  <td className="px-4 py-3 text-right text-[12px] text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 20 && (
        <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-600">
          <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-full border border-slate-200 px-4 py-2 disabled:opacity-40">← Previous</button>
          <span>Page {page} of {Math.ceil(total / 20)}</span>
          <button type="button" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-slate-200 px-4 py-2 disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
