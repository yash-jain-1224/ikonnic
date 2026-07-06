"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { usersAPI } from "@/lib/api";

export type SavedAddress = {
  id: string;
  type?: string;
  fullName: string;
  phone: string;
  streetLine1: string;
  streetLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  landmark?: string | null;
  isDefault?: boolean;
};

type AddressForm = {
  fullName: string;
  phone: string;
  streetLine1: string;
  streetLine2: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
  isDefault: boolean;
};

const emptyForm: AddressForm = {
  fullName: "",
  phone: "",
  streetLine1: "",
  streetLine2: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
  isDefault: false,
};

export function formatAddress(addr: SavedAddress) {
  return [addr.streetLine1, addr.streetLine2, addr.city, `${addr.state} ${addr.pincode}`]
    .filter(Boolean)
    .join(", ");
}

export function AddressBook() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null); // address id or "new"
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAddresses = useCallback(async () => {
    try {
      const { data } = await usersAPI.getAddresses();
      setAddresses(Array.isArray(data) ? data : []);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const startAdd = () => {
    setForm(emptyForm);
    setError(null);
    setEditing("new");
  };

  const startEdit = (addr: SavedAddress) => {
    setForm({
      fullName: addr.fullName ?? "",
      phone: addr.phone ?? "",
      streetLine1: addr.streetLine1 ?? "",
      streetLine2: addr.streetLine2 ?? "",
      city: addr.city ?? "",
      state: addr.state ?? "",
      pincode: addr.pincode ?? "",
      landmark: addr.landmark ?? "",
      isDefault: addr.isDefault ?? false,
    });
    setError(null);
    setEditing(addr.id);
  };

  const save = async () => {
    if (!form.fullName || !form.phone || !form.streetLine1 || !form.city || !form.state || !/^\d{6}$/.test(form.pincode)) {
      setError("Please fill all required fields (6-digit pincode)");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      type: "BOTH",
      fullName: form.fullName,
      phone: form.phone,
      streetLine1: form.streetLine1,
      streetLine2: form.streetLine2 || undefined,
      city: form.city,
      state: form.state,
      pincode: form.pincode,
      country: "India",
      landmark: form.landmark || undefined,
      isDefault: form.isDefault,
    };
    try {
      if (editing === "new") {
        await usersAPI.addAddress(payload);
      } else if (editing) {
        await usersAPI.updateAddress(editing, payload);
      }
      setEditing(null);
      await fetchAddresses();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not save address";
      setError(Array.isArray(message) ? message[0] : message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (addr: SavedAddress) => {
    if (!window.confirm(`Delete address "${formatAddress(addr)}"?`)) return;
    try {
      await usersAPI.deleteAddress(addr.id);
      await fetchAddresses();
    } catch {
      alert("Could not delete address");
    }
  };

  const inputClass = "mt-1 w-full rounded-lg border border-rosegold-200 px-3 py-2 text-xs outline-none focus:border-ikonnic-red";

  return (
    <div className="rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-black text-slate-950"><MapPin size={16} /> Addresses</h3>
        {editing === null && (
          <button type="button" onClick={startAdd} className="inline-flex items-center gap-1 rounded-full border border-rosegold-200 px-2.5 py-1.5 text-[11px] font-black text-slate-600 hover:border-ikonnic-red hover:text-ikonnic-red">
            <Plus size={12} /> Add
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-3 space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-rosegold-100" />)}
        </div>
      ) : editing !== null ? (
        <div className="mt-3 space-y-2">
          <label className="block text-[11px] font-bold text-slate-600">Full name*<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputClass} /></label>
          <label className="block text-[11px] font-bold text-slate-600">Phone*<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} /></label>
          <label className="block text-[11px] font-bold text-slate-600">Street address*<input value={form.streetLine1} onChange={(e) => setForm({ ...form, streetLine1: e.target.value })} className={inputClass} /></label>
          <label className="block text-[11px] font-bold text-slate-600">Apartment / floor<input value={form.streetLine2} onChange={(e) => setForm({ ...form, streetLine2: e.target.value })} className={inputClass} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-bold text-slate-600">City*<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} /></label>
            <label className="block text-[11px] font-bold text-slate-600">State*<input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputClass} /></label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-bold text-slate-600">Pincode*<input value={form.pincode} inputMode="numeric" onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} className={inputClass} /></label>
            <label className="block text-[11px] font-bold text-slate-600">Landmark<input value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} className={inputClass} /></label>
          </div>
          <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="accent-ikonnic-red" />
            Set as default address
          </label>
          {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" disabled={saving} onClick={save} className="flex-1 rounded-full bg-ikonnic-red px-3 py-2 text-[11px] font-black text-white hover:bg-red-700 disabled:opacity-60">
              {saving ? <Loader2 size={12} className="mx-auto animate-spin" /> : editing === "new" ? "Save address" : "Update address"}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-rosegold-200 px-3 py-2 text-[11px] font-black text-slate-600"><X size={12} /></button>
          </div>
        </div>
      ) : addresses.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">No saved addresses yet. Add one for faster checkout.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {addresses.map((addr) => (
            <div key={addr.id} className="rounded-lg border border-rosegold-200/40 p-2.5 text-xs text-slate-600">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800">
                    {addr.fullName}
                    {addr.isDefault && <span className="ml-1.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-black text-ikonnic-red">DEFAULT</span>}
                  </p>
                  <p className="mt-0.5">{formatAddress(addr)}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">📱 {addr.phone}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => startEdit(addr)} aria-label="Edit address" className="grid size-7 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:border-ikonnic-red hover:text-ikonnic-red"><Pencil size={12} /></button>
                  <button type="button" onClick={() => remove(addr)} aria-label="Delete address" className="grid size-7 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
