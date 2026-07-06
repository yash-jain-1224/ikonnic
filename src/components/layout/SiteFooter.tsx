import Link from "next/link";
import Image from "next/image";
import { Apple, Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, Play, Youtube } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";

const quickLinks = [
  ["About Us", "/about"],
  ["FAQ", "/faq"],
  ["Terms & Conditions", "/terms-conditions"],
  ["Privacy Policy", "/privacy-policy"],
  ["Refund & Return Policy", "/refund-return-policy"],
  ["Shipping Policy", "/shipping-policy"],
  ["Track Your Order", "/orders-tracking"],
  ["Contact Us", "/contact-us"],
  ["Blog", "/blog"],
  ["Photo Poses", "/photo-poses"],
];

const socialLinks = [
  [Instagram, "https://www.instagram.com/", "Instagram"],
  [Facebook, "https://www.facebook.com/", "Facebook"],
  [Youtube, "https://www.youtube.com/", "YouTube"],
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-rosegold-800/30 bg-[#1c1517] text-white/90">
      <PageContainer className="grid gap-10 py-12 lg:grid-cols-[1fr_1.12fr_.78fr]">
        <div>
          <Link href="/" aria-label="Ikonnic home" className="inline-flex h-9 items-center gap-1 rounded-[2px] bg-rosegold-50 px-2.5 text-[20px] font-black tracking-[-0.04em] text-rosegold-900">
            IKONNIC
            <span className="grid size-6 place-items-center rounded-[2px] bg-ikonnic-red text-[13px] text-white">◆</span>
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300">
            Personalized gifts and print-on-demand products crafted with care and delivered across India.
          </p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
            From custom wall decor and photo products to unique keepsakes, we help you turn moments into beautiful creations.
          </p>

          <div className="mt-5 space-y-3 text-sm text-slate-300">
            <a className="flex items-center gap-2 transition hover:text-white" href="mailto:support@ikonnic.com">
              <Mail size={16} />
              support@ikonnic.com
            </a>
            <a className="flex items-center gap-2 transition hover:text-white" href="tel:+919000012345">
              <Phone size={16} />
              +91 90000 12345
            </a>
            <a className="flex items-center gap-2 transition hover:text-white" href="https://wa.me/919000012345" target="_blank" rel="noreferrer">
              <MessageCircle size={16} />
              WhatsApp us
            </a>
          </div>

          <h3 className="mt-7 text-xs font-black tracking-[0.18em] text-white">FOLLOW US</h3>
          <div className="mt-4 flex gap-2">
            {socialLinks.map(([Icon, href, label]) => {
              const SocialIcon = Icon as typeof Instagram;
              return (
                <a
                  key={label as string}
                  href={href as string}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label as string}
                  className="grid size-9 place-items-center rounded-lg bg-[#101624] text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  <SocialIcon size={16} />
                </a>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <a href="https://apps.apple.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-rosegold-700 bg-[#2a1c20] px-3 py-2 text-rosegold-200 transition hover:border-rosegold-500">
              <Apple size={15} />
              App Store
            </a>
            <a href="https://play.google.com/store" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-rosegold-700 bg-[#2a1c20] px-3 py-2 text-rosegold-200 transition hover:border-rosegold-500">
              <Play size={15} />
              Google Play
            </a>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-black tracking-[0.18em] text-white">OUR FACILITIES</h3>
          <div className="mt-4 rounded-xl border border-rosegold-800 bg-[#2a1c20] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-rosegold-300">Why customers trust us</p>
            <p className="mt-2 text-sm leading-5 text-white">Two production hubs help us process faster and ship quickly across India.</p>
          </div>
          <div className="mt-5 grid gap-4 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-1">
            <div className="flex gap-3">
              <MapPin className="mt-0.5 shrink-0 text-ikonnic-red" size={17} />
              <p>
                <strong className="text-white">Jaipur</strong>
                <br />
                Creative Fulfilment Hub, Sitapura, Jaipur, Rajasthan
              </p>
            </div>
            <div className="flex gap-3">
              <MapPin className="mt-0.5 shrink-0 text-ikonnic-red" size={17} />
              <p>
                <strong className="text-white">Bengaluru</strong>
                <br />
                Print & Dispatch Studio, Yelahanka, Bengaluru, Karnataka
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-rosegold-800 bg-[#2a1c20] p-4 text-xs text-slate-400">
            <div className="flex flex-wrap justify-between gap-2 font-bold text-slate-200">
              <span>India coverage</span>
              <span className="text-rosegold-400">Fast dispatch</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[11px] font-black uppercase tracking-[0.12em] text-slate-300">
              <span className="rounded-lg bg-slate-900 px-3 py-2">Jaipur Hub</span>
              <span className="rounded-lg bg-slate-900 px-3 py-2">Bengaluru Hub</span>
            </div>
            <p className="mt-4">Orders are processed from the nearest facility whenever possible to reduce transit time.</p>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-black tracking-[0.18em] text-white">QUICK LINKS</h3>
          <nav className="mt-4 space-y-1">
            {quickLinks.map(([label, href]) => (
              <Link key={href} href={href} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-300 transition hover:bg-[#101624] hover:text-white">
                <span className="grid size-6 place-items-center rounded-md bg-[#101624] text-[10px] text-slate-400">↗</span>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </PageContainer>
      <div className="border-t border-rosegold-800">
        <PageContainer className="flex flex-col gap-2 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Copyright 2016-2026 © Ikonnic. All rights reserved.</span>
          <a
            href="https://akechiwebcraft.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-slate-400 transition hover:text-white"
          >
            Powered by
            <Image
              src="/images/akechi-logo.webp"
              alt="Akechi Webcraft IT Solutions"
              width={90}
              height={24}
              className="inline-block brightness-0 invert opacity-70 hover:opacity-100 transition"
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
