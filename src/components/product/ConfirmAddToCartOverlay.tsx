"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export function ConfirmAddToCartOverlay({
  isOpen,
  onClose,
  onConfirm,
  productName,
  price,
  selectedOptions,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName: string;
  price: number;
  selectedOptions: Record<string, string>;
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/60 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-rosegold-200/40 px-6 py-4">
          <h2 className="text-lg font-black text-[#07142f]">Confirm Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-rosegold-100 text-slate-500 transition hover:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="font-bold text-slate-900">{productName}</p>
          <div className="mt-4 space-y-3 rounded-xl border border-rosegold-200/40 bg-rosegold-50 p-4">
            {Object.entries(selectedOptions).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="font-semibold capitalize text-slate-500">{key}</span>
                <span className="font-bold text-slate-900">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-end justify-between border-t border-rosegold-200/40 pt-5">
            <span className="text-sm font-semibold text-slate-500">Total Price</span>
            <span className="text-2xl font-black text-[#d90000]">₹{price}</span>
          </div>
        </div>

        <div className="flex gap-3 bg-rosegold-50 px-6 py-5 sm:flex-row flex-col">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-rosegold-200/60 bg-white py-3.5 text-sm font-black text-slate-700 transition hover:bg-rosegold-100"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 rounded-xl bg-[#07142f] py-3.5 text-sm font-black text-white transition hover:bg-[#0f1d3f]"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
