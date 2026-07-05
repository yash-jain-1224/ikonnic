import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

/**
 * Extract JSON array from a TypeScript source file using a specific marker
 */
function extractJsonArray(content: string, marker: string): any[] {
  const markerIdx = content.indexOf(marker);
  if (markerIdx === -1) {
    throw new Error(`Marker "${marker}" not found in file`);
  }
  
  const searchStart = markerIdx + marker.length;
  
  // Find the opening bracket
  let arrayStart = searchStart;
  while (arrayStart < content.length && content[arrayStart] !== '[') {
    arrayStart++;
  }

  // Match brackets to find end
  let depth = 0;
  let endIdx = arrayStart;
  let started = false;
  for (let i = arrayStart; i < content.length; i++) {
    if (content[i] === '[') { depth++; started = true; }
    else if (content[i] === ']') {
      depth--;
      if (started && depth === 0) { endIdx = i; break; }
    }
  }

  const raw = content.slice(arrayStart, endIdx + 1);
  return JSON.parse(raw);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Ikonnic Database Seeder');
  console.log('  Using FRONTEND hardcoded data (same as website)');
  console.log('═══════════════════════════════════════════════════════');

  // ─── 1. Admin & Test Users ─────────────────────
  console.log('\n👤 Seeding users...');
  const adminPassword = await bcrypt.hash('Admin@2026!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@ikonnic.com' },
    update: {},
    create: {
      email: 'admin@ikonnic.com',
      phone: '+919000012345',
      firstName: 'Ikonnic',
      lastName: 'Admin',
      passwordHash: adminPassword,
      role: 'SUPER_ADMIN',
      isVerified: true,
    },
  });

  const customerPassword = await bcrypt.hash('Customer@123', 12);
  await prisma.user.upsert({
    where: { email: 'test@ikonnic.com' },
    update: {},
    create: {
      email: 'test@ikonnic.com',
      phone: '+919876543210',
      firstName: 'Test',
      lastName: 'Customer',
      passwordHash: customerPassword,
      role: 'CUSTOMER',
      isVerified: true,
    },
  });
  console.log('  ✅ admin@ikonnic.com (Admin@2026!)');
  console.log('  ✅ test@ikonnic.com (Customer@123)');

  // ─── 2. Warehouses ─────────────────────────────
  console.log('\n🏭 Seeding warehouses...');
  await prisma.warehouse.upsert({
    where: { code: 'JAI-01' },
    update: {},
    create: { name: 'Jaipur Hub', code: 'JAI-01', city: 'Jaipur', state: 'Rajasthan', pincode: '302034' },
  });
  await prisma.warehouse.upsert({
    where: { code: 'BLR-01' },
    update: {},
    create: { name: 'Bengaluru Hub', code: 'BLR-01', city: 'Bengaluru', state: 'Karnataka', pincode: '560064' },
  });
  console.log('  ✅ 2 warehouses seeded');

  // ─── 3. Categories (from frontend) ─────────────
  console.log('\n📂 Reading frontend categories...');
  const catFilePath = path.resolve(__dirname, '../../src/data/categories.ts');
  const catContent = fs.readFileSync(catFilePath, 'utf8');
  const rawCategories = extractJsonArray(catContent, 'const rawCategories: Category[] = ');
  console.log(`   Found ${rawCategories.length} categories in frontend data`);

  let catCreated = 0;
  for (let i = 0; i < rawCategories.length; i++) {
    const cat = rawCategories[i];
    try {
      await prisma.category.upsert({
        where: { slug: cat.slug },
        update: {
          name: cat.name,
          description: cat.description || null,
          image: cat.image || null,
          accent: cat.accent || null,
          featured: cat.featured || false,
          sortOrder: i + 1,
          seoContent: cat.seoContent?.slice(0, 5000) || null,
          isActive: true,
        },
        create: {
          slug: cat.slug,
          name: cat.name,
          description: cat.description || null,
          image: cat.image || null,
          accent: cat.accent || null,
          featured: cat.featured || false,
          sortOrder: i + 1,
          seoContent: cat.seoContent?.slice(0, 5000) || null,
          isActive: true,
        },
      });
      catCreated++;
    } catch (err: any) {
      console.log(`  ⚠️  Skip cat "${cat.slug}": ${err.message?.slice(0, 50)}`);
    }
  }
  console.log(`  ✅ ${catCreated} categories seeded`);

  // ─── 4. Products (from frontend) ───────────────
  console.log('\n📦 Reading frontend products...');
  const prodFilePath = path.resolve(__dirname, '../../src/data/products.ts');
  const prodContent = fs.readFileSync(prodFilePath, 'utf8');
  const rawProducts = extractJsonArray(prodContent, 'const generateRawProducts = (): Product[] => ');
  console.log(`   Found ${rawProducts.length} products in frontend data`);

  // Build category slug -> id map
  const allCats = await prisma.category.findMany({ select: { id: true, slug: true } });
  const catMap = new Map(allCats.map(c => [c.slug, c.id]));

  let prodCreated = 0;
  let prodSkipped = 0;
  const seenSkus = new Set<string>();

  for (const prod of rawProducts) {
    // Resolve category
    let categoryId = catMap.get(prod.categorySlug);
    if (!categoryId) {
      // Auto-create missing category
      try {
        const newCat = await prisma.category.create({
          data: {
            slug: prod.categorySlug,
            name: prod.categoryName || prod.categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            isActive: true,
            sortOrder: 99,
          },
        });
        categoryId = newCat.id;
        catMap.set(prod.categorySlug, categoryId);
      } catch {
        prodSkipped++;
        continue;
      }
    }

    // Handle duplicate SKUs
    let sku = prod.sku || null;
    if (sku && seenSkus.has(sku)) {
      sku = null; // Nullify duplicate SKU
    }
    if (sku) seenSkus.add(sku);

    try {
      await prisma.product.upsert({
        where: { slug: prod.slug },
        update: {
          title: prod.title,
          sku,
          categoryId,
          price: prod.price,
          oldPrice: prod.oldPrice || null,
          sale: prod.sale || false,
          image: prod.image,
          thumbnail: prod.thumbnail || null,
          gallery: prod.gallery || [],
          filterTags: prod.filterTags || [],
          description: prod.description || 'No description available',
          longDescription: prod.longDescription?.slice(0, 10000) || null,
          stockStatus: prod.stockStatus === 'unknown' ? 'in_stock' : (prod.stockStatus || 'in_stock'),
          stockCount: prod.stockCount || 50,
          isActive: true,
          isFeatured: prod.sale || false,
          customizerTemplateId: prod.customizerTemplateId || null,
        },
        create: {
          slug: prod.slug,
          title: prod.title,
          sku,
          categoryId,
          price: prod.price,
          oldPrice: prod.oldPrice || null,
          sale: prod.sale || false,
          image: prod.image,
          thumbnail: prod.thumbnail || null,
          gallery: prod.gallery || [],
          filterTags: prod.filterTags || [],
          description: prod.description || 'No description available',
          longDescription: prod.longDescription?.slice(0, 10000) || null,
          stockStatus: prod.stockStatus === 'unknown' ? 'in_stock' : (prod.stockStatus || 'in_stock'),
          stockCount: prod.stockCount || 50,
          isActive: true,
          isFeatured: prod.sale || false,
          customizerTemplateId: prod.customizerTemplateId || null,
        },
      });
      prodCreated++;
    } catch (err: any) {
      prodSkipped++;
      if (prodSkipped <= 5) {
        console.log(`  ⚠️  Skip "${prod.slug.slice(0, 40)}": ${err.message?.slice(0, 60)}`);
      }
    }
  }
  console.log(`  ✅ ${prodCreated} products seeded, ${prodSkipped} skipped`);

  // ─── 5. Coupons ────────────────────────────────
  console.log('\n🎫 Seeding coupons...');
  const coupons = [
    { code: 'WELCOME10', description: '10% off your first order', discountType: 'PERCENTAGE' as const, discountValue: 10, minOrderAmount: 499, maxDiscount: 500, perUserLimit: 1 },
    { code: 'IKONNIC15', description: '15% off sitewide', discountType: 'PERCENTAGE' as const, discountValue: 15, minOrderAmount: 999, maxDiscount: 750, perUserLimit: 3 },
    { code: 'FLAT200', description: '₹200 off on orders above ₹1499', discountType: 'FLAT' as const, discountValue: 200, minOrderAmount: 1499 },
    { code: 'FIRST100', description: '₹100 off first purchase', discountType: 'FLAT' as const, discountValue: 100, perUserLimit: 1 },
    { code: 'SUMMER20', description: '20% Summer Sale discount', discountType: 'PERCENTAGE' as const, discountValue: 20, minOrderAmount: 799, maxDiscount: 1000 },
  ];
  for (const coupon of coupons) {
    await prisma.coupon.upsert({ where: { code: coupon.code }, update: coupon, create: coupon });
  }
  console.log(`  ✅ ${coupons.length} coupons seeded`);

  // ─── 6. Pincode Serviceability ─────────────────
  console.log('\n📍 Seeding pincodes...');
  const pincodes = [
    { pincode: '302034', city: 'Jaipur', state: 'Rajasthan', deliveryDays: 3, codAvailable: true },
    { pincode: '560064', city: 'Bengaluru', state: 'Karnataka', deliveryDays: 3, codAvailable: true },
    { pincode: '400001', city: 'Mumbai', state: 'Maharashtra', deliveryDays: 4, codAvailable: true },
    { pincode: '110001', city: 'New Delhi', state: 'Delhi', deliveryDays: 4, codAvailable: true },
    { pincode: '500001', city: 'Hyderabad', state: 'Telangana', deliveryDays: 5, codAvailable: true },
    { pincode: '600001', city: 'Chennai', state: 'Tamil Nadu', deliveryDays: 5, codAvailable: true },
    { pincode: '700001', city: 'Kolkata', state: 'West Bengal', deliveryDays: 5, codAvailable: true },
    { pincode: '411001', city: 'Pune', state: 'Maharashtra', deliveryDays: 4, codAvailable: true },
    { pincode: '380001', city: 'Ahmedabad', state: 'Gujarat', deliveryDays: 5, codAvailable: true },
    { pincode: '226001', city: 'Lucknow', state: 'Uttar Pradesh', deliveryDays: 5, codAvailable: true },
  ];
  for (const p of pincodes) {
    await prisma.pincodeServiceability.upsert({
      where: { pincode: p.pincode },
      update: p,
      create: { ...p, isServiceable: true },
    });
  }
  console.log(`  ✅ ${pincodes.length} pincodes seeded`);

  // ─── 7. Hero Slides ────────────────────────────
  console.log('\n🖼️  Seeding hero slides...');
  // Clear existing slides
  await prisma.heroSlide.deleteMany();
  const heroSlides = [
    { eyebrow: 'Every wall can tell a story', title: 'Acrylic Wall Photos', description: 'Turn favourite moments into glossy, gallery-ready wall art.', categorySlug: 'acrylic-wall-photo', image: '/images/hero/acrylic-wall-photo.webp', sortOrder: 1 },
    { eyebrow: 'Time, made personal', title: 'Photo Wall Clocks', description: 'A practical centrepiece designed around your people.', categorySlug: 'wall-clocks', image: '/images/hero/wall-clocks.webp', sortOrder: 2 },
    { eyebrow: 'A warmer welcome', title: 'Custom Name Plates', description: 'Modern acrylic signs for homes and studios.', categorySlug: 'acrylic-name-plate', image: '/images/hero/acrylic-name-plate.webp', sortOrder: 3 },
    { eyebrow: 'Carry them close', title: 'Photo Keychains', description: 'Pocket-sized memories that go everywhere with you.', categorySlug: 'personalised-keychains', image: '/images/hero/personalised-keychains.webp', sortOrder: 4 },
  ];
  for (const slide of heroSlides) {
    await prisma.heroSlide.create({ data: slide });
  }
  console.log(`  ✅ ${heroSlides.length} hero slides seeded`);

  // ─── Summary ───────────────────────────────────
  const totalProducts = await prisma.product.count();
  const totalCategories = await prisma.category.count();
  const totalUsers = await prisma.user.count();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ SEED COMPLETE');
  console.log(`  👤 Users: ${totalUsers}`);
  console.log(`  📂 Categories: ${totalCategories}`);
  console.log(`  📦 Products: ${totalProducts}`);
  console.log(`  🎫 Coupons: ${coupons.length}`);
  console.log(`  📍 Pincodes: ${pincodes.length}`);
  console.log(`  🖼️  Hero slides: ${heroSlides.length}`);
  console.log('═══════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
