import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { FAQAccordion } from "@/components/ui/FAQAccordion";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers about Ikonnic's personalised acrylic gifts — customisation, image quality, shipping, tracking, returns, and bulk orders.",
  alternates: { canonical: "/faq" },
};

const faqGroups: { heading: string; items: { question: string; answer: string }[] }[] = [
  {
    heading: "Ordering & Customisation",
    items: [
      { question: "How do I personalise a product?", answer: "Open any product and tap Customise. Upload your photo, add text if the product supports it, pick size and thickness, and watch the live 3D preview update before you add it to the cart." },
      { question: "What photo quality do I need?", answer: "For sharp prints, use the original photo from your phone or camera rather than a WhatsApp-compressed copy. Our upload checker flags images that are too small for the selected size." },
      { question: "Can you remove the background from my photo?", answer: "Yes. Our free background remover tool cleans up your photo in seconds, and cutout-style products apply it automatically during customisation." },
      { question: "Can I see a preview before paying?", answer: "Absolutely — the live 3D preview on the customise page shows exactly how your photo, text, and options will look on the finished product." },
    ],
  },
  {
    heading: "Shipping & Delivery",
    items: [
      { question: "How long does delivery take?", answer: "Personalised items are made to order. Production takes 2–4 business days and delivery another 4–7 business days depending on your pincode. Enter your pincode at checkout for a live estimate." },
      { question: "Is shipping free?", answer: "Shipping is free on orders of ₹999 and above. Smaller orders carry a flat ₹99 fee, always shown in the order summary before you pay." },
      { question: "How do I track my order?", answer: "You'll receive a tracking link by email and SMS once your order ships. You can also track any time from the Track Order page using your order number." },
      { question: "Do you offer Cash on Delivery?", answer: "COD is available for most pincodes. Availability is confirmed automatically when you enter your pincode at checkout." },
    ],
  },
  {
    heading: "Quality & Returns",
    items: [
      { question: "How durable are the acrylic products?", answer: "We print UV-cured inks directly onto premium cast acrylic. It's shatter-resistant, fade-resistant, and easy to clean with a soft dry cloth." },
      { question: "Can I return a personalised item?", answer: "Because each piece is custom made, we can't accept change-of-mind returns. If your item arrives damaged or has a manufacturing defect, we'll replace it free of charge — see our Refund & Return Policy." },
      { question: "What if my order arrives damaged?", answer: "Contact support within 48 hours with your order number and photos of the damage. We'll arrange a free reprint or a refund after a quick review." },
    ],
  },
  {
    heading: "Bulk & Corporate Orders",
    items: [
      { question: "Do you offer bulk discounts?", answer: "Yes — volume pricing kicks in automatically on eligible products, and larger corporate orders get custom quotes. Contact us with your quantity and product for a same-day quote." },
      { question: "Can you brand items with our company logo?", answer: "Yes. Keychains, name plates, magnets, and most acrylic products can carry your logo. Share your artwork with our team and we'll set up a proof before production." },
    ],
  },
];

export default function FAQPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqGroups.flatMap((group) =>
      group.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    ),
  };

  return (
    <PageContainer className="py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-ikonnic-red">Help centre</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Frequently Asked Questions</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Everything about personalising, ordering, shipping, and caring for your Ikonnic products. Can&apos;t find your answer?{" "}
          <Link href="/contact-us" className="font-bold text-ikonnic-red hover:underline">Contact us</Link>.
        </p>

        <div className="mt-10 space-y-10">
          {faqGroups.map((group) => (
            <section key={group.heading}>
              <h2 className="mb-4 text-xl font-black text-slate-900">{group.heading}</h2>
              <FAQAccordion items={group.items} />
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-3xl bg-slate-50 p-6 text-center sm:p-8">
          <h2 className="text-lg font-black text-slate-900">Still have a question?</h2>
          <p className="mt-2 text-sm text-slate-500">Our support team replies within one business day.</p>
          <Link href="/contact-us" className="mt-4 inline-block rounded-full bg-ikonnic-red px-6 py-3 text-sm font-black text-white hover:bg-red-700">Contact Support</Link>
        </div>
      </div>
    </PageContainer>
  );
}
