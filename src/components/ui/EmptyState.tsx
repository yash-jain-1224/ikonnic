import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export function EmptyState({
  title = "Your cart is waiting",
  description = "Choose a favourite product, add your personal touch, and it will appear here.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-card">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-red-50 text-ikonnic-red">
        <ShoppingBag size={28} />
      </div>
      <h2 className="mt-5 text-xl font-black text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      <Link href="/category/acrylic-wall-photo" className="mt-6 inline-flex rounded-full bg-ikonnic-red px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700">
        Start shopping
      </Link>
    </div>
  );
}
