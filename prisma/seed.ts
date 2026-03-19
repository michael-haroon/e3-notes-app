/**
 * Seed credentials:
 *   user1@example.com – user10@example.com  /  password123
 *
 * Org structure:
 *   Acme Corp   – users 1-6  (user1=OWNER, user2=ADMIN, rest=MEMBER)
 *   Beta Labs   – users 3-8  (user3=OWNER, user4=ADMIN, rest=MEMBER)
 *   Gamma Inc   – users 5-10 (user5=OWNER, user6=ADMIN, rest=MEMBER)
 *   (overlapping membership: user5,6 are in Acme AND Gamma, etc.)
 *
 * ~10k notes distributed across orgs, with:
 *   - mix of PUBLIC / ORG / PRIVATE visibility
 *   - some notes with 2-4 versions showing content evolution
 *   - tags shared across orgs (engineering, design, etc.) + org-exclusive tags
 *   - 50+ NoteShare entries for PRIVATE notes
 *   - AI summary records on ~5% of notes
 *   - File metadata records on ~2% of notes
 */

import { PrismaClient, Role, Visibility } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// Prisma 7 requires a driver adapter
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/notesapp",
});
const db = new PrismaClient({ adapter });

// ─── Data Fixtures ────────────────────────────────────────────────────────────

const ORGS = [
  { name: "Acme Corp", slug: "acme-corp" },
  { name: "Beta Labs", slug: "beta-labs" },
  { name: "Gamma Inc", slug: "gamma-inc" },
];

// Tags shared across orgs (different IDs per org, same names — tests cross-org search isolation)
const SHARED_TAG_NAMES = ["engineering", "design", "product", "research", "meeting-notes", "roadmap"];
// Org-exclusive tags
const ORG_EXCLUSIVE_TAGS: Record<number, string[]> = {
  0: ["acme-internal", "q2-planning"],
  1: ["beta-experiments", "lab-notes"],
  2: ["gamma-ops", "compliance"],
};

const TITLE_PREFIXES = [
  "Meeting Notes", "Design Doc", "RFC", "Retrospective", "Proposal",
  "Analysis", "Update", "Plan", "Summary", "Bug Report",
  "Post-mortem", "Decision Record", "Investigation", "Architecture Review", "Spec",
];

const TITLE_TOPICS = [
  "Auth Service", "Search Feature", "Mobile App", "Database Migration", "API Gateway",
  "User Onboarding", "Performance Review", "Q2 Roadmap", "Infrastructure", "Security Audit",
  "Billing Integration", "Notification Service", "Dark Mode Support", "Rate Limiting", "Data Pipeline",
  "Access Control", "CI/CD Pipeline", "Caching Strategy", "Error Monitoring", "Feature Flags",
];

// Sentences organised by theme — used to build notes that look realistic and are searchable
const SENTENCES_BY_THEME: Record<string, string[]> = {
  engineering: [
    "We need to improve the performance of the search feature to meet Q3 latency targets.",
    "Engineering sync discussed the database migration timeline and agreed on three phases.",
    "The API gateway refactor should reduce response times by approximately 30% under load.",
    "Technical debt review surfaced three high-priority areas: auth library, logging pipeline, and job queue.",
    "The RFC for distributed tracing was approved after incorporating platform team feedback.",
    "Deployment pipeline now runs in under 8 minutes after parallelizing the integration test suite.",
    "Load testing revealed bottlenecks in the notification service under high-concurrency conditions.",
    "Infrastructure costs stabilized after migrating from on-premise to managed Kubernetes.",
  ],
  product: [
    "Product roadmap for Q2 includes three major feature releases requiring cross-team coordination.",
    "User interviews confirmed filtering and sorting are the most-requested dashboard improvements.",
    "Feature flag for the new dashboard is ready for gradual rollout starting at 5% of users.",
    "We observed a 15% increase in user retention after shipping the improved dashboard experience.",
    "Cross-functional alignment confirmed the go-live date for the new billing integration.",
    "Research findings suggest users prefer simpler navigation with fewer nested menu levels.",
    "The mobile app team is targeting a mid-quarter release pending final QA sign-off.",
  ],
  process: [
    "The new onboarding flow is working well based on user feedback from the last two sprints.",
    "Retrospective action items include improving code review process and updating runbooks.",
    "Security audit is scheduled for next quarter covering authentication and data access controls.",
    "Meeting notes: the team agreed on API versioning strategy and will adopt semver going forward.",
    "Onboarding documentation needs updating for the v2 release before the beta launch.",
    "Marketing campaign reached 50k impressions in the first week, exceeding projections.",
    "Operations team is evaluating new monitoring tools to reduce mean time to resolution.",
  ],
  data: [
    "The new tagging system will replace the current label approach and improve search discoverability.",
    "Bug in the payment flow was identified and patched in a hotfix deployed to production on Friday.",
    "Data pipeline migration is on track for end-of-quarter completion pending final sign-off.",
    "Analytics dashboard now reflects real-time event data with sub-second refresh latency.",
    "Schema migration for the notes table completed successfully with zero downtime using blue-green deploy.",
  ],
};

