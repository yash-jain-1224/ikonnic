import { HeartHandshake } from "lucide-react";

export function HappinessGuarantee() {
  return (
    <div className="mt-6 flex items-start gap-4 rounded-3xl bg-pink-50 p-6 text-pink-900 shadow-sm border border-pink-100">
      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-pink-100">
        <HeartHandshake size={24} className="text-pink-600" />
      </div>
      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-pink-700">The Giftora Promise</h3>
        <p className="mt-1 text-sm font-medium leading-relaxed">
          100% Happiness Guaranteed. If your personalized product isn't absolutely perfect, we'll replace it or refund it—no questions asked.
        </p>
      </div>
    </div>
  );
}
