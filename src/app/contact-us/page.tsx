import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Contact Us" };

export default function ContactPage() {
  const cards = [
    [MessageCircle, "WhatsApp", "Fast help with orders and personalisation", `https://wa.me/${brand.whatsapp}`, "Chat now"],
    [Mail, "Email", brand.email, `mailto:${brand.email}`, "Send email"],
    [Phone, "Phone", brand.phone, `tel:${brand.phone.replace(/\s/g, "")}`, "Call support"],
  ] as const;
  return (
    <PageContainer className="py-10 sm:py-14">
      <div className="max-w-2xl"><h1 className="text-4xl font-black text-slate-950">Contact Us</h1><p className="mt-3 text-sm leading-6 text-slate-500">Questions about an order, upload, or product choice? Our demo support details are ready to be replaced in <code className="rounded bg-white px-1.5 py-1">src/config/brand.ts</code>.</p></div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {cards.map(([Icon, title, detail, href, action]) => <a key={title} href={href} target={title === "WhatsApp" ? "_blank" : undefined} rel={title === "WhatsApp" ? "noreferrer" : undefined} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-card"><div className="grid size-11 place-items-center rounded-xl bg-red-50 text-giftora-red"><Icon size={21} /></div><h2 className="mt-4 font-black">{title}</h2><p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">{detail}</p><span className="mt-4 inline-block text-xs font-black text-giftora-red">{action} →</span></a>)}
      </div>
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {[["Jaipur", brand.addresses.jaipur], ["Bengaluru", brand.addresses.bengaluru]].map(([city, address]) => <div key={city} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><MapPin className="text-giftora-red" size={22} /><h2 className="mt-3 text-lg font-black">{city} facility</h2><p className="mt-2 text-sm leading-6 text-slate-500">{address}</p></div>)}
      </section>
    </PageContainer>
  );
}
