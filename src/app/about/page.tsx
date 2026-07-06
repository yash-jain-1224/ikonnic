import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Layers, Sparkles, Truck } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";

export const metadata: Metadata = {
  title: "About Us",
  description: "Ikonnic turns your favourite memories into premium personalised acrylic photos, wall décor, clocks, keychains, and gifts — designed and made in India.",
  alternates: { canonical: "/about" },
};

const values = [
  { Icon: Heart, title: "Made around memories", body: "Every product starts with a photo or a name that matters to you. We build the product around it — not the other way round." },
  { Icon: Layers, title: "Premium materials", body: "Cast acrylic, UV-cured inks, and precision laser cutting. Pieces that stay vibrant on your wall for years, not months." },
  { Icon: Sparkles, title: "Preview before you pay", body: "Our live 3D customiser shows exactly what you'll receive — placement, size, thickness, and finish — before checkout." },
  { Icon: Truck, title: "Careful, fast delivery", body: "Made to order within days, packed in protective layers, and tracked door-to-door across India." },
];

const stats = [
  ["12+", "curated gift categories"],
  ["490+", "customisable products"],
  ["4–7 days", "typical delivery"],
  ["100%", "damage-free replacement promise"],
];

export default function AboutPage() {
  return (
    <PageContainer className="py-10 sm:py-14">
      <div className="mx-auto max-w-4xl">
        {/* Hero */}
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-ikonnic-red">About Ikonnic</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
            More than décor. <span className="text-ikonnic-red">It&apos;s personal.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
            Ikonnic began with a simple belief: the photos that live forgotten in your phone deserve a place on your wall.
            We turn your favourite memories into premium acrylic photos, wall décor, clocks, name plates, keychains,
            and gifts — each one designed, printed, and finished with care in India.
          </p>
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-rosegold-200/60 bg-white p-5 text-center shadow-sm">
              <p className="text-2xl font-black text-ikonnic-red">{value}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Story */}
        <div className="mt-14 rounded-3xl border border-rosegold-200/60 bg-white p-7 shadow-card sm:p-10">
          <h2 className="text-2xl font-black text-slate-950">Our story</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
            <p>
              We started as a small print studio obsessed with one question: why do personalised gifts so often arrive
              looking nothing like what you imagined? Blurry prints, wrong crops, flimsy materials — memories deserve better.
            </p>
            <p>
              So we built the whole experience around certainty. A live 3D preview that shows your exact product before you
              pay. An upload checker that catches low-quality photos before they become low-quality prints. Premium cast
              acrylic and UV-cured inks that keep colours rich for years. And a replacement promise if anything arrives
              less than perfect.
            </p>
            <p>
              Today Ikonnic ships personalised acrylic photos, monograms, clocks, fridge magnets, luggage tags, photo
              albums, and gift bundles across India — for birthdays, weddings, housewarmings, corporate gifting, and
              every &quot;this reminded me of you&quot; in between.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {values.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-rosegold-200/60 bg-white p-6 shadow-sm">
              <div className="grid size-11 place-items-center rounded-xl bg-red-50 text-ikonnic-red"><Icon size={22} /></div>
              <h3 className="mt-4 font-black text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-3xl bg-slate-950 p-8 text-center sm:p-12">
          <h2 className="text-2xl font-black text-white">Ready to make something personal?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-300">
            Pick a product, upload a memory, and see it come to life in the 3D preview.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/" className="rounded-full bg-ikonnic-red px-6 py-3 text-sm font-black text-white hover:bg-red-700">Browse Gifts</Link>
            <Link href="/contact-us" className="rounded-full border border-slate-600 px-6 py-3 text-sm font-black text-white hover:bg-slate-900">Talk to Us</Link>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
