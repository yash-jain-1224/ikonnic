"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminAPI, uploadAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { FolderTree, Image as ImageIcon, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";

type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  accent?: string | null;
  featured: boolean;
  isActive: boolean;
  _count?: { products: number };
};

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  image: string;
  accent: string;
  featured: boolean;
  isActive: boolean;
};

const emptyForm: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  image: "",
  accent: "#e11d48",
  featured: false,
  isActive: true,
};

const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function AdminCategoriesClient() {
  const { isAuthenticated, user } = useAuthStore();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // id or "new"
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isAdmin = isAuthenticated && (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN");

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminAPI.getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load categories. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchCategories();
  }, [isAdmin, fetchCategories]);

  const startAdd = () => {
    setForm(emptyForm);
    setFormError(null);
    setEditing("new");
  };

  const startEdit = (c: AdminCategory) => {
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      image: c.image ?? "",
      accent: c.accent ?? "#e11d48",
      featured: c.featured,
      isActive: c.isActive,
    });
    setFormError(null);
    setEditing(c.id);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await uploadAPI.uploadImage(file, "categories");
      setForm((prev) => ({ ...prev, image: data.url }));
    } catch {
      setFormError("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      description: form.description || undefined,
      image: form.image || undefined,
      accent: form.accent || undefined,
      featured: form.featured,
      isActive: form.isActive,
    };
    try {
      if (editing === "new") {
        await adminAPI.createCategory(payload);
      } else if (editing) {
        // slug is immutable on edit to avoid breaking storefront URLs
        const { slug, ...rest } = payload;
        await adminAPI.updateCategory(editing, rest);
      }
      setEditing(null);
      await fetchCategories();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not save category";
      setFormError(Array.isArray(message) ? message[0] : message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: AdminCategory) => {
    try {
      await adminAPI.updateCategory(c.id, { isActive: !c.isActive });
      await fetchCategories();
    } catch {
      alert("Could not update category status");
    }
  };

  const remove = async (c: AdminCategory) => {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try {
      await adminAPI.deleteCategory(c.id);
      await fetchCategories();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not delete category";
      alert(Array.isArray(message) ? message[0] : message);
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

  const inputClass = "mt-1 w-full rounded-lg border border-rosegold-200 px-3 py-2 text-sm outline-none focus:border-ikonnic-red";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-950"><FolderTree size={24} /> Categories</h1>
          <p className="mt-1 text-sm text-slate-500">{categories.length} categories. Create, edit, and manage visibility.</p>
        </div>
        <div className="flex items-center gap-3">
          {editing === null && (
            <button type="button" onClick={startAdd} className="inline-flex items-center gap-1.5 rounded-full bg-ikonnic-red px-4 py-2.5 text-xs font-black text-white hover:bg-red-700">
              <Plus size={14} /> New Category
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      {editing !== null && (
        <div className="mb-6 rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-sm">
          <h2 className="font-black text-slate-950">{editing === "new" ? "Create category" : `Edit ${form.name}`}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">Name*
              <input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((prev) => ({ ...prev, name, slug: editing === "new" ? slugify(name) : prev.slug }));
                }}
                className={inputClass}
              />
            </label>
            <label className="text-xs font-bold text-slate-600">Slug{editing !== "new" && " (locked)"}
              <input value={form.slug} disabled={editing !== "new"} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={`${inputClass} disabled:bg-rosegold-50 disabled:text-slate-400`} />
            </label>
            <label className="text-xs font-bold text-slate-600 sm:col-span-2">Description
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
            </label>
            <label className="text-xs font-bold text-slate-600">Accent colour
              <input type="color" value={form.accent} onChange={(e) => setForm({ ...form, accent: e.target.value })} className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-rosegold-200" />
            </label>
            <div className="text-xs font-bold text-slate-600">
              Image
              <div className="mt-1 flex items-center gap-3">
                {form.image && <img src={form.image} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:border-ikonnic-red">
                  <ImageIcon size={14} />
                  {uploading ? "Uploading..." : "Upload"}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="accent-ikonnic-red" />
              Featured on homepage
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-ikonnic-red" />
              Active (visible)
            </label>
          </div>
          {formError && <p className="mt-3 text-xs font-bold text-red-600">{formError}</p>}
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={saving} onClick={save} className="inline-flex items-center gap-1.5 rounded-full bg-ikonnic-red px-5 py-2.5 text-xs font-black text-white hover:bg-red-700 disabled:opacity-60">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {editing === "new" ? "Create" : "Save changes"}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="inline-flex items-center gap-1.5 rounded-full border border-rosegold-200 px-5 py-2.5 text-xs font-black text-slate-600">
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-rosegold-100" />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-rosegold-200/60 bg-white p-10 text-center text-sm text-slate-500">
          No categories yet. Create your first category.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-rosegold-200/60 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-rosegold-200/40 text-[11px] font-black uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3 text-right">Products</th>
                <th className="px-4 py-3 text-center">Featured</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-rosegold-100/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {c.image
                        ? <img src={c.image} alt="" className="size-9 rounded-lg object-cover" />
                        : <span className="size-9 rounded-lg" style={{ backgroundColor: c.accent ?? "#e11d48" }} />}
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">{c.name}</p>
                        {c.description && <p className="truncate text-[11px] text-slate-400">{c.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-slate-500">{c.slug}</td>
                  <td className="px-4 py-3 text-right font-black text-slate-900">{c._count?.products ?? 0}</td>
                  <td className="px-4 py-3 text-center">{c.featured ? "★" : "—"}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => toggleActive(c)} className={`rounded-full px-2.5 py-1 text-[11px] font-black ${c.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rosegold-100 text-slate-500"}`}>
                      {c.isActive ? "ACTIVE" : "HIDDEN"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button type="button" onClick={() => startEdit(c)} aria-label="Edit category" className="grid size-8 place-items-center rounded-full border border-slate-200 text-slate-500 hover:border-ikonnic-red hover:text-ikonnic-red"><Pencil size={13} /></button>
                      <button type="button" onClick={() => remove(c)} aria-label="Delete category" className="grid size-8 place-items-center rounded-full border border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
