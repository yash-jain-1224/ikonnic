"use client";

import { useEffect, useState, useCallback } from "react";
import { api, uploadAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Plus, Pencil, Trash2, Loader2, Search, Image as ImageIcon, X, Save } from "lucide-react";
import Link from "next/link";

type AdminProduct = {
  id: string;
  slug: string;
  title: string;
  categoryName?: string;
  categorySlug?: string;
  price: number;
  oldPrice?: number;
  image: string;
  stockStatus: string;
  stockCount: number | null;
  sale: boolean;
  featured: boolean;
  createdAt: string;
};

type ProductForm = {
  title: string;
  slug: string;
  categorySlug: string;
  price: number;
  oldPrice?: number;
  description: string;
  longDescription?: string;
  image: string;
  gallery: string[];
  stockStatus: string;
  stockCount: number | null;
  sale: boolean;
  featured: boolean;
  filterTags: string[];
  sizeOptions: { label: string; value: string; priceDelta?: number }[];
  thicknessOptions: { label: string; value: string; priceDelta?: number }[];
};

const emptyForm: ProductForm = {
  title: "",
  slug: "",
  categorySlug: "",
  price: 0,
  oldPrice: undefined,
  description: "",
  longDescription: "",
  image: "",
  gallery: [],
  stockStatus: "IN_STOCK",
  stockCount: null,
  sale: false,
  featured: false,
  filterTags: [],
  sizeOptions: [],
  thicknessOptions: [],
};

