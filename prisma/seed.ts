import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // --- Admin (credentials come from .env, never from source) ---
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");
    await prisma.user.upsert({
      where: { email },
      update: { role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) },
      create: { email, name: "Admin", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) },
    });
    console.log(`Admin ready: ${email}`);
  } else {
    console.log("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set: no admin created.");
  }

  // --- Base data needed in every environment ---
  await prisma.category.upsert({
    where: { slug: "t-shirts" },
    update: {},
    create: { slug: "t-shirts", nameAr: "تيشيرتات", nameEn: "T-Shirts", sortOrder: 1 },
  });

  // Starting shipping rules: EDIT THESE in the admin (or here) to your real courier rates.
  if ((await prisma.shippingZone.count()) === 0) {
    await prisma.shippingZone.createMany({
      data: [
        { nameAr: "القاهرة والجيزة", nameEn: "Cairo & Giza", governorates: ["Cairo", "Giza"], fee: 5000, freeThreshold: 150000, estimatedDays: 2 },
        { nameAr: "الإسكندرية والمدن الكبرى", nameEn: "Alexandria & major cities", governorates: ["Alexandria", "Qalyubia", "Sharqia", "Dakahlia", "Gharbia"], fee: 7000, freeThreshold: 150000, estimatedDays: 3 },
        { nameAr: "باقي المحافظات", nameEn: "Other governorates", governorates: [], fee: 9000, freeThreshold: 150000, estimatedDays: 5 },
      ],
    });
  }

  // --- Demo catalog: development only ---
  const isLocalDb = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");
  if (process.env.SEED_DEMO === "true" && !isLocalDb) console.warn("SEED_DEMO ignored: DATABASE_URL is not a local database.");
  if (process.env.SEED_DEMO === "true" && isLocalDb) {
    const cat = await prisma.category.findUniqueOrThrow({ where: { slug: "t-shirts" } });
    const colors = [
      { colorName: "Olive", colorNameAr: "زيتي", colorHex: "#7E9073" },
      { colorName: "White", colorNameAr: "أبيض", colorHex: "#FFFFFF" },
      { colorName: "Black", colorNameAr: "أسود", colorHex: "#111111" },
      { colorName: "Navy", colorNameAr: "كحلي", colorHex: "#1F3044" },
    ];
    const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
    const demo = [
      { slug: "classic-oversized-tee", sku: "ATH-TEE-001", nameAr: "تيشيرت أوفرسايز كلاسيك", nameEn: "Classic Oversized T-Shirt", basePrice: 79900, compareAtPrice: 99900, soldCount: 42 },
      { slug: "essential-crew-tee", sku: "ATH-TEE-002", nameAr: "تيشيرت إسنشيال", nameEn: "Essential Crew Tee", basePrice: 59900, compareAtPrice: null, soldCount: 18 },
      { slug: "heavyweight-boxy-tee", sku: "ATH-TEE-003", nameAr: "تيشيرت بوكسي ثقيل", nameEn: "Heavyweight Boxy Tee", basePrice: 89900, compareAtPrice: null, soldCount: 7 },
    ];
    for (const [i, p] of demo.entries()) {
      const exists = await prisma.product.findUnique({ where: { slug: p.slug } });
      if (exists) continue;
      await prisma.product.create({
        data: {
          ...p,
          categoryId: cat.id,
          status: "ACTIVE",
          isFeatured: i === 0,
          material: "100% Cotton",
          shortDescAr: "قطن مريح بقصّة عصرية.",
          shortDescEn: "Comfortable cotton with a modern cut.",
          variants: {
            create: colors.flatMap((c, ci) =>
              sizes.map((s, si) => ({
                ...c,
                size: s,
                sku: `${p.sku}-${c.colorName.toUpperCase()}-${s}`,
                stock: (ci + si + i) % 5 === 0 ? 0 : 3 + ((ci * 7 + si * 3 + i) % 15),
              })),
            ),
          },
        },
      });
    }
    await prisma.discount.upsert({
      where: { code: "WELCOME10" },
      update: {},
      create: { code: "WELCOME10", type: "PERCENT", value: 10 },
    });
    console.log("Demo products + WELCOME10 code created (development only).");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
