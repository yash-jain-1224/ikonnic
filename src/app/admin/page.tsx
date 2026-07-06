import type { Metadata } from "next";
import Link from "next/link";
import { BadgePercent, Boxes, ClipboardList, Factory, FolderTree, Images, LayoutDashboard, LineChart, Package, Star, Ticket, Truck, Users } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";

export const metadata: Metadata = { title: "Admin Console | Ikonnic" };

const modules = [
  { title: "Dashboard", Icon: LayoutDashboard, href: "/admin/dashboard", body: "Orders, revenue, AOV, failed payments, top products, support, and production queue.", live: true },
  { title: "Products", Icon: Package, href: "/admin/products", body: "Create, edit, and delete products with images, galleries, pricing, stock, tags, and variants.", live: true },
  { title: "Categories", Icon: FolderTree, href: "/admin/categories", body: "Create, edit, and delete categories — images, accent colours, featured flag, and visibility.", live: true },
  { title: "Orders", Icon: ClipboardList, href: "/admin/orders", body: "Full order detail: customisation JSON, uploaded artwork, preview, status updates, timeline, internal notes, shipment.", live: true },
  { title: "Inventory", Icon: Boxes, href: "/admin/inventory", body: "Stock levels, reservations, low-stock alerts, manual adjustments, and full transaction audit trail.", live: true },
  { title: "Analytics", Icon: LineChart, href: "/admin/analytics", body: "Daily revenue trend, order status funnel, new customers, AOV, and top-selling products.", live: true },
  { title: "Coupons", Icon: BadgePercent, href: "/admin/coupons", body: "Create and manage discount codes — percentage or flat, usage limits, expiry, and redemption tracking.", live: true },
  { title: "Templates", Icon: Images, href: "#", body: "Printable area, safe zone, bleed, crop zone, masks, text zones, fonts, colours, and preview JSON.", live: false },
  { title: "Production", Icon: Factory, href: "#", body: "Image approval, background removal, printing, quality check, packing, dispatch, and damage queues.", live: false },
  { title: "Shipping", Icon: Truck, href: "#", body: "Pincode serviceability, courier assignment, AWB, tracking sync, failed delivery, return and replacement.", live: false },
  { title: "Customers", Icon: Users, href: "/admin/customers", body: "Customer profiles, order history, lifetime value, addresses, and account activate/deactivate.", live: true },
  { title: "Reviews", Icon: Star, href: "/admin/reviews", body: "Approve or hide reviews, verified-purchase badges, photo reviews, and public admin replies.", live: true },
  { title: "Support", Icon: Ticket, href: "#", body: "Contact tickets, WhatsApp support, refunds, damaged item claims, delays, replacements and internal notes.", live: false },
];

export default function AdminPage() {
  return (
    <PageContainer className="py-10 sm:py-14">
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-ikonnic-red">Admin Console</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Ikonnic Admin</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Manage products, orders, customers, and operations from one place.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map(({ title, Icon, href, body, live }) => (
          <Link key={title} href={href} className={`group rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-sm transition ${live ? "border-slate-200 hover:-translate-y-1 hover:shadow-card" : "border-dashed border-rosegold-200 opacity-60"}`}>
            <div className="flex items-center gap-2">
              <div className="grid size-10 place-items-center rounded-xl bg-red-50 text-ikonnic-red"><Icon size={20} /></div>
              {live && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">LIVE</span>}
            </div>
            <h2 className="mt-4 font-black text-slate-950 group-hover:text-ikonnic-red">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
