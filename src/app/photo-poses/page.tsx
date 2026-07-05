import type { Metadata } from "next";
import { Camera, Sparkles } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { placeholderImage } from "@/lib/placeholders";

export const metadata: Metadata = { title: "Photo Poses" };

const poses = ["Window light portrait", "Walking together", "Over-the-shoulder smile", "Seated family cluster", "Close-up detail", "Playful candid", "Side-by-side portrait", "Celebration confetti", "Cosy reading pose", "Travel landmark frame", "Parent and child moment", "Pet portrait"];

export default function PhotoPosesPage() {
  return (
    <PageContainer className="py-10 sm:py-14">
      <div className="max-w-2xl"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-ikonnic-red"><Camera size={15} />Photo guide</p><h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Simple poses for photographs you will want to print</h1><p className="mt-3 text-sm leading-6 text-slate-500">Use these placeholder cards as prompts. Relaxed expressions and clean light usually matter more than perfect posing.</p></div>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {poses.map((pose, index) => <article key={pose} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><img src={placeholderImage(110 + index, pose)} alt="" className="aspect-[4/5] w-full object-cover" /><div className="p-4"><p className="flex items-center gap-2 text-sm font-black"><Sparkles size={14} className="text-ikonnic-red" />{pose}</p><p className="mt-2 text-xs leading-5 text-slate-500">Keep shoulders loose, leave room around the subject, and take a few frames.</p></div></article>)}
      </div>
    </PageContainer>
  );
}
