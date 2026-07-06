"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Check, EyeOff, Loader2, MessageSquare, Star, Trash2 } from "lucide-react";

type AdminReview = {
  id: string;
  rating: number;
  title?: string | null;
  text: string;
  photos: string[];
  isVerified: boolean;
  isApproved: boolean;
  adminReply?: string | null;
  createdAt: string;
  user?: { firstName?: string; lastName?: string; email?: string } | null;
  product?: { title?: string; slug?: string; image?: string } | null;
};

type Filter = "pending" | "approved" | "all";

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} className={i <= n ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
      ))}
    </span>
  );
}

export function AdminReviewsClient() {
  const { isAuthenticated, user } = useAuthStore();
  const isAdmin = isAuthenticated && (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN");

  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminAPI.getReviews(page, 20, filter === "all" ? undefined : filter);
      setReviews(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
      setPendingCount(data.meta?.pendingCount ?? 0);
    } catch {
      setError("Failed to load reviews. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const setApproved = async (r: AdminReview, isApproved: boolean) => {
    setBusyId(r.id);
    try {
      await adminAPI.moderateReview(r.id, { isApproved });
      await load();
    } catch {
      alert("Could not update review");
    } finally {
      setBusyId(null);
    }
  };

  const saveReply = async (r: AdminReview) => {
    setBusyId(r.id);
    try {
      await adminAPI.moderateReview(r.id, { adminReply: replyText });
      setReplyOpen(null);
      setReplyText("");
      await load();
    } catch {
      alert("Could not save reply");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (r: AdminReview) => {
    if (!window.confirm("Permanently delete this review?")) return;
    setBusyId(r.id);
    try {
      await adminAPI.deleteReview(r.id);
      await load();
    } catch {
      alert("Could not delete review");
    } finally {
      setBusyId(null);
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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-950"><MessageSquare size={24} /> Reviews</h1>
          <p className="mt-1 text-sm text-slate-500">Approve, hide, reply to, or remove customer reviews. Only approved reviews appear on the storefront.</p>
        </div>
        <Link href="/admin" className="text-xs font-black text-ikonnic-red hover:underline">← Admin Console</Link>
      </div>

      <div className="mb-4 flex rounded-full border border-rosegold-200/60 bg-white p-1">
        {(["pending", "approved", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => { setFilter(f); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-xs font-black capitalize ${filter === f ? "bg-ikonnic-red text-white" : "text-slate-600 hover:text-ikonnic-red"}`}
          >
            {f}{f === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-rosegold-100" />)}</div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-rosegold-200/60 bg-white p-10 text-center text-sm text-slate-500">No {filter === "all" ? "" : filter} reviews.</div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {r.product?.image && <img src={r.product.image} alt="" className="size-10 rounded-lg object-cover" />}
                  <div>
                    <p className="text-sm font-bold text-slate-900">{r.product?.title || "Product"}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <Stars n={r.rating} />
                      {r.isVerified && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">VERIFIED</span>}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${r.isApproved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{r.isApproved ? "PUBLISHED" : "PENDING"}</span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>

              {r.title && <p className="mt-3 text-sm font-bold text-slate-900">{r.title}</p>}
              <p className="mt-1 text-sm text-slate-600">{r.text}</p>
              <p className="mt-1 text-[11px] text-slate-400">— {r.user?.firstName} {r.user?.lastName || ""} ({r.user?.email})</p>

              {r.photos?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.photos.map((p, i) => <img key={i} src={p} alt="" className="size-14 rounded-lg object-cover" />)}
                </div>
              )}

              {r.adminReply && (
                <div className="mt-3 rounded-lg bg-rosegold-50 p-3 text-xs text-slate-600">
                  <strong className="text-slate-900">Admin reply:</strong> {r.adminReply}
                </div>
              )}

              {replyOpen === r.id ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a public reply…"
                    className="min-w-48 flex-1 rounded-lg border border-rosegold-200 px-3 py-2 text-sm outline-none focus:border-ikonnic-red"
                  />
                  <button type="button" disabled={busyId === r.id} onClick={() => saveReply(r)} className="rounded-full bg-slate-900 px-4 py-2 text-xs font-black text-white disabled:opacity-50">Save reply</button>
                  <button type="button" onClick={() => { setReplyOpen(null); setReplyText(""); }} className="rounded-full border border-rosegold-200 px-4 py-2 text-xs font-black text-slate-600">Cancel</button>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {!r.isApproved ? (
                    <button type="button" disabled={busyId === r.id} onClick={() => setApproved(r, true)} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50">
                      {busyId === r.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve
                    </button>
                  ) : (
                    <button type="button" disabled={busyId === r.id} onClick={() => setApproved(r, false)} className="inline-flex items-center gap-1.5 rounded-full border border-rosegold-200 px-4 py-2 text-xs font-black text-slate-700 hover:border-amber-300 disabled:opacity-50">
                      <EyeOff size={13} /> Hide
                    </button>
                  )}
                  <button type="button" onClick={() => { setReplyOpen(r.id); setReplyText(r.adminReply || ""); }} className="inline-flex items-center gap-1.5 rounded-full border border-rosegold-200 px-4 py-2 text-xs font-black text-slate-700 hover:border-ikonnic-red">
                    <MessageSquare size={13} /> {r.adminReply ? "Edit reply" : "Reply"}
                  </button>
                  <button type="button" disabled={busyId === r.id} onClick={() => remove(r)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-red-600 hover:border-red-300 disabled:opacity-50">
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
          <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-full border border-rosegold-200 px-4 py-2 disabled:opacity-40">← Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-rosegold-200 px-4 py-2 disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
