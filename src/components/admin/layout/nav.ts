import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Boxes,
  Users,
  LineChart,
  BadgePercent,
  Star,
  Factory,
  Images,
  Truck,
  Ticket,
  Settings,
  ScrollText,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  href: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  live?: boolean;
};

/** Primary admin navigation — single source of truth for sidebar + mobile drawer. */
export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, live: true },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart, live: true },
  { label: "Products", href: "/admin/products", icon: Package, live: true },
  { label: "Categories", href: "/admin/categories", icon: FolderTree, live: true },
  { label: "Inventory", href: "/admin/inventory", icon: Boxes, live: true },
  { label: "Customers", href: "/admin/customers", icon: Users, live: true },
  { label: "Reviews", href: "/admin/reviews", icon: Star, live: true },
  { label: "Analytics", href: "/admin/analytics", icon: LineChart, live: true },
  { label: "Coupons", href: "/admin/coupons", icon: BadgePercent, live: true },
  { label: "Production", href: "#", icon: Factory, live: false },
  { label: "Templates", href: "#", icon: Images, live: false },
  { label: "Shipping", href: "#", icon: Truck, live: false },
  { label: "Support", href: "#", icon: Ticket, live: false },
];

/** Secondary (footer) navigation. */
export const ADMIN_SECONDARY_NAV: AdminNavItem[] = [
  { label: "Settings", href: "#", icon: Settings, live: false },
  { label: "Audit Logs", href: "#", icon: ScrollText, live: false },
];

/** Shared active-route test used by both nav surfaces. */
export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === "#") return false;
  if (href === "/admin/dashboard") return pathname === "/admin" || pathname === "/admin/dashboard";
  return pathname.startsWith(href);
}
