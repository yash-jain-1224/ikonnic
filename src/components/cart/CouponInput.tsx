"use client";

import { Tag, X, CheckCircle } from "lucide-react";
import { useState } from "react";

const VALID_COUPONS: Record<string, { discount: number; type: "percent" | "flat"; label: string; minOrder?: number }> = {
  WELCOME10: { discount: 10, type: "percent", label: "10% off your first order", minOrder: 499 },
  IKONNIC15: { discount: 15, type: "percent", label: "15% off sitewide", minOrder: 999 },
  FLAT200: { discount: 200, type: "flat", label: "₹200 off on orders above ₹1499", minOrder: 1499 },
  FIRST100: { discount: 100, type: "flat", label: "₹100 off your first purchase" },
  SUMMER20: { discount: 20, type: "percent", label: "20% Summer Sale discount", minOrder: 799 },
};

export type CouponResult = {
  code: string;
  discount: number;
  type: "percent" | "flat";
  label: string;
  calculatedDiscount: number;
};

export function CouponInput({
  cartTotal,
  onApply,
  onRemove,
  appliedCoupon,
}: {
  cartTotal: number;
  onApply: (coupon: CouponResult) => void;
  onRemove: () => void;
  appliedCoupon?: CouponResult | null;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleApply = () => {
    setError("");
    const upper = code.trim().toUpperCase();
    if (!upper) {
      setError("Please enter a coupon code");
      return;
    }
    const coupon = VALID_COUPONS[upper];
    if (!coupon) {
      setError("Invalid coupon code. Try WELCOME10 or IKONNIC15");
      return;
    }
    if (coupon.minOrder && cartTotal < coupon.minOrder) {
      setError(`Minimum order of ₹${coupon.minOrder} required for this coupon`);
      return;
    }
    const calculatedDiscount = coupon.type === "percent"
      ? Math.round(cartTotal * coupon.discount / 100)
      : coupon.discount;

    onApply({
      code: upper,
      discount: coupon.discount,
      type: coupon.type,
      label: coupon.label,
      calculatedDiscount,
    });
    setCode("");
  };

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-600" />
          <div>
            <p className="text-sm font-bold text-emerald-700">
              {appliedCoupon.code} applied
            </p>
            <p className="text-[11px] text-emerald-600">{appliedCoupon.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-black text-emerald-700">
            -₹{appliedCoupon.calculatedDiscount}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="grid size-7 place-items-center rounded-full bg-emerald-100 text-emerald-600 transition hover:bg-emerald-200"
            aria-label="Remove coupon"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError("");
            }}
            placeholder="Enter coupon code"
            className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-4 text-sm font-semibold uppercase tracking-wider outline-none transition focus:border-[#d90000] focus:ring-1 focus:ring-[#d90000]"
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
          />
        </div>
        <button
          type="button"
          onClick={handleApply}
          className="rounded-xl border border-[#d90000] px-5 py-3 text-sm font-black text-[#d90000] transition hover:bg-red-50 active:scale-[0.98]"
        >
          Apply
        </button>
      </div>
      {error && <p className="mt-2 text-[12px] font-bold text-red-500">{error}</p>}
    </div>
  );
}