export function AdminProductsClient() {
  const { isAuthenticated, user } = useAuthStore();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<string | null>(null); // product id or "new"
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = isAuthenticated && (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/products", { params: { page, limit: 20, search: search || undefined } });
      setProducts(data.products || data.data || []);
      setTotal(data.total || data.meta?.total || 0);
    } catch {
      // Fallback: try public products endpoint
      try {
        const { data } = await api.get("/products", { params: { page, limit: 20, search: search || undefined } });
        setProducts(data.products || data.data || []);
        setTotal(data.total || data.meta?.total || 0);
      } catch {
        setError("Failed to load products");
      }
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (isAdmin) fetchProducts();
  }, [isAdmin, fetchProducts]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditing("new");
    setError(null);
  };

  const openEdit = async (product: AdminProduct) => {
    setEditing(product.id);
    setError(null);
    try {
      const { data } = await api.get(`/admin/products/${product.id}`);
      setForm({
        title: data.title || "",
        slug: data.slug || "",
        categorySlug: data.categorySlug || "",
        price: data.price || 0,
        oldPrice: data.oldPrice || undefined,
        description: data.description || "",
        longDescription: data.longDescription || "",
        image: data.image || "",
        gallery: data.gallery || [],
        stockStatus: data.stockStatus || "IN_STOCK",
        stockCount: data.stockCount ?? null,
        sale: data.sale || false,
        featured: data.featured || false,
        filterTags: data.filterTags || [],
        sizeOptions: data.sizeOptions || [],
        thicknessOptions: data.thicknessOptions || [],
      });
    } catch {
      // Use local data
      setForm({
        ...emptyForm,
        title: product.title,
        slug: product.slug,
        price: product.price,
        image: product.image,
        stockStatus: product.stockStatus,
        stockCount: product.stockCount,
        sale: product.sale,
        featured: product.featured,
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await uploadAPI.uploadImage(file, "products");
      setForm((prev) => ({ ...prev, image: data.url }));
    } catch {
      setError("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const { data } = await uploadAPI.uploadImages(files, "products");
      setForm((prev) => ({ ...prev, gallery: [...prev.gallery, ...(data.urls || [])] }));
    } catch {
      setError("Gallery upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing === "new") {
        await api.post("/admin/products", form);
      } else {
        await api.put(`/admin/products/${editing}`, form);
      }
      setEditing(null);
      fetchProducts();
    } catch (err: any) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await api.delete(`/admin/products/${id}`);
      fetchProducts();
    } catch {
      setError("Delete failed");
    }
  };

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="font-black text-red-800">Access Denied</p>
        <p className="mt-2 text-sm text-red-600">Admin credentials required.</p>
        <Link href="/login" className="mt-4 inline-block rounded-full bg-ikonnic-red px-5 py-2 text-sm font-bold text-white">Login</Link>
      </div>
    );
  }

  // ─── Product Form Modal ─────────────────────────────────
  if (editing) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-950">{editing === "new" ? "Create Product" : "Edit Product"}</h1>
          <button onClick={() => setEditing(null)} className="rounded-full p-2 hover:bg-rosegold-100">
            <X size={20} />
          </button>
        </div>

        {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}

        <div className="space-y-6 rounded-2xl border border-rosegold-200/60 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">
              Title *
              <input
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((prev) => ({ ...prev, title, slug: editing === "new" ? generateSlug(title) : prev.slug }));
                }}
                className="mt-1 w-full rounded-xl border border-rosegold-200 px-4 py-3 text-sm outline-none focus:border-ikonnic-red"
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Slug
              <input
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-rosegold-200 px-4 py-3 text-sm outline-none focus:border-ikonnic-red"
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Category Slug *
              <input
                value={form.categorySlug}
                onChange={(e) => setForm((prev) => ({ ...prev, categorySlug: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-rosegold-200 px-4 py-3 text-sm outline-none focus:border-ikonnic-red"
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Price (₹) *
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                className="mt-1 w-full rounded-xl border border-rosegold-200 px-4 py-3 text-sm outline-none focus:border-ikonnic-red"
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Old Price (₹)
              <input
                type="number"
                value={form.oldPrice ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, oldPrice: parseFloat(e.target.value) || undefined }))}
                className="mt-1 w-full rounded-xl border border-rosegold-200 px-4 py-3 text-sm outline-none focus:border-ikonnic-red"
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Stock Status
              <select
                value={form.stockStatus}
                onChange={(e) => setForm((prev) => ({ ...prev, stockStatus: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-rosegold-200/60 bg-white px-4 py-3 text-sm outline-none focus:border-ikonnic-red"
              >
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
                <option value="MADE_TO_ORDER">Made to Order</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">
              Stock Count
              <input
                type="number"
                value={form.stockCount ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, stockCount: e.target.value ? parseInt(e.target.value) : null }))}
                className="mt-1 w-full rounded-xl border border-rosegold-200 px-4 py-3 text-sm outline-none focus:border-ikonnic-red"
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Tags (comma-separated)
              <input
                value={form.filterTags.join(", ")}
                onChange={(e) => setForm((prev) => ({ ...prev, filterTags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) }))}
                className="mt-1 w-full rounded-xl border border-rosegold-200 px-4 py-3 text-sm outline-none focus:border-ikonnic-red"
              />
            </label>
          </div>

          <label className="block text-xs font-bold text-slate-600">
            Description *
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-rosegold-200 px-4 py-3 text-sm outline-none focus:border-ikonnic-red"
            />
          </label>

          <label className="block text-xs font-bold text-slate-600">
            Long Description
            <textarea
              rows={5}
              value={form.longDescription || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, longDescription: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-rosegold-200 px-4 py-3 text-sm outline-none focus:border-ikonnic-red"
            />
          </label>

          {/* Image Upload */}
          <div>
            <p className="text-xs font-bold text-slate-600">Main Image</p>
            <div className="mt-2 flex items-center gap-4">
              {form.image && (
                <img src={form.image} alt="Product" className="h-20 w-20 rounded-xl object-cover" />
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-xs font-bold text-slate-600 hover:border-ikonnic-red">
                <ImageIcon size={16} />
                {uploading ? "Uploading..." : "Upload Image"}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Gallery Upload */}
          <div>
            <p className="text-xs font-bold text-slate-600">Gallery</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {form.gallery.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, gallery: prev.gallery.filter((_, idx) => idx !== i) }))}
                    className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-red-500 text-white"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <label className="grid h-16 w-16 cursor-pointer place-items-center rounded-lg border border-dashed border-slate-300 hover:border-ikonnic-red">
                <Plus size={16} className="text-slate-400" />
                <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={form.sale} onChange={(e) => setForm((prev) => ({ ...prev, sale: e.target.checked }))} className="accent-ikonnic-red" />
              On Sale
            </label>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm((prev) => ({ ...prev, featured: e.target.checked }))} className="accent-ikonnic-red" />
              Featured
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-rosegold-200/40 pt-4">
            <button
              onClick={handleSave}
              disabled={saving || !form.title || !form.price}
              className="inline-flex items-center gap-2 rounded-full bg-ikonnic-red px-6 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving..." : editing === "new" ? "Create Product" : "Update Product"}
            </button>
            <button onClick={() => setEditing(null)} className="rounded-full border border-rosegold-200 px-6 py-3 text-sm font-bold">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Product List ──────────────────────────────────────────
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-slate-950">Products</h1>
        <div className="flex gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search products..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-ikonnic-red"
            />
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-full bg-ikonnic-red px-5 py-2.5 text-sm font-black text-white hover:bg-red-700">
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-ikonnic-red" size={32} /></div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-rosegold-200/60 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-rosegold-200/40 bg-rosegold-50">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-600">Product</th>
                  <th className="px-4 py-3 font-bold text-slate-600">Category</th>
                  <th className="px-4 py-3 font-bold text-slate-600">Price</th>
                  <th className="px-4 py-3 font-bold text-slate-600">Stock</th>
                  <th className="px-4 py-3 font-bold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-rosegold-100">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={product.image || "/images/placeholder.webp"} alt="" className="size-10 rounded-lg object-cover" />
                        <div>
                          <p className="font-bold text-slate-900">{product.title}</p>
                          <p className="text-xs text-slate-500">{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{product.categoryName || product.categorySlug || "—"}</td>
                    <td className="px-4 py-3 font-bold">
                      ₹{product.price.toLocaleString("en-IN")}
                      {product.oldPrice && <span className="ml-1 text-xs text-slate-400 line-through">₹{product.oldPrice.toLocaleString("en-IN")}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {product.stockCount !== null ? product.stockCount : "∞"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        product.stockStatus === "IN_STOCK" ? "bg-emerald-50 text-emerald-700" :
                        product.stockStatus === "LOW_STOCK" ? "bg-amber-50 text-amber-700" :
                        product.stockStatus === "OUT_OF_STOCK" ? "bg-red-50 text-red-700" :
                        "bg-blue-50 text-blue-700"
                      }`}>
                        {product.stockStatus?.replace(/_/g, " ") || "—"}
                      </span>
                      {product.featured && <span className="ml-1 text-[11px] font-bold text-purple-600">★</span>}
                      {product.sale && <span className="ml-1 text-[11px] font-bold text-ikonnic-red">SALE</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => openEdit(product)} className="rounded-lg p-2 hover:bg-rosegold-100" title="Edit">
                          <Pencil size={15} className="text-slate-600" />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="rounded-lg p-2 hover:bg-red-50" title="Delete">
                          <Trash2 size={15} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">Showing {products.length} of {total} products</p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border px-3 py-1.5 text-sm font-bold disabled:opacity-40">Prev</button>
                <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)} className="rounded-lg border px-3 py-1.5 text-sm font-bold disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
