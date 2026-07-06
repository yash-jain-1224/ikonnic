"use client";

import { Minus, Plus } from "lucide-react";

export function QuantitySelector({
  value,
  onChange,
  compact = false,
}: {
  value: number;
  onChange: (quantity: number) => void;
  compact?: boolean;
}) {
  return (
    <div className={`inline-flex items-center rounded-full border border-rosegold-200/60 bg-white ${compact ? "p-0.5" : "p-1"}`}>
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="grid size-8 place-items-center rounded-full text-slate-600 transition hover:bg-rosegold-100"
      >
        <Minus size={14} />
      </button>
      <span className="min-w-8 text-center text-sm font-bold">{value}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(value + 1)}
        className="grid size-8 place-items-center rounded-full text-slate-600 transition hover:bg-rosegold-100"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
