import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Linkedin, Mail, MapPin, MessageCircle, Phone, Send, Twitter, Youtube } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";

const shopLinks = [
  ["About Us", "/about"],
  ["Track Your Order", "/orders-tracking"],
  ["Contact Us", "/contact-us"],
  ["FAQ", "/faq"],
];

const policyLinks = [
  ["Terms & Conditions", "/terms-conditions"],
  ["Privacy Policy", "/privacy-policy"],
  ["Refund & Return Policy", "/refund-return-policy"],
  ["Shipping Policy", "/shipping-policy"],
];

const socialLinks = [
  { icon: Instagram, href: "https://www.instagram.com/akechiwebcraftltd/", label: "Instagram" },
  { icon: Facebook, href: "https://www.facebook.com/profile.php?id=61574966977059", label: "Facebook" },
  { icon: Youtube, href: "https://www.youtube.com/", label: "YouTube" },
  { icon: Twitter, href: "https://x.com/AkechiWebcraft", label: "X (Twitter)" },
  { icon: Linkedin, href: "https://www.linkedin.com/company/akechi-webcraft-pvt-ltd/", label: "LinkedIn" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      {/* Newsletter / CTA Strip */}
      <div className="border-b border-white/5">
        <PageContainer className="flex flex-col items-center gap-4 py-8 sm:flex-row sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Stay in the loop</h3>
            <p className="mt-1 text-sm text-slate-400">Get updates on new products, offers & personalization ideas.</p>
          </div>
          <form className="flex w-full max-w-sm overflow-hidden rounded-full border border-slate-700 bg-slate-800/60 shadow-lg backdrop-blur-sm transition focus-within:border-ikonnic-red/50 focus-within:ring-2 focus-within:ring-ikonnic-red/20">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 bg-transparent px-5 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Subscribe"
              className="grid place-items-center bg-ikonnic-red px-5 text-white transition hover:bg-red-600"
            >
              <Send size={16} />
            </button>
          </form>
        </PageContainer>
      </div>

      {/* Main Footer Content */}
      <PageContainer className="grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_0.8fr_1.1fr]">
        {/* Brand & Contact */}
        <div>
          <Link href="/" aria-label="Ikonnic home" className="inline-flex items-center gap-1.5">
            <Image
              src="/images/ikonnic.png"
              alt="Ikonnic"
              width={160}
              height={48}
              className="h-12 w-auto"
            />
          </Link>
          <p className="mt-5 max-w-xs text-[13px] leading-6 text-slate-400">
            Personalized gifts & print-on-demand products crafted with care and delivered across India. Turn your moments into beautiful creations.
          </p>

          <div className="mt-6 space-y-2.5">
            <a className="flex items-center gap-3 text-sm text-slate-300 transition hover:text-white" href="mailto:ikonnicdecor@gmail.com">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-800 text-ikonnic-red"><Mail size={14} /></span>
              ikonnicdecor@gmail.com
            </a>
            <a className="flex items-center gap-3 text-sm text-slate-300 transition hover:text-white" href="tel:+917300096277">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-800 text-ikonnic-red"><Phone size={14} /></span>
              +91 73000 96277
            </a>
            <a className="flex items-center gap-3 text-sm text-slate-300 transition hover:text-white" href="https://wa.me/917300096277" target="_blank" rel="noreferrer">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-800 text-ikonnic-red"><MessageCircle size={14} /></span>
              WhatsApp us
            </a>
          </div>

          {/* Social Icons */}
          <div className="mt-6 flex gap-2">
            {socialLinks.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="grid size-9 place-items-center rounded-full bg-slate-800 text-slate-400 transition hover:bg-ikonnic-red hover:text-white"
              >
                <Icon size={15} />
              </a>
            ))}
          </div>
        </div>

        {/* Shop Links */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-white">Shop</h4>
          <nav className="mt-4 flex flex-col gap-2.5">
            {shopLinks.map(([label, href]) => (
              <Link key={href} href={href} className="text-sm text-slate-400 transition hover:text-white hover:translate-x-0.5">
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Policy Links */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-white">Policies</h4>
          <nav className="mt-4 flex flex-col gap-2.5">
            {policyLinks.map(([label, href]) => (
              <Link key={href} href={href} className="text-sm text-slate-400 transition hover:text-white hover:translate-x-0.5">
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Fulfilment Centres */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-white">Our Facilities</h4>
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-slate-800 text-ikonnic-red">
                <MapPin size={14} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Jaipur</p>
                <p className="text-xs leading-5 text-slate-400">Creative Fulfilment Hub, Sitapura, Jaipur, Rajasthan</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-slate-800 text-ikonnic-red">
                <MapPin size={14} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Bengaluru</p>
                <p className="text-xs leading-5 text-slate-400">Print & Dispatch Studio, Yelahanka, Bengaluru, Karnataka</p>
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-800/40 p-4">
            <p className="text-xs font-semibold text-slate-300">🚀 Pan-India Delivery</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">Orders shipped from the nearest hub to reduce transit time. Dispatch within 3 business days.</p>
          </div>
        </div>
      </PageContainer>

      {/* Bottom Bar */}
      <div className="border-t border-white/5">
        <PageContainer className="flex flex-col items-center gap-3 py-5 text-xs text-slate-500 sm:flex-row sm:justify-between">
          <span>© 2016–2026 Ikonnic. All rights reserved.</span>
          <a
            href="https://akechiwebcraft.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-slate-500 transition hover:text-white"
          >
            Powered by
            <Image
              src="/images/akechi-logo.png"
              alt="Akechi Webcraft"
              width={80}
              height={20}
              className="inline-block opacity-60 transition hover:opacity-100 invert"
            />
          </a>
          <span>
            Made with <span className="text-ikonnic-red">♥</span> in India
          </span>
        </PageContainer>
      </div>
    </footer>
  );
}
