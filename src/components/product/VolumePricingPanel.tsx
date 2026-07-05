"use client";

import { ArrowRight, Check, PackageOpen } from "lucide-react";
import { useMemo, useState } from "react";

type Tier = { quantity: number; label: string; pricePerPiece: number };

export function VolumePricingPanel({ baseLabel, tiers }: { baseLabel: string; tiers: Tier[] }) {
  const [quantity, setQuantity] = useState(tiers[0].quantity);
  const activeTier = useMemo(
    () => [...tiers].reverse().find((tier) => quantity >= tier.quantity) ?? tiers[0],
    [quantity, tiers],
  );
  const total = quantity * activeTier.pricePerPiece;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
        <div className="flex-1">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-ikonnic-red">Buy More, Save more</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{baseLabel}</h2>
          <p className="mt-2 text-sm text-slate-500">Move the slider to compare pack savings. Your current tier updates instantly.</p>

          <div className="mt-6 rounded-2xl border-2 border-ikonnic-red bg-red-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-xl bg-white text-ikonnic-red"><PackageOpen size={22} /></div>
                <div><p className="text-xs text-slate-500">Selected pack</p><p className="font-black text-slate-950">{quantity} pieces</p></div>
              </div>
              <div className="text-right"><p className="text-xs text-slate-500">Price per piece</p><p className="text-2xl font-black text-ikonnic-red">₹{activeTier.pricePerPiece}</p></div>
            </div>
          </div>

          <label className="mt-6 block text-xs font-bold text-slate-700" htmlFor="volume-quantity">Quantity: {quantity}</label>
          <input
            id="volume-quantity"
            type="range"
            min={tiers[0].quantity}
            max={24}
            step={4}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="mt-3 h-2 w-full cursor-pointer accent-ikonnic-red"
          />
          <div className="mt-1 flex justify-between text-[10px] font-semibold text-slate-400"><span>{tiers[0].quantity}</span><span>24</span></div>
        </div>

        <div className="w-full rounded-2xl bg-slate-950 p-5 text-white lg:max-w-sm">
          <h3 className="text-sm font-black">Pack pricing</h3>
          <div className="mt-4 space-y-2">
            {tiers.map((tier) => {
              const selected = tier.quantity === activeTier.quantity;
              return (
                <button key={tier.quantity} type="button" onClick={() => setQuantity(tier.quantity)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition ${selected ? "border-red-500 bg-red-500/15" : "border-slate-800 bg-slate-900 hover:border-slate-700"}`}>
                  <span className="flex items-center gap-2 font-bold">{selected ? <Check size={15} className="text-red-400" /> : <span className="size-[15px]" />}{tier.label}</span>
                  <span className="text-slate-300">₹{tier.pricePerPiece} / piece</span>
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex items-end justify-between border-t border-slate-800 pt-4">
            <span className="text-xs text-slate-400">Estimated pack total</span><strong className="text-xl">₹{total.toLocaleString("en-IN")}</strong>
          </div>
          <button type="button" onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-ikonnic-red px-5 py-3 text-sm font-black text-white transition hover:bg-red-700">
            Next: choose shapes <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
