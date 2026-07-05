"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { BadgePercent, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";

type AdminCoupon = {
  id: string;
  code: string;
  description?: string | null;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;
  minOrderAmount?: number | null;
  maxDiscount?: number | null;
  validUntil?: string | null;
  usageLimit?: number | null;
  usedCount: number;
  perUserLimit: number;
  isActive: boolean;
  _count?: { usages: number };
};

type CouponForm = {
  code: string;
  description: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: string;
  minOrderAmount: string;
  maxDiscount: string;
  validUntil: string;
  usageLimit: string;
  perUserLimit: string;
  isActive: boolean;
};

const emptyForm: CouponForm = {
  code: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  minOrderAmount: "",
  maxDiscount: "",
  validUntil: "",
  usageLimit: "",
  perUserLimit: "1",
  isActive: true,
};

export function AdminCouponsClient() {
  const { isAuthenticated, user } = useAuthStore();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // coupon id or "new"
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isAdmin = isAuthenticated && (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN");

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminAPI.getCoupons();
      setCoupons(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load coupons. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchCoupons();
  }, [isAdmin, fetchCoupons]);

  const startAdd = () => {
    setForm(emptyForm);
    setFormError(null);
    setEditing("new");
  };

  const startEdit = (coupon: AdminCoupon) => {
    setForm({
      code: coupon.code,
      description: coupon.description ?? "",
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      minOrderAmount: coupon.minOrderAmount != null ? String(coupon.minOrderAmount) : "",
      maxDiscount: coupon.maxDiscount != null ? String(coupon.maxDiscount) : "",
      validUntil: coupon.validUntil ? coupon.validUntil.slice(0, 10) : "",
      usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : "",
      perUserLimit: String(coupon.perUserLimit),
      isActive: coupon.isActive,
    });
    setFormError(null);
    setEditing(coupon.id);
  };

  const save = async () => {
    if (!form.code.trim() || !form.discountValue) {
      setFormError("Code and discount value are required");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description || undefined,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderAmount: form.minOrderAmount === "" ? null : Number(form.minOrderAmount),
      maxDiscount: form.maxDiscount === "" ? null : Number(form.maxDiscount),
      validUntil: form.validUntil || null,
      usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
      perUserLimit: Number(form.perUserLimit) || 1,
      isActive: form.isActive,
    };
    try {
      if (editing === "new") {
        await adminAPI.createCoupon(payload);
      } else if (editing) {
        await adminAPI.updateCoupon(editing, payload);
      }
      setEditing(null);
      await fetchCoupons();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not save coupon";
      setFormError(Array.isArray(message) ? message[0] : message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: AdminCoupon) => {
    try {
      await adminAPI.updateCoupon(coupon.id, { isActive: !coupon.isActive });
      await fetchCoupons();
    } catch {
      alert("Could not update coupon status");
    }
  };

  const remove = async (coupon: AdminCoupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}? Its usage history will be removed.`)) return;
    try {
      await adminAPI.deleteCoupon(coupon.id);
      await fetchCoupons();
    } catch {
      alert("Could not delete coupon");
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

  const inputClass = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-ikonnic-red";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-950"><BadgePercent size={24} /> Coupons</h1>
          <p className="mt-1 text-sm text-slate-500">Create, edit, and track discount codes.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-xs font-black text-ikonnic-red hover:underline">← Admin Console</Link>
          {editing === null && (
            <button type="button" onClick={startAdd} className="inline-flex items-center gap-1.5 rounded-full bg-ikonnic-red px-4 py-2.5 text-xs font-black text-white hover:bg-red-700">
              <Plus size={14} /> New Coupon
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      {editing !== null && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-slate-950">{editing === "new" ? "Create coupon" : `Edit ${form.code}`}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-bold text-slate-600">Code*
              <input value={form.code} disabled={editing !== "new"} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" className={`${inputClass} uppercase disabled:bg-slate-50 disabled:text-slate-400`} />
            </label>
            <label className="text-xs font-bold text-slate-600">Type*
              <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as CouponForm["discountType"] })} className={`${inputClass} bg-white`}>
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FLAT">Flat (₹)</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">{form.discountType === "PERCENTAGE" ? "Discount %*" : "Discount ₹*"}
              <input type="number" min={0} value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} className={inputClass} />
            </label>
            <label className="text-xs font-bold text-slate-600">Min order ₹
              <input type="number" min={0} value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} placeholder="No minimum" className={inputClass} />
            </label>
            <label className="text-xs font-bold text-slate-600">Max discount ₹
              <input type="number" min={0} value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} placeholder="Uncapped" className={inputClass} />
            </label>
            <label className="text-xs font-bold text-slate-600">Valid until
              <input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className={inputClass} />
            </label>
            <label className="text-xs font-bold text-slate-600">Total usage limit
              <input type="number" min={0} value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="Unlimited" className={inputClass} />
            </label>
            <label className="text-xs font-bold text-slate-600">Per-user limit
              <input type="number" min={1} value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} className={inputClass} />
            </label>
            <label className="text-xs font-bold text-slate-600 sm:col-span-2 lg:col-span-1">Description
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="10% off for new customers" className={inputClass} />
            </label>
          </div>
          <label className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-600">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-ikonnic-red" />
            Active
          </label>
          {formError && <p className="mt-3 text-xs font-bold text-red-600">{formError}</p>}
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={saving} onClick={save} className="inline-flex items-center gap-1.5 rounded-full bg-ikonnic-red px-5 py-2.5 text-xs font-black text-white hover:bg-red-700 disabled:opacity-60">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {editing === "new" ? "Create" : "Save changes"}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-5 py-2.5 text-xs font-black text-slate-600">
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : coupons.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No coupons yet. Create your first discount code.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-black uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Conditions</th>
                <th className="px-4 py-3 text-right">Used</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => {
                const expired = coupon.validUntil ? new Date(coupon.validUntil) < new Date() : false;
                return (
                  <tr key={coupon.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="font-black text-slate-900">{coupon.code}</p>
                      {coupon.description && <p className="text-[11px] text-slate-400">{coupon.description}</p>}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                      {coupon.maxDiscount != null && <span className="text-[11px] font-normal text-slate-400"> (max ₹{coupon.maxDiscount})</span>}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-500">
                      {coupon.minOrderAmount != null && <p>Min order ₹{coupon.minOrderAmount}</p>}
                      {coupon.validUntil && <p className={expired ? "text-red-600 font-bold" : ""}>{expired ? "Expired" : "Until"} {new Date(coupon.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>}
                      {coupon.minOrderAmount == null && !coupon.validUntil && "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">
                      {coupon.usedCount}{coupon.usageLimit != null ? ` / ${coupon.usageLimit}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => toggleActive(coupon)} className={`rounded-full px-2.5 py-1 text-[11px] font-black ${coupon.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {coupon.isActive ? "ACTIVE" : "INACTIVE"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => startEdit(coupon)} aria-label="Edit coupon" className="grid size-8 place-items-center rounded-full border border-slate-200 text-slate-500 hover:border-ikonnic-red hover:text-ikonnic-red"><Pencil size={13} /></button>
                        <button type="button" onClick={() => remove(coupon)} aria-label="Delete coupon" className="grid size-8 place-items-center rounded-full border border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
