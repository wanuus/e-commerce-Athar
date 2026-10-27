# ATHAR (آثر) — Fashion E-commerce

Phase 1 foundation: Next.js 15 (App Router) · TypeScript strict · Tailwind · Prisma + PostgreSQL · Auth.js · next-intl (Arabic RTL default + English).

## ATHAR store: overview
Full documentation (daily use, admin guide, deployment, going live, troubleshooting) is in the separate **ATHAR Guide** document that came with this release.

**Storefront:** Arabic-first (RTL) + English; shop with search/filters/sorting; product pages with color/size variants and per-variant stock; guest cart; promo codes; checkout with Egyptian address/phone validation and governorate shipping fees; Cash on Delivery and card (Paymob, plus a DEV-ONLY test gateway); confirmation emails; "notify me when available"; SEO (sitemap, robots, hreflang, structured data); consent-based Google Analytics 4.

**Admin portal** (`/ar/admin/login`): dashboard, orders (full lifecycle, COD cash, refunds, tracking), products + variants + Cloudinary images, inventory, discounts, shipping zones, customers, reviews, subscribers, users/roles, audit log, Settings -> Brand Identity (names, logo, colors, hero, announcement, SEO).

**Security & reliability:** server-side role checks on every admin page/action, login lockout, rate limits on public forms, strict production security headers (CSP, HSTS), signed + verified payment webhooks, idempotent orders/payments, error reporting to Sentry (optional), error and 404 pages.

**Testing:** `npm test` (40 unit tests) and `npm run test:e2e` (Playwright browser tests; needs the demo seed).

## Testing the order flow (development)
1. `SEED_DEMO="true"` then `npm run db:seed` (adds demo T-shirts and the code `WELCOME10`).
2. Open /shop, pick a product, choose color + size, Add to cart, open the cart, apply `WELCOME10`.
3. Checkout with a test address (phone like `01012345678`). Choose **Cash on delivery** -> order page; the "email" prints in the terminal running `npm run dev`.
4. Repeat with **Card**: you are sent to the TEST gateway page (no money moves). Click "Simulate successful payment" -> order becomes Paid and stock is committed.
5. Try picking a sold-out size: the button is disabled; select a color/size with 0 stock to see "Notify me when available".

## Paymob (real card payments)
1. Create a Paymob Accept merchant account and a **card integration** (test mode first).
2. Put `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`, `PAYMOB_INTEGRATION_ID`, `PAYMOB_HMAC_SECRET` in `.env` (Vercel env vars in production).
3. Paymob must reach your server to confirm payments: in production set the transaction-processed callback to `https://YOUR-DOMAIN/api/webhooks/paymob`. Locally use a tunnel (e.g. `ngrok http 3000`) and set `NEXT_PUBLIC_SITE_URL` to the tunnel URL.
4. Test every payment method you enable in test mode. A browser redirect is never treated as proof of payment; only the verified webhook marks an order paid.
5. Refunds: `refundPayment` is implemented but NOT verified against live Paymob. Refund from the Paymob dashboard until it is tested.

## Run it on your Mac

1. **Install tools** (Terminal):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"   # skip if you have Homebrew
   brew install git node@22 postgresql@16
   brew link --force --overwrite node@22
   brew services start postgresql@16
   echo 'export PATH="$(brew --prefix postgresql@16)/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
   createdb athar
   ```
2. **Unzip** this project, then `cd` into the folder (e.g. `cd ~/Projects/athar-store`).
3. **Environment**:
   ```bash
   cp .env.example .env
   openssl rand -base64 32      # paste the output as AUTH_SECRET in .env
   ```
   Edit `.env`: set `DATABASE_URL` (replace YOUR_MAC_USERNAME with the output of `whoami`), choose `SEED_ADMIN_EMAIL` and a `SEED_ADMIN_PASSWORD` (12+ characters), and set `SEED_DEMO="true"` for demo T-shirts.
4. **Install, create tables, seed, run**:
   ```bash
   npm install
   npx prisma migrate dev --name init
   npm run db:seed
   npm run dev
   ```
5. Open http://localhost:3000 (Arabic) · http://localhost:3000/en · admin: http://localhost:3000/ar/admin/login

Useful: `npm run typecheck` · `npm test` · `npm run db:studio` (browse the database) · http://localhost:3000/api/health

## Updating to a newer zip (keeps your .env, node_modules and database)
```bash
cd ~/Downloads && unzip -o athar-store-phase4.zip -d athar-phase4
rsync -a --exclude node_modules --exclude .env --exclude .next ~/Downloads/athar-phase4/athar-store/ ~/Projects/athar-store/
cd ~/Projects/athar-store
npm install
npx prisma migrate dev --name phase4_admin    # answer y; it only adds columns
npm run db:seed
npm run dev
```
Adjust the two paths if your zip or project live elsewhere. Your database history in `prisma/migrations` is never overwritten.

## Troubleshooting
- `ECONNREFUSED` / can't reach database → `brew services start postgresql@16`, re-check `DATABASE_URL`.
- `role "..." does not exist` → use your Mac username from `whoami` in `DATABASE_URL`.
- Port 3000 busy → `npm run dev -- -p 3001`.

## Going live (after the remaining phases)
Accounts: GitHub, Vercel, Neon (Postgres), Cloudinary, Paymob, Resend, a domain. Production: push to GitHub → import in Vercel → set the env vars → `npx prisma migrate deploy` against Neon → run the seed **without** `SEED_DEMO`. Real payments need Paymob merchant approval; never go live without a full test order in Paymob's test mode.
