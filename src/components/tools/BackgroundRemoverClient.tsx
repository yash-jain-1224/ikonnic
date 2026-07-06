"use client";

import Link from "next/link";
import { Download, ImagePlus, WandSparkles } from "lucide-react";
import { useState } from "react";

export function BackgroundRemoverClient() {
  const [preview, setPreview] = useState("");
  const [processed, setProcessed] = useState(false);

  const readFile = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(String(reader.result));
      setProcessed(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
      <section className="rounded-2xl border border-rosegold-200/60 bg-white p-6 shadow-card">
        <h2 className="text-lg font-black text-slate-950">Upload image</h2>
        <label className="mt-5 grid min-h-64 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-rosegold-50 p-6 text-center hover:border-red-300">
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => readFile(event.target.files?.[0])} />
          <span className="grid size-14 place-items-center rounded-full bg-red-50 text-ikonnic-red"><ImagePlus size={24} /></span>
          <span className="mt-4 block font-black">Choose JPG, PNG, or WEBP</span>
          <span className="mt-1 block text-sm text-slate-500">File validation and guest rate limits belong in the future API route.</span>
        </label>
        <button type="button" disabled={!preview} onClick={() => setProcessed(true)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ikonnic-red px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
          <WandSparkles size={16} /> Remove background
        </button>
      </section>
      <section className="rounded-2xl border border-rosegold-200/60 bg-white p-6 shadow-card">
        <h2 className="text-lg font-black text-slate-950">Before and after</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <PreviewPanel label="Before" src={preview} />
          <PreviewPanel label="After" src={preview} processed={processed} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" disabled={!processed} className="inline-flex items-center gap-2 rounded-full border border-rosegold-200 px-4 py-3 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-50">
            <Download size={15} /> Download PNG
          </button>
          <Link href={preview ? `/customise/acrylic-wall-photo-1` : "/category/acrylic-wall-photo"} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-xs font-black text-white">
            Send to customiser
          </Link>
        </div>
      </section>
    </div>
  );
}

function PreviewPanel({ label, src, processed = false }: { label: string; src: string; processed?: boolean }) {
  return (
    <div className="rounded-2xl border border-rosegold-200/40 bg-rosegold-50 p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <div className={`mt-3 grid aspect-square place-items-center overflow-hidden rounded-xl ${processed ? "bg-[linear-gradient(45deg,#e5e7eb_25%,transparent_25%,transparent_75%,#e5e7eb_75%),linear-gradient(45deg,#e5e7eb_25%,transparent_25%,transparent_75%,#e5e7eb_75%)] bg-[length:24px_24px] bg-[position:0_0,12px_12px]" : "bg-white"}`}>
        {src ? <img src={src} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-sm text-slate-400">Awaiting upload</span>}
      </div>
      {processed ? <p className="mt-2 text-xs text-emerald-700">Placeholder result: external AI removal API hook pending.</p> : null}
    </div>
  );
}
