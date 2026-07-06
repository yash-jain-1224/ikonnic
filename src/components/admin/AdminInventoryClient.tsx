"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Boxes, History, Loader2, Save, Search, X } from "lucide-react";

type InventoryRow = {
  id: string;
  slug: string;
  sku?: string | null;
  title: string;
  image: string;
  stockStatus: string;
  stockCount: number | null;
  category?: { name: string } | null;
  reserved: number;
  available: number;
};

type InventoryTransaction = {
  id: string;
  type: string;
  quantity: number;
  note?: string | null;
  createdAt: string;
  warehouse?: { name: string; code: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  in_stock: "bg-emerald-50 text-emerald-700",
  low_stock: "bg-amber-50 text-amber-700",
  out_of_stock: "bg-red-50 text-red-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${STATUS_STYLES[status] ?? "bg-rosegold-100 text-slate-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function AdminInventoryClient() {
  const { isAuthenticated, user } = useAuthStore();
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Inline editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Transaction history state
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<InventoryTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const isAdmin = isAuthenticated && (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN");

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminAPI.getInventory(page, 20, search || undefined, lowStockOnly || undefined);
      setRows(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch {
      setError("Failed to load inventory. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [page, search, lowStockOnly]);

  useEffect(() => {
    if (isAdmin) fetchInventory();
  }, [isAdmin, fetchInventory]);

  const openEditor = (row: InventoryRow) => {
    setEditingId(row.id);
    setNewCount(row.stockCount ?? 0);
    setNote("");
  };

  const saveAdjustment = async (row: InventoryRow) => {
    setSaving(true);
    try {
      await adminAPI.adjustInventory(row.id, { stockCount: newCount, note: note || undefined });
      setEditingId(null);
      await fetchInventory();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to adjust stock";
      alert(Array.isArray(message) ? message[0] : message);
    } finally {
      setSaving(false);
    }
  };

  const toggleHistory = async (row: InventoryRow) => {
    if (historyId === row.id) {
      setHistoryId(null);
      return;
    }
    setHistoryId(row.id);
    setLoadingHistory(true);
    try {
      const { data } = await adminAPI.getInventoryTransactions(row.id);
      setHistory(data || []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

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
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-950"><Boxes size={24} /> Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">Stock levels, reservations, and adjustments with a full audit trail.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-3 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by title or SKU..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-ikonnic-red"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-600">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => { setLowStockOnly(e.target.checked); setPage(1); }}
            className="accent-ikonnic-red"
          />
          Low / out of stock only
        </label>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-rosegold-100" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-rosegold-200/60 bg-white p-10 text-center text-sm text-slate-500">
          No products found{lowStockOnly ? " with low stock" : ""}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-rosegold-200/60 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-rosegold-200/40 text-[11px] font-black uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-right">Reserved</th>
                <th className="px-4 py-3 text-right">Available</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Fragment key={row.id}>
                  <tr className="border-b border-slate-50 hover:bg-rosegold-100/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={row.image} alt={row.title} className="size-10 rounded-lg object-cover" />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900">{row.title}</p>
                          <p className="text-[11px] text-slate-400">{row.sku || row.slug}{row.category?.name ? ` · ${row.category.name}` : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={row.stockStatus} /></td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">{row.stockCount ?? "∞"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{row.reserved}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{row.available}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditor(row)}
                          className="rounded-full border border-rosegold-200 px-3 py-1.5 text-xs font-black text-slate-700 hover:border-ikonnic-red hover:text-ikonnic-red"
                        >
                          Adjust
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleHistory(row)}
                          className="grid size-8 place-items-center rounded-full border border-slate-200 text-slate-500 hover:border-slate-300"
                          aria-label="Transaction history"
                        >
                          <History size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline stock editor */}
                  {editingId === row.id && (
                    <tr className="border-b border-slate-50 bg-red-50/40">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="flex flex-wrap items-end gap-3">
                          <label className="text-xs font-bold text-slate-600">
                            Set stock to
                            <div className="mt-1 flex items-center gap-1">
                              {[-10, -1].map((d) => (
                                <button key={d} type="button" onClick={() => setNewCount((c) => Math.max(0, c + d))} className="rounded-lg border border-rosegold-200/60 bg-white px-2 py-2 text-xs font-black text-slate-600">{d}</button>
                              ))}
                              <input
                                type="number"
                                min={0}
                                value={newCount}
                                onChange={(e) => setNewCount(Math.max(0, Number(e.target.value)))}
                                className="w-24 rounded-lg border border-rosegold-200 px-3 py-2 text-center text-sm font-black outline-none focus:border-ikonnic-red"
                              />
                              {[1, 10].map((d) => (
                                <button key={d} type="button" onClick={() => setNewCount((c) => c + d)} className="rounded-lg border border-rosegold-200/60 bg-white px-2 py-2 text-xs font-black text-slate-600">+{d}</button>
                              ))}
                            </div>
                          </label>
                          <label className="min-w-48 flex-1 text-xs font-bold text-slate-600">
                            Note (optional)
                            <input
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                              placeholder="e.g. restock, damaged batch"
                              className="mt-1 w-full rounded-lg border border-rosegold-200 px-3 py-2 text-sm outline-none focus:border-ikonnic-red"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => saveAdjustment(row)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-ikonnic-red px-4 py-2.5 text-xs font-black text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-rosegold-200 px-4 py-2.5 text-xs font-black text-slate-600"
                          >
                            <X size={13} /> Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Transaction history */}
                  {historyId === row.id && (
                    <tr className="border-b border-slate-50 bg-rosegold-50/60">
                      <td colSpan={6} className="px-4 py-4">
                        {loadingHistory ? (
                          <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 size={13} className="animate-spin" /> Loading history…</div>
                        ) : history.length === 0 ? (
                          <p className="text-xs text-slate-500">No inventory transactions recorded yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {history.map((tx) => (
                              <div key={tx.id} className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                                <span className={`rounded-full px-2 py-0.5 font-black ${tx.type === "STOCK_IN" ? "bg-emerald-50 text-emerald-700" : tx.type === "STOCK_OUT" ? "bg-red-50 text-red-700" : "bg-rosegold-100 text-slate-600"}`}>{tx.type}</span>
                                <strong>{tx.quantity}</strong>
                                {tx.note && <span>· {tx.note}</span>}
                                <span className="text-slate-400">· {new Date(tx.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-600">
          <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-full border border-rosegold-200 px-4 py-2 disabled:opacity-40">← Previous</button>
          <span>Page {page} of {Math.ceil(total / 20)}</span>
          <button type="button" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-rosegold-200 px-4 py-2 disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
