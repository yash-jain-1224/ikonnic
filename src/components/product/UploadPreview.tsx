"use client";

import { ImagePlus, Move, RotateCw, ZoomIn } from "lucide-react";
import { useRef, useState } from "react";

export function UploadPreview({ value, onChange }: { value?: string; onChange: (preview?: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const readFile = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => readFile(event.target.files?.[0])} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); readFile(event.dataTransfer.files?.[0]); }}
        className={`relative flex min-h-80 w-full items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed bg-white transition ${dragging ? "border-giftora-red bg-red-50" : "border-slate-300 hover:border-red-300"}`}
      >
        {value ? (
          <img src={value} alt="Uploaded preview" className="absolute inset-0 h-full w-full object-contain bg-slate-100 p-4" />
        ) : (
          <div className="px-6 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-red-50 text-giftora-red"><ImagePlus size={28} /></div>
            <p className="mt-4 font-black text-slate-900">Drop a photo here</p>
            <p className="mt-1 text-sm text-slate-500">or click to choose JPG, PNG, or WEBP</p>
          </div>
        )}
      </button>
      {value ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {[["Move", Move], ["Zoom", ZoomIn], ["Rotate", RotateCw]].map(([label, Icon]) => {
            const ControlIcon = Icon as typeof Move;
            return <button key={label as string} type="button" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><ControlIcon size={14} />{label as string}</button>;
          })}
          <button type="button" onClick={() => onChange(undefined)} className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-giftora-red">Remove</button>
        </div>
      ) : null}
    </div>
  );
}
