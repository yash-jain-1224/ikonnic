import { BadgeCheck, Headphones, ShieldCheck, Sparkles } from "lucide-react";

export function TrustPromiseCard() {
  return (
    <section className="overflow-hidden rounded-3xl border border-rosegold-200 border-t-4 border-t-ikonnic-red bg-[#fffbf9] px-6 py-12 text-center shadow-card sm:px-12">
      <span className="inline-flex rounded-full bg-rosegold-100 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-ikonnic-red">Trusted promise</span>
      <div className="mx-auto mt-5 grid size-20 place-items-center rounded-full bg-rosegold-900 text-white shadow-xl"><BadgeCheck size={34} /></div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-rosegold-500">Our promise</p>
      <h2 className="mx-auto mt-5 max-w-2xl text-2xl font-black leading-tight text-rosegold-900">If something does not feel right, we will help make it right.</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">Fast human support, careful quality checks, and fair resolutions for personalised orders.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-2 text-xs font-semibold text-rosegold-700">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rosegold-100 px-3 py-2"><Headphones size={14} />Human support</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rosegold-100 px-3 py-2"><ShieldCheck size={14} />Quality first</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rosegold-100 px-3 py-2"><Sparkles size={14} />Hassle-free help</span>
      </div>
    </section>
  );
}
