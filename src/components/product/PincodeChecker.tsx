"use client";

import { MapPin, Truck, CheckCircle } from "lucide-react";
import { useState } from "react";

/* Mock pincode → delivery date lookup */
const METRO_PINCODES = new Set(["110001", "400001", "560001", "700001", "600001", "302001", "500001", "380001"]);

function estimateDelivery(pincode: string): { city: string; state: string; days: number } | null {
  if (!/^\d{6}$/.test(pincode)) return null;
  const prefix = pincode.slice(0, 2);
  const lookup: Record<string, { city: string; state: string }> = {
    "11": { city: "New Delhi", state: "Delhi" },
    "12": { city: "Gurgaon", state: "Haryana" },
    "13": { city: "Chandigarh", state: "Punjab" },
    "14": { city: "Ludhiana", state: "Punjab" },
    "20": { city: "Agra", state: "Uttar Pradesh" },
    "22": { city: "Lucknow", state: "Uttar Pradesh" },
    "30": { city: "Jaipur", state: "Rajasthan" },
    "31": { city: "Jodhpur", state: "Rajasthan" },
    "38": { city: "Ahmedabad", state: "Gujarat" },
    "40": { city: "Mumbai", state: "Maharashtra" },
    "41": { city: "Pune", state: "Maharashtra" },
    "50": { city: "Hyderabad", state: "Telangana" },
    "51": { city: "Secunderabad", state: "Telangana" },
    "56": { city: "Bengaluru", state: "Karnataka" },
    "57": { city: "Mysuru", state: "Karnataka" },
    "60": { city: "Chennai", state: "Tamil Nadu" },
    "62": { city: "Coimbatore", state: "Tamil Nadu" },
    "67": { city: "Kozhikode", state: "Kerala" },
    "68": { city: "Kochi", state: "Kerala" },
    "70": { city: "Kolkata", state: "West Bengal" },
    "75": { city: "Bhubaneswar", state: "Odisha" },
    "80": { city: "Patna", state: "Bihar" },
    "82": { city: "Ranchi", state: "Jharkhand" },
  };
  const loc = lookup[prefix] || { city: "Your City", state: "India" };
  const isMetro = METRO_PINCODES.has(pincode) || ["11", "40", "56", "60", "70", "30"].includes(prefix);
  const days = isMetro ? 4 : 7;
  return { ...loc, days };
}

function formatDeliveryDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function PincodeChecker() {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<{ city: string; state: string; days: number } | null>(null);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);

  const handleCheck = () => {
    setError("");
    setResult(null);
    if (!/^\d{6}$/.test(pincode)) {
      setError("Please enter a valid 6-digit pincode");
      return;
    }
    const delivery = estimateDelivery(pincode);
    if (delivery) {
      setResult(delivery);
      setChecked(true);
    } else {
      setError("Delivery not available for this pincode");
    }
  };

  return (
    <div className="mt-5 rounded-[14px] border border-[#dfe4ec] bg-white p-4 shadow-sm">
      <label className="flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.1em] text-slate-700">
        <MapPin size={14} className="text-ikonnic-red" />
        Check Delivery
      </label>
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setChecked(false);
            setError("");
          }}
          placeholder="Enter pincode"
          maxLength={6}
          className="min-w-0 flex-1 rounded-xl border border-rosegold-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-ikonnic-red focus:ring-1 focus:ring-ikonnic-red"
        />
        <button
          type="button"
          onClick={handleCheck}
          className="rounded-xl bg-ikonnic-red px-5 py-3 text-sm font-black text-white transition hover:bg-rosegold-600 active:scale-[0.98]"
        >
          Check
        </button>
      </div>
      {error && (
        <p className="mt-2 text-[13px] font-bold text-ikonnic-red">{error}</p>
      )}
      {result && checked && (
        <div className="mt-3 flex items-start gap-3 rounded-xl bg-emerald-50 p-3">
          <Truck size={18} className="mt-0.5 text-emerald-600" />
          <div>
            <p className="text-sm font-bold text-emerald-700">
              Delivering to {result.city}, {result.state}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600">
              <CheckCircle size={13} />
              Estimated delivery by <strong>{formatDeliveryDate(result.days)}</strong>
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Free Shipping • Includes custom production time
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
