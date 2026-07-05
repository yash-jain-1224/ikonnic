"use client";

import { useState } from "react";
import type { SelectedOptions } from "@/types";

const optionSets = {
  size: ["8 × 10 in", "12 × 16 in", "16 × 20 in"],
  shape: ["Square", "Portrait", "Landscape", "Circle"],
  orientation: ["Portrait", "Landscape"],
  photos: ["1 photo", "2 photos", "4 photos", "9 photos"],
};

export function ProductOptions({ onChange }: { onChange?: (options: SelectedOptions) => void }) {
  const [options, setOptions] = useState<SelectedOptions>({
    size: optionSets.size[0],
    shape: optionSets.shape[0],
    orientation: optionSets.orientation[0],
    photos: optionSets.photos[0],
  });

  const update = (key: keyof SelectedOptions, value: string) => {
    const next = { ...options, [key]: value };
    setOptions(next);
    onChange?.(next);
  };

  return (
    <div className="space-y-5">
      {Object.entries(optionSets).map(([key, values]) => (
        <fieldset key={key}>
          <legend className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{key === "photos" ? "Number of photos" : key}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {values.map((value) => (
              <button key={value} type="button" onClick={() => update(key as keyof SelectedOptions, value)} className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${options[key as keyof SelectedOptions] === value ? "border-giftora-red bg-red-50 text-giftora-red" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}>
                {value}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