const ALL_SENTENCES = Object.values(SENTENCES_BY_THEME).flat();

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomContent(sentences = 4): string {
  const theme = pick(Object.keys(SENTENCES_BY_THEME));
  const pool = [...SENTENCES_BY_THEME[theme], ...ALL_SENTENCES.slice(0, 5)];
  return Array.from({ length: sentences }, () => pick(pool)).join(" ");
}

function randomTitle(idx: number): string {
  const prefix = TITLE_PREFIXES[idx % TITLE_PREFIXES.length];
  const topic = TITLE_TOPICS[Math.floor(idx / TITLE_PREFIXES.length) % TITLE_TOPICS.length];
  const rev = Math.floor(idx / (TITLE_PREFIXES.length * TITLE_TOPICS.length)) + 1;
  return `${prefix}: ${topic}${rev > 1 ? ` (v${rev})` : ""}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding database...");

  // Clear existing data in FK-safe order
  await db.auditLog.deleteMany();
  await db.aISummary.deleteMany();
  await db.file.deleteMany();
  await db.noteShare.deleteMany();
  await db.noteTag.deleteMany();
  await db.noteVersion.deleteMany();
  await db.note.deleteMany();
  await db.tag.deleteMany();
  await db.orgInvite.deleteMany();
  await db.orgMember.deleteMany();
  await db.org.deleteMany();
  await db.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // ── Users ──────────────────────────────────────────────────────────────────
  const users = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      db.user.create({
        data: {
          email: `user${i + 1}@example.com`,
          name: `User ${i + 1}`,
          passwordHash,
        },
      })
    )
  );
  console.log(`✓ ${users.length} users`);

  // ── Orgs ───────────────────────────────────────────────────────────────────
  const orgs = await Promise.all(ORGS.map((o) => db.org.create({ data: o })));
  console.log(`✓ ${orgs.length} orgs`);

  // ── Memberships (overlapping) ──────────────────────────────────────────────
  // Acme:  users[0-5]  (0=OWNER, 1=ADMIN, 2-5=MEMBER)
  // Beta:  users[2-7]  (2=OWNER, 3=ADMIN, 4-7=MEMBER)
  // Gamma: users[4-9]  (4=OWNER, 5=ADMIN, 6-9=MEMBER)
  type MemberRecord = { orgId: string; userId: string; role: Role };
  const memberships: MemberRecord[] = [];

  const memberSlices = [
    users.slice(0, 6),
    users.slice(2, 8),
    users.slice(4, 10),
  ];

  for (const [orgIdx, org] of orgs.entries()) {
    for (const [uIdx, user] of memberSlices[orgIdx].entries()) {
      const role: Role = uIdx === 0 ? Role.OWNER : uIdx === 1 ? Role.ADMIN : Role.MEMBER;
      await db.orgMember.create({ data: { orgId: org.id, userId: user.id, role } });
      memberships.push({ orgId: org.id, userId: user.id, role });
    }
  }
  console.log(`✓ ${memberships.length} memberships`);

  // ── Tags (shared names + org-exclusive) ────────────────────────────────────
  const orgTagIds: Record<string, string[]> = {};
  for (const [orgIdx, org] of orgs.entries()) {
    const names = [...SHARED_TAG_NAMES, ...(ORG_EXCLUSIVE_TAGS[orgIdx] ?? [])];
    const tags = await Promise.all(
      names.map((name) => db.tag.create({ data: { name, orgId: org.id } }))
    );
    orgTagIds[org.id] = tags.map((t) => t.id);
  }

  // ── Notes (10 000) ─────────────────────────────────────────────────────────
  const TOTAL = 10_000;
  const BATCH = 100;

  // Weight: ~60% ORG, 20% PUBLIC, 20% PRIVATE
  const VIS_POOL: Visibility[] = [
    Visibility.ORG, Visibility.ORG, Visibility.ORG,
    Visibility.PUBLIC, Visibility.PUBLIC,
    Visibility.PRIVATE, Visibility.PRIVATE,
  ];

  type NoteRecord = { id: string; orgId: string; authorId: string; visibility: Visibility };
  const allNotes: NoteRecord[] = [];
  let noteIdx = 0;

  console.log(`Creating ${TOTAL} notes...`);

  for (let batch = 0; batch < TOTAL / BATCH; batch++) {
    for (let i = 0; i < BATCH; i++) {
      const globalIdx = batch * BATCH + i;
      const org = orgs[globalIdx % orgs.length];
      const orgMembers = memberships.filter((m) => m.orgId === org.id);
      const author = orgMembers[globalIdx % orgMembers.length];
      const visibility = VIS_POOL[globalIdx % VIS_POOL.length];

      const title = randomTitle(globalIdx);
      const content = randomContent(3 + (globalIdx % 4)); // 3-6 sentences

      const note = await db.note.create({
        data: { title, content, visibility, orgId: org.id, authorId: author.userId },
      });

      // v1 always
      await db.noteVersion.create({
        data: { noteId: note.id, version: 1, title, content, authorId: author.userId },
      });

      // 25% of notes get a second version (showing content evolution)
      if (globalIdx % 4 === 0) {
        const updatedContent = content + "\n\nUpdate: " + randomContent(2);
        await db.note.update({ where: { id: note.id }, data: { content: updatedContent } });
        await db.noteVersion.create({
          data: { noteId: note.id, version: 2, title, content: updatedContent, authorId: author.userId },
        });

        // 5% of notes also get a third version
        if (globalIdx % 20 === 0) {
          const v3Content = updatedContent + "\n\nRevision: " + randomContent(2);
          await db.note.update({ where: { id: note.id }, data: { content: v3Content } });
          await db.noteVersion.create({
            data: { noteId: note.id, version: 3, title: `${title} [Final]`, content: v3Content, authorId: author.userId },
          });
        }
      }

      // Tags: 0-2 per note
      const tagPool = orgTagIds[org.id] ?? [];
      const numTags = globalIdx % 3; // 0, 1, or 2
      if (numTags > 0 && tagPool.length > 0) {
        const tagIds = tagPool.slice(globalIdx % tagPool.length, globalIdx % tagPool.length + numTags);
        await db.noteTag.createMany({
          data: tagIds.map((tagId) => ({ noteId: note.id, tagId })),
          skipDuplicates: true,
        });
      }

      // AI summary on every 20th note
      if (globalIdx % 20 === 0) {
        await db.aISummary.create({
          data: {
            noteId: note.id,
            content: JSON.stringify({
              summary: `This note covers ${title.toLowerCase()}, outlining key decisions and next steps.`,
              keyPoints: [
                "Scope and timeline aligned across stakeholders",
                "Dependencies identified and assigned to owners",
                "Follow-up review scheduled for next sprint",
              ],
              topics: [pick(SHARED_TAG_NAMES), pick(SHARED_TAG_NAMES)],
            }),
            model: "llama-3.3-70b-versatile",
            accepted: globalIdx % 40 === 0,
            acceptedAt: globalIdx % 40 === 0 ? new Date() : null,
          },
        });
      }

      // File metadata on every 50th note (no real MinIO upload — storage key is a placeholder)
      if (globalIdx % 50 === 0) {
        await db.file.create({
          data: {
            filename: `attachment-${globalIdx}.pdf`,
            mimeType: "application/pdf",
            size: 1024 * (10 + (globalIdx % 90)), // 10–99 KB
            storageKey: `seed/${org.id}/${note.id}/attachment-${globalIdx}.pdf`,
            orgId: org.id,
            uploaderId: author.userId,
            noteId: note.id,
          },
        });
      }

      allNotes.push({ id: note.id, orgId: org.id, authorId: author.userId, visibility });
      noteIdx++;
    }

    if (batch % 20 === 0) {
      process.stdout.write(`  ${noteIdx}/${TOTAL}\r`);
    }
  }

  console.log(`✓ ${noteIdx} notes created`);

  // ── NoteShare entries (50+ for PRIVATE notes) ──────────────────────────────
  const privateNotes = allNotes.filter((n) => n.visibility === Visibility.PRIVATE).slice(0, 250);
  const seenShares = new Set<string>();
  let shareCount = 0;

  for (const note of privateNotes) {
    if (shareCount >= 60) break;
    const candidates = memberships.filter(
      (m) => m.orgId === note.orgId && m.userId !== note.authorId
    );
    if (candidates.length === 0) continue;
    for (let s = 0; s < Math.min(2, candidates.length) && shareCount < 60; s++) {
      const target = candidates[s % candidates.length];
      const key = `${note.id}:${target.userId}`;
      if (seenShares.has(key)) continue;
      seenShares.add(key);
      await db.noteShare.create({ data: { noteId: note.id, userId: target.userId } });
      shareCount++;
    }
  }
  console.log(`✓ ${shareCount} NoteShare entries`);

  // ── Summary ────────────────────────────────────────────────────────────────
  const counts = {
    notes: await db.note.count(),
    versions: await db.noteVersion.count(),
    tags: await db.tag.count(),
    summaries: await db.aISummary.count(),
    files: await db.file.count(),
    shares: await db.noteShare.count(),
  };

  console.log("\n── Seed summary ──────────────────────────────────");
  console.log(`  Notes:      ${counts.notes}`);
  console.log(`  Versions:   ${counts.versions}`);
  console.log(`  Tags:       ${counts.tags}`);
  console.log(`  AI summaries: ${counts.summaries}`);
  console.log(`  File records: ${counts.files}`);
  console.log(`  NoteShares:   ${counts.shares}`);
  console.log("──────────────────────────────────────────────────");
  console.log("Seed complete! Login: user1@example.com / password123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
