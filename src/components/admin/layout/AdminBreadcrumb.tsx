"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const labelMap: Record<string, string> = {
  admin: "Admin",
  dashboard: "Dashboard",
  orders: "Orders",
  products: "Products",
  categories: "Categories",
  inventory: "Inventory",
  customers: "Customers",
  analytics: "Analytics",
  coupons: "Coupons",
  reviews: "Reviews",
  production: "Production",
  templates: "Templates",
  settings: "Settings",
};

export function AdminBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Don't show breadcrumb on the main dashboard
  if (segments.length <= 2 && segments[1] === "dashboard") return null;

  const crumbs = segments.map((segment, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = i === segments.length - 1;
    return { label, href, isLast };
  });

  return (
    <nav className="mb-4 flex items-center gap-1 text-[12px] text-slate-500" aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={12} className="text-slate-300" />}
          {crumb.isLast ? (
            <span className="font-medium text-slate-900">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-slate-900 transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
