# Giftora Storefront

Giftora is a complete UI-only personalised gifting storefront built with Next.js App Router, TypeScript, Tailwind CSS, Zustand, Lucide React, and subtle Framer Motion transitions.

The project recreates the layout rhythm and UX patterns supplied in the OMGS visual reference while using an original placeholder brand, generated local placeholder artwork, editable data, and original copy.

## Included

- 11 working product category routes with more than 230 generated product records
- Interactive homepage carousel with 13 slides
- Client-side filters for wall clocks, photo albums, and acrylic wall photos
- Interactive volume pricing for fridge magnets and mini wall galleries
- Product detail and customisation flows
- Drag-and-drop image preview
- Persistent Zustand cart, cart controls, and checkout summary
- Blog listing, load more, and article routes
- Login, order tracking, contact, photo poses, and policy pages
- Responsive global header and footer on every route

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Push this project to a Git repository.
2. Import the repository at [vercel.com/new](https://vercel.com/new).
3. Keep the detected framework as **Next.js**.
4. Use the default build command: `npm run build`.
5. Deploy. No environment variables are required for this UI-only version.

## Editing content and placeholders

- Brand and support details: `src/config/brand.ts`
- Categories: `src/data/categories.ts`
- Product generation: `src/data/products.ts`
- Hero slides: `src/data/heroSlides.ts`
- Blog posts: `src/data/blog.ts`
- Policy placeholders: `src/data/policies.ts`
- Generated placeholder artwork: `src/lib/placeholders.ts`

Before a public launch, replace placeholder artwork and demonstration support details with permitted production assets and verified business information.

## Future integrations

The checkout currently displays a Razorpay placeholder and does not capture payment. A production version should add authenticated accounts, database-backed orders, secure upload storage, inventory/fulfilment APIs, taxes, shipping rates, transactional messaging, and a server-side Razorpay integration with webhook verification.
