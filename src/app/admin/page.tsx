import type { Metadata } from "next";
import { ClipboardList, Factory, Images, LayoutDashboard, Package, Star, Ticket, Truck, Users } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";

export const metadata: Metadata = { title: "Admin Architecture" };

const modules = [
  ["Dashboard", LayoutDashboard, "Orders, revenue, AOV, failed payments, top products, support, and production queue."],
  ["Products", Package, "Products, categories, variants, galleries, templates, price rules, SEO, FAQ, and related products."],
  ["Templates", Images, "Printable area, safe zone, bleed, crop zone, masks, text zones, fonts, colours, and preview JSON."],
  ["Orders", ClipboardList, "Customisation JSON, uploaded image refs, preview image, status updates, notes, invoice, refund, reprint."],
  ["Production", Factory, "Image approval, background removal, printing, quality check, packing, dispatch, and damage queues."],
  ["Shipping", Truck, "Pincode serviceability, courier assignment, AWB, tracking sync, failed delivery, return and replacement."],
  ["Customers", Users, "Profiles, addresses, order history, reviews, refunds, wishlist, abandoned carts, consent and data requests."],
  ["Reviews", Star, "Moderation, verified purchase badge, media placeholders, admin replies, abuse handling and coupon rewards."],
  ["Support", Ticket, "Contact tickets, WhatsApp support, refunds, damaged item claims, delays, replacements and internal notes."],
] as const;

export default function AdminPage() {
  return (
    <PageContainer className="py-10 sm:py-14">
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-giftora-red">Inferred admin architecture</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Giftora Admin Console</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Admin panels are private and not publicly exposed. This route documents the operational modules Giftora needs and can later be protected by real admin auth.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map(([title, Icon, body]) => (
          <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid size-10 place-items-center rounded-xl bg-red-50 text-giftora-red"><Icon size={20} /></div>
            <h2 className="mt-4 font-black text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
          </article>
        ))}
      </div>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="font-black text-slate-950">Order workflow</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {["View order", "View customisation JSON", "View uploaded image", "View preview image", "Update status", "Assign production hub", "Internal notes", "Customer notes", "Refund/cancel/reprint", "Invoice placeholder"].map((item) => (
            <span key={item} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">{item}</span>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
