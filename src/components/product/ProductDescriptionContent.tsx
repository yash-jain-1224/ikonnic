import type { Product } from "@/types";

function displayTitle(product: Product) {
  if (product.slug === "acrylic-wall-photo-2") return "Portrait Acrylic Wall Photo";
  return product.title.replace(/\s+\d+$/, "");
}

function fallbackDescription(product: Product) {
  const text = product.description?.trim();
  if (text && text.toLowerCase() !== "no description available.") return text;
  return `${displayTitle(product)} is custom made in the ${product.categoryName} collection with your chosen photo, size, and finish.`;
}

function BulletList({ items }: { items?: string[] }) {
  const visibleItems = items?.filter(Boolean) ?? [];
  if (!visibleItems.length) return null;

  return (
    <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600 sm:grid-cols-2">
      {visibleItems.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ikonnic-red" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ProductDescriptionContent({ product }: { product: Product }) {
  const shortDescription = fallbackDescription(product);
  const detailedDescription = product.detailedDescription || shortDescription;

  return (
    <div className="rounded-[18px] border border-rosegold-200/60 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-black text-[#07142f]">Description</h2>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">{shortDescription}</p>
      {detailedDescription !== shortDescription ? (
        <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">{detailedDescription}</p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[#07142f]">Product Highlights</h3>
          <BulletList items={product.productHighlights} />
        </section>

        <section>
          <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[#07142f]">Personalisation Details</h3>
          <BulletList items={product.personalisationDetails} />
        </section>

        <section>
          <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[#07142f]">Ideal For</h3>
          <BulletList items={product.idealFor} />
        </section>

        <section>
          <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[#07142f]">Care Instructions</h3>
          <BulletList items={product.careInstructions} />
        </section>
      </div>
    </div>
  );
}
