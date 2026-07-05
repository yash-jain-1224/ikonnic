import { Heart, Package, ShieldCheck, Truck } from "lucide-react";

export function WhyIkonnic() {
  const reasons = [
    {
      icon: Heart,
      title: "Made with Love",
      description: "Every product is carefully crafted and personalized just for you and your loved ones.",
      color: "text-rose-500",
      bg: "bg-rose-50",
    },
    {
      icon: ShieldCheck,
      title: "Premium Quality",
      description: "We use only the best materials, ensuring your memories last a lifetime.",
      color: "text-emerald-500",
      bg: "bg-emerald-50",
    },
    {
      icon: Truck,
      title: "Fast Delivery",
      description: "Quick dispatch from our hubs to ensure your gifts arrive right on time.",
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      icon: Package,
      title: "Secure Packaging",
      description: "We pack every order securely to prevent damage during transit.",
      color: "text-violet-500",
      bg: "bg-violet-50",
    },
  ];

  return (
    <div className="mt-20 rounded-3xl bg-white px-6 py-12 shadow-[0_4px_20px_rgba(15,23,42,0.03)] sm:px-12 sm:py-16">
      <div className="text-center">
        <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">Why Choose Ikonnic?</h2>
        <p className="mt-3 text-sm text-slate-500">
          We bring your memories to life with unmatched quality and care.
        </p>
      </div>

      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {reasons.map((reason, index) => {
          const Icon = reason.icon;
          return (
            <div key={index} className="flex flex-col items-center text-center">
              <div className={`grid size-16 place-items-center rounded-2xl ${reason.bg} ${reason.color}`}>
                <Icon size={32} />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">{reason.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{reason.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
