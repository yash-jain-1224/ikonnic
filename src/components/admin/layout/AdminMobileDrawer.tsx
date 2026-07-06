"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Boxes,
  Users,
  LineChart,
  BadgePercent,
  Factory,
  Images,
  Settings,
  ScrollText,
  Star,
  Truck,
  Ticket,
  X,
} from "lucide-react";
import { useEffect } from "react";

type NavItem = {
  label: string;
  href: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  live?: boolean;
};

const navigation: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, live: true },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart, live: true },
  { label: "Products", href: "/admin/products", icon: Package, live: true },
  { label: "Categories", href: "/admin/categories", icon: FolderTree, live: true },
  { label: "Inventory", href: "/admin/inventory", icon: Boxes, live: true },
  { label: "Customers", href: "/admin/customers", icon: Users, live: true },
  { label: "Analytics", href: "/admin/analytics", icon: LineChart, live: true },
  { label: "Coupons", href: "/admin/coupons", icon: BadgePercent, live: true },
  { label: "Reviews", href: "/admin/reviews", icon: Star, live: true },
  { label: "Production", href: "#", icon: Factory, live: false },
  { label: "Templates", href: "#", icon: Images, live: false },
  { label: "Shipping", href: "#", icon: Truck, live: false },
  { label: "Support", href: "#", icon: Ticket, live: false },
  { label: "Settings", href: "#", icon: Settings, live: false },
  { label: "Audit Logs", href: "#", icon: ScrollText, live: false },
];

interface AdminMobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AdminMobileDrawer({ open, onClose }: AdminMobileDrawerProps) {
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") return pathname === "/admin" || pathname === "/admin/dashboard";
    return pathname.startsWith(href) && href !== "#";
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 w-[280px] bg-white shadow-2xl animate-slide-in-from-left">
        {/* Header */}
        <div className="flex h-[56px] items-center justify-between border-b border-slate-100 px-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2" onClick={onClose}>
            <div className="flex h-7 items-center gap-1 rounded-[3px] bg-slate-900 px-2 text-[14px] font-black tracking-tight text-white">
              IKONNIC
              <span className="grid size-4 place-items-center rounded-[2px] bg-ikonnic-red text-white text-[9px]">✦</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Admin</span>
          </Link>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="overflow-y-auto px-3 py-3" style={{ maxHeight: "calc(100vh - 56px)" }}>
          <ul className="space-y-0.5">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    } ${!item.live ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <item.icon size={18} strokeWidth={2} className="shrink-0" />
                    <span>{item.label}</span>
                    {!item.live && (
                      <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">SOON</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
