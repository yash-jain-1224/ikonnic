"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Bell,
  Plus,
  Moon,
  Sun,
  Menu,
  ChevronDown,
  LogOut,
  User,
  Store,
  Package,
  BadgePercent,
  ShoppingCart,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";

interface AdminTopBarProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
}

export function AdminTopBar({ onMenuClick, sidebarCollapsed }: AdminTopBarProps) {
  const { user, logout } = useAuthStore();
  const [searchFocused, setSearchFocused] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) {
        setQuickActionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 flex h-[56px] items-center gap-4 border-b border-slate-200 bg-white/95 backdrop-blur-sm px-4 lg:px-6 transition-all ${
        sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-[260px]"
      }`}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="grid size-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className={`relative flex-1 max-w-md transition-all ${searchFocused ? "max-w-lg" : ""}`}>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search orders, products, customers…"
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline">
          ⌘K
        </kbd>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1">
        {/* Quick Actions */}
        <div className="relative" ref={quickRef}>
          <button
            onClick={() => setQuickActionsOpen(!quickActionsOpen)}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[13px] font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">New</span>
          </button>
          {quickActionsOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg animate-slide-in-from-top-1">
              <Link href="/admin/products?action=new" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setQuickActionsOpen(false)}>
                <Package size={15} className="text-slate-400" /> Add Product
              </Link>
              <Link href="/admin/coupons?action=new" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setQuickActionsOpen(false)}>
                <BadgePercent size={15} className="text-slate-400" /> Create Coupon
              </Link>
              <Link href="/admin/orders" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setQuickActionsOpen(false)}>
                <ShoppingCart size={15} className="text-slate-400" /> View Orders
              </Link>
            </div>
          )}
        </div>

        {/* Store Switcher (future) */}
        <button className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 md:flex" disabled>
          <Store size={15} className="text-slate-400" />
          <span className="max-w-[80px] truncate">Primary</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <button
          className="relative grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Notifications"
        >
          <Bell size={16} />
          <span className="absolute right-1 top-1 size-2 rounded-full bg-ikonnic-red" />
        </button>

        {/* Profile */}
        <div className="relative ml-1" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-50"
          >
            <div className="grid size-7 place-items-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
              {user?.firstName?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-[12px] font-semibold text-slate-900 leading-tight">
                {user?.firstName || "Admin"}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight">{user?.role || "ADMIN"}</p>
            </div>
            <ChevronDown size={12} className="hidden text-slate-400 md:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg animate-slide-in-from-top-1">
              <div className="border-b border-slate-100 px-3 py-2 mb-1">
                <p className="text-sm font-semibold text-slate-900">{user?.firstName} {user?.lastName}</p>
                <p className="text-[11px] text-slate-400">{user?.email}</p>
              </div>
              <Link href="/account" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setProfileOpen(false)}>
                <User size={15} className="text-slate-400" /> My Account
              </Link>
              <button
                onClick={() => { logout(); setProfileOpen(false); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
