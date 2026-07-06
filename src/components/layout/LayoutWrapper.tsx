"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface LayoutWrapperProps {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
  whatsapp: ReactNode;
}

export function LayoutWrapper({ children, header, footer, whatsapp }: LayoutWrapperProps) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    // Admin routes use their own layout (AdminLayoutShell) — no site header/footer
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {header}
      <main className="flex-1">{children}</main>
      {footer}
      {whatsapp}
    </div>
  );
}
