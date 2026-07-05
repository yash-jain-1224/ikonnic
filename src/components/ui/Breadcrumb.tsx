import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumb({ current, parent }: { current: string; parent?: { label: string; href: string } }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
      <Link className="transition hover:text-ikonnic-red" href="/">Home</Link>
      <ChevronRight size={13} />
      {parent ? (
        <>
          <Link className="transition hover:text-ikonnic-red" href={parent.href}>{parent.label}</Link>
          <ChevronRight size={13} />
        </>
      ) : null}
      <span className="text-slate-700">{current}</span>
    </nav>
  );
}
