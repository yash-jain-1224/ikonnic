"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Plus,
  Menu,
  ChevronDown,
  LogOut,
  User,
  Package,
  BadgePercent,
  ShoppingCart,
  Loader2,
  CheckCheck,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { notificationsAPI } from "@/lib/api";

interface AdminTopBarProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
}

type AdminNotification = {
  id: string;
  subject?: string | null;
  channel?: string | null;
  type?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export function AdminTopBar({ onMenuClick, sidebarCollapsed }: AdminTopBarProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const loadNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const { data } = await notificationsAPI.list();
      setNotifications(Array.isArray(data) ? data : data?.data || []);
    } catch {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  // Fetch notifications once on mount so the unread badge reflects reality
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || now })));
    } catch {
      /* non-fatal */
    }
  };

  const runSearch = () => {
    const q = searchTerm.trim();
    if (!q) return;
    setSearchTerm("");
    router.push(`/admin/products?q=${encodeURIComponent(q)}`);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) setQuickActionsOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ⌘K / Ctrl-K focuses the global search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
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

      {/* Search — routes to the Products list filtered by the term */}
      <div className={`relative flex-1 max-w-md transition-all ${searchFocused ? "max-w-lg" : ""}`}>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchRef}
          type="text"
          value={searchTerm}
          placeholder="Search products…"
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
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

        {/* Notifications — real data from the notifications API */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen((o) => !o); if (!notifOpen) loadNotifications(); }}
            className="relative grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-ikonnic-red px-1 text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg animate-slide-in-from-top-1">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900">
                    <CheckCheck size={12} /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto p-1.5">
                {notifLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" /> Loading…</div>
                ) : notifications.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">No notifications.</p>
                ) : (
                  notifications.slice(0, 12).map((n) => (
                    <div key={n.id} className={`rounded-lg px-3 py-2 ${n.readAt ? "" : "bg-slate-50"}`}>
                      <p className="text-[13px] font-semibold text-slate-900">{n.subject || (n.channel || n.type || "Notification").replace(/_/g, " ")}</p>
                      {n.channel && n.subject && <p className="text-[12px] text-slate-500 capitalize">{n.channel.replace(/_/g, " ")}</p>}
                      <p className="mt-0.5 text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
