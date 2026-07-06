import Link from "next/link";

export function CartSummary({ subtotal, checkoutHref, buttonLabel = "Checkout" }: { subtotal: number; checkoutHref?: string; buttonLabel?: string }) {
  const shipping = subtotal >= 999 ? 0 : 99;
  const total = subtotal + shipping;
  return (
    <aside className="rounded-3xl border border-rosegold-200/60 bg-white p-5 shadow-card">
      <h2 className="text-lg font-black text-slate-950">Price summary</h2>
      <div className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span></div>
        <div className="flex justify-between text-slate-600"><span>Shipping</span><span>{shipping === 0 ? "FREE" : `₹${shipping}`}</span></div>
        <div className="flex justify-between text-slate-600">
          <span>IGST (18% included)</span>
          <span>₹{Math.round(total - (total / 1.18)).toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between border-t border-dashed border-slate-200 pt-4 text-base font-black text-slate-950"><span>Total</span><span>₹{total.toLocaleString("en-IN")}</span></div>
      </div>
      {checkoutHref ? <Link href={checkoutHref} className="mt-5 flex w-full justify-center rounded-full bg-ikonnic-red px-5 py-3 text-sm font-black text-white hover:bg-red-700">{buttonLabel}</Link> : null}
      <p className="mt-3 text-center text-[11px] leading-4 text-slate-400">Taxes and final delivery estimates are shown before payment.</p>
    </aside>
  );
}
