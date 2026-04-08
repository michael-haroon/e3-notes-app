/**
 * One-time script: imports all existing DB users into Clerk.
 * Run with: CLERK_SECRET_KEY=sk_test_... npx tsx scripts/import-users-to-clerk.ts
 *
 * What it does:
 * - Reads every user from Postgres
 * - Creates them in Clerk with a temporary password (or skips if already exists)
 * - Users will be prompted to reset password on first login, OR you can
 *   set a known temp password below so they can sign in immediately
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY) {
  console.error("Set CLERK_SECRET_KEY env var");
  process.exit(1);
}

// Change this to whatever password you want for all imported accounts
const TEMP_PASSWORD = "password123"; // original seed password

async function main() {
  const users = await db.user.findMany({ where: { clerkId: null } });
  console.log(`Found ${users.length} users without a clerkId`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const res = await fetch("https://api.clerk.com/v1/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLERK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: [user.email],
          username: user.email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "_"),
          password: TEMP_PASSWORD,
          skip_password_checks: true,
          ...(user.name ? { first_name: user.name.split(" ")[0], last_name: user.name.split(" ").slice(1).join(" ") || undefined } : {}),
        }),
      });

      const data = await res.json() as { id?: string; errors?: { message: string; code?: string }[]; error?: string };

      if (res.ok && data.id) {
        await db.user.update({
          where: { id: user.id },
          data: { clerkId: data.id },
        });
        console.log(`✓ ${user.email} → ${data.id}`);
        created++;
      } else if (data.errors?.[0]?.code === "form_identifier_exists" || data.errors?.[0]?.message?.toLowerCase().includes("already")) {
        console.log(`  ${user.email} — already in Clerk, skipping`);
        skipped++;
      } else {
        console.error(`✗ ${user.email}: ${JSON.stringify(data.errors ?? data)}`);
        failed++;
      }
    } catch (err) {
      console.error(`✗ ${user.email}:`, err);
      failed++;
    }

    // Clerk rate limit: ~20 req/s on dev keys
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped, ${failed} failed`);
  console.log(`Temp password for all accounts: "${TEMP_PASSWORD}"`);
}

main().finally(() => db.$disconnect());
