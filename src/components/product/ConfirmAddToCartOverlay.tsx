"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  onConfirm: () => void | Promise<void>;
  productName: string;
  price: number;
  selectedOptions: Record<string, string>;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.setTimeout(() => closeButtonRef.current?.focus(), 0);
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
      aria-labelledby="confirm-customisation-title"
      aria-busy={isConfirming}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !isConfirming) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-rosegold-200/40 px-6 py-4">
          <h2
            id="confirm-customisation-title"
            className="text-lg font-black text-[#07142f]"
          >
            Confirm Details
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            aria-label="Close confirmation"
            className="grid size-8 place-items-center rounded-full bg-rosegold-100 text-slate-500 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ikonnic-red focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="font-bold text-slate-900">{productName}</p>
          <div className="mt-4 space-y-3 rounded-xl border border-rosegold-200/40 bg-rosegold-50 p-4">
            {Object.entries(selectedOptions).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="font-semibold capitalize text-slate-500">
                  {key}
                </span>
                <span className="font-bold text-slate-900">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-end justify-between border-t border-rosegold-200/40 pt-5">
            <span className="text-sm font-semibold text-slate-500">
              Total Price
            </span>
            <span className="text-2xl font-black text-ikonnic-red">
              ₹{price}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 bg-rosegold-50 px-6 py-5 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="flex-1 rounded-xl border border-rosegold-200/60 bg-white py-3.5 text-sm font-black text-slate-700 transition hover:bg-rosegold-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ikonnic-red focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
          >
            Go Back
          </button>
          <button
            type="button"
            disabled={isConfirming}
            onClick={async () => {
              setIsConfirming(true);
              try {
                await onConfirm();
                onClose();
              } catch {
                onClose();
              } finally {
                setIsConfirming(false);
              }
            }}
            className="flex-1 rounded-xl bg-[#07142f] py-3.5 text-sm font-black text-white transition hover:bg-[#0f1d3f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ikonnic-red focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-65"
          >
            {isConfirming ? "Saving photos..." : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
