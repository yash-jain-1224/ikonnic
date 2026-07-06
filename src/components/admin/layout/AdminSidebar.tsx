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
  ChevronLeft,
  ChevronRight,
  Star,
  Truck,
  Ticket,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

type NavItem = {
  label: string;
  href: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  live?: boolean;
  children?: { label: string; href: string }[];
};

const navigation: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, live: true },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart, live: true },
  {
    label: "Products",
    href: "/admin/products",
    icon: Package,
    live: true,
    children: [
      { label: "All Products", href: "/admin/products" },
      { label: "Reviews", href: "/admin/reviews" },
    ],
  },
  { label: "Categories", href: "/admin/categories", icon: FolderTree, live: true },
  { label: "Inventory", href: "/admin/inventory", icon: Boxes, live: true },
  { label: "Customers", href: "/admin/customers", icon: Users, live: true },
  { label: "Analytics", href: "/admin/analytics", icon: LineChart, live: true },
  { label: "Coupons", href: "/admin/coupons", icon: BadgePercent, live: true },
  { label: "Production", href: "#", icon: Factory, live: false },
  { label: "Templates", href: "#", icon: Images, live: false },
  { label: "Shipping", href: "#", icon: Truck, live: false },
  { label: "Support", href: "#", icon: Ticket, live: false },
];

const bottomNav: NavItem[] = [
  { label: "Settings", href: "#", icon: Settings, live: false },
  { label: "Audit Logs", href: "#", icon: ScrollText, live: false },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") return pathname === "/admin" || pathname === "/admin/dashboard";
    return pathname.startsWith(href) && href !== "#";
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-200 ${
        collapsed ? "w-[68px]" : "w-[260px]"
      }`}
    >
      {/* Brand */}
      <div className="flex h-[56px] items-center border-b border-slate-100 px-4">
        {!collapsed && (
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 items-center gap-1 rounded-[3px] bg-slate-900 px-2 text-[15px] font-black tracking-tight text-white">
              IKONNIC
              <span className="grid size-5 place-items-center rounded-[2px] bg-ikonnic-red text-white text-[10px]">✦</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Admin</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/admin/dashboard" className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-black text-white">
            IK
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">
          {navigation.map((item) => {
            const active = isActive(item.href);
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedMenus.includes(item.label);

            return (
              <li key={item.label}>
                {hasChildren && !collapsed ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.label)}
                      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      } ${!item.live ? "opacity-50" : ""}`}
                    >
                      <item.icon size={18} strokeWidth={2} className="shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isExpanded && (
                      <ul className="ml-5 mt-0.5 space-y-0.5 border-l border-slate-200 pl-4">
                        {item.children!.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={`block rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                                pathname === child.href
                                  ? "font-semibold text-slate-900"
                                  : "text-slate-500 hover:text-slate-900"
                              }`}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    } ${!item.live ? "opacity-50 pointer-events-none" : ""} ${collapsed ? "justify-center px-0" : ""}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon size={18} strokeWidth={2} className="shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && !item.live && (
                      <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">SOON</span>
                    )}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        {/* Divider */}
        <div className="my-3 border-t border-slate-100" />

        {/* Bottom nav */}
        <ul className="space-y-0.5">
          {bottomNav.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 ${
                  !item.live ? "opacity-50 pointer-events-none" : ""
                } ${collapsed ? "justify-center px-0" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={18} strokeWidth={2} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && !item.live && (
                  <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">SOON</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-slate-100 p-3">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
