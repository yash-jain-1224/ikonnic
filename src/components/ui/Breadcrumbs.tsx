"use client";

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 overflow-x-auto text-[13px] font-semibold text-slate-500 scrollbar-none"
    >
      <Link
        href="/"
        className="flex items-center gap-1 whitespace-nowrap text-slate-400 transition hover:text-[#d90000]"
      >
        <Home size={13} />
        <span className="sr-only">Home</span>
      </Link>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
          <ChevronRight size={12} className="text-slate-300" />
          {item.href && index < items.length - 1 ? (
            <Link
              href={item.href}
              className="whitespace-nowrap text-slate-500 transition hover:text-[#d90000]"
            >
              {item.label}
            </Link>
          ) : (
            <span className="whitespace-nowrap text-slate-800">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
