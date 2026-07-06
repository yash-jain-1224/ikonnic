"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ADMIN_NAV, ADMIN_SECONDARY_NAV, isAdminNavActive, type AdminNavItem } from "./nav";

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();

  const renderItem = (item: AdminNavItem) => {
    const active = isAdminNavActive(pathname, item.href);
    return (
      <li key={item.label}>
        <Link
          href={item.href}
          className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          } ${!item.live ? "opacity-50 pointer-events-none" : ""} ${collapsed ? "justify-center px-0" : ""}`}
          title={collapsed ? item.label : undefined}
        >
          <item.icon size={18} strokeWidth={2} className="shrink-0" />
          {!collapsed && <span>{item.label}</span>}
          {!collapsed && !item.live && (
            <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">SOON</span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-200 ${
        collapsed ? "w-[68px]" : "w-[260px]"
      }`}
    >
      {/* Brand */}
      <div className="flex h-[56px] items-center border-b border-slate-100 px-4">
        {!collapsed ? (
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 items-center gap-1 rounded-[3px] bg-slate-900 px-2 text-[15px] font-black tracking-tight text-white">
              IKONNIC
              <span className="grid size-5 place-items-center rounded-[2px] bg-ikonnic-red text-white text-[10px]">✦</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Admin</span>
          </Link>
        ) : (
          <Link href="/admin/dashboard" className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-black text-white">
            IK
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">{ADMIN_NAV.map(renderItem)}</ul>
        <div className="my-3 border-t border-slate-100" />
        <ul className="space-y-0.5">{ADMIN_SECONDARY_NAV.map(renderItem)}</ul>
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
