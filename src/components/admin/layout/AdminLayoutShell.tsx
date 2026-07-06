"use client";

import { useState, useCallback } from "react";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import { AdminTopBar } from "@/components/admin/layout/AdminTopBar";
import { AdminMobileDrawer } from "@/components/admin/layout/AdminMobileDrawer";
import { AdminBreadcrumb } from "@/components/admin/layout/AdminBreadcrumb";

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const closeMobileDrawer = useCallback(() => setMobileDrawerOpen(false), []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      {/* Mobile Drawer */}
      <AdminMobileDrawer open={mobileDrawerOpen} onClose={closeMobileDrawer} />

      {/* Top Bar */}
      <AdminTopBar
        onMenuClick={() => setMobileDrawerOpen(true)}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Main Content */}
      <main
        className={`min-h-[calc(100vh-56px)] transition-all duration-200 ${
          sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-[260px]"
        }`}
      >
        <div className="p-4 lg:p-6">
          <AdminBreadcrumb />
          {children}
        </div>
      </main>
    </div>
  );
}
