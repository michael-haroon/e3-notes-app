/**
 * Seed credentials:  user1@example.com – user10@example.com  /  password123
 *
 * Org structure (designed for easy review):
 *   Acme Corp  — users 1,2,3,4,5,6  (user1=OWNER, user2=ADMIN, rest=MEMBER)
 *   Beta Labs  — users 1,2,7,8,9    (user1=OWNER, user2=ADMIN, rest=MEMBER)
 *   Gamma Inc  — users 1,3,4        (user1=OWNER, user3=ADMIN, user4=MEMBER)
 *   user10 belongs to NO org (demonstrates the empty-state flow)
 *
 * Notes: ~10k across 3 orgs, mix of ORG/PRIVATE visibility
 * Versions: 25% of notes have 2 versions, 5% have 3 (content evolution)
 * Shares: 60+ PRIVATE notes shared with org members
 * AI summaries: every 20th note
 * File records: every 50th note (placeholder storageKeys)
 * Audit logs: login, note.create, note.update, org.create events
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { Role, Visibility } from "../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/notesapp",
});
const db = new PrismaClient({ adapter });

const ORGS = [
  { name: "Acme Corp", slug: "acme-corp" },
  { name: "Beta Labs", slug: "beta-labs" },
  { name: "Gamma Inc", slug: "gamma-inc" },
];

const SHARED_TAG_NAMES = ["engineering", "design", "product", "research", "meeting-notes", "roadmap"];
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

const SENTENCES: string[] = [
  "We need to improve the performance of the search feature to meet Q3 latency targets.",
  "Engineering sync discussed the database migration timeline and agreed on three phases.",
  "The API gateway refactor should reduce response times by approximately 30% under load.",
  "Technical debt review surfaced three high-priority areas: auth library, logging pipeline, and job queue.",
  "The RFC for distributed tracing was approved after incorporating platform team feedback.",
  "Deployment pipeline now runs in under 8 minutes after parallelizing the integration test suite.",
  "Load testing revealed bottlenecks in the notification service under high-concurrency conditions.",
  "Infrastructure costs stabilized after migrating from on-premise to managed Kubernetes.",
  "Product roadmap for Q2 includes three major feature releases requiring cross-team coordination.",
  "User interviews confirmed filtering and sorting are the most-requested dashboard improvements.",
  "Feature flag for the new dashboard is ready for gradual rollout starting at 5% of users.",
  "We observed a 15% increase in user retention after shipping the improved dashboard experience.",
  "Research findings suggest users prefer simpler navigation with fewer nested menu levels.",
  "The new onboarding flow is working well based on user feedback from the last two sprints.",
  "Retrospective action items include improving code review process and updating runbooks.",
  "Security audit is scheduled for next quarter covering authentication and data access controls.",
  "Meeting notes: the team agreed on API versioning strategy and will adopt semver going forward.",
  "Analytics dashboard now reflects real-time event data with sub-second refresh latency.",
  "Schema migration for the notes table completed successfully with zero downtime.",
  "Data pipeline migration is on track for end-of-quarter completion pending final sign-off.",
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomContent(n = 4): string { return Array.from({ length: n }, () => pick(SENTENCES)).join(" "); }
function randomTitle(idx: number): string {
  const prefix = TITLE_PREFIXES[idx % TITLE_PREFIXES.length];
  const topic = TITLE_TOPICS[Math.floor(idx / TITLE_PREFIXES.length) % TITLE_TOPICS.length];
  const rev = Math.floor(idx / (TITLE_PREFIXES.length * TITLE_TOPICS.length)) + 1;
  return `${prefix}: ${topic}${rev > 1 ? ` (rev ${rev})` : ""}`;
}

async function main() {
  console.log("Seeding database...");

  // Clear in FK-safe order
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

  const hash = await bcrypt.hash("password123", 10);

  // ── Users ──────────────────────────────────────────────────────────────────
  const users = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      db.user.create({ data: { email: `user${i + 1}@example.com`, name: `User ${i + 1}`, passwordHash: hash } })
    )
  );
  console.log(`✓ ${users.length} users (user10 has no org membership)`);

  // ── Orgs ───────────────────────────────────────────────────────────────────
  const orgs = await Promise.all(ORGS.map((o) => db.org.create({ data: o })));
  console.log(`✓ ${orgs.length} orgs`);

  // Audit: org.create for each org (by user1)
  for (const org of orgs) {
    await db.auditLog.create({
      data: { action: "org.create", userId: users[0].id, orgId: org.id, resourceId: org.id, resourceType: "org" },
    });
  }

  // ── Memberships ────────────────────────────────────────────────────────────
  // Acme:  user1(OWNER), user2(ADMIN), user3,4,5,6 (MEMBER)
  // Beta:  user1(OWNER), user2(ADMIN), user7,8,9   (MEMBER)
  // Gamma: user1(OWNER), user3(ADMIN), user4        (MEMBER)
  // user10: no orgs
  type MemberRecord = { orgId: string; userId: string; role: Role };
  const memberships: MemberRecord[] = [];

  const memberConfig: [number, number, Role][][] = [
    // Acme
    [[0,0,Role.OWNER],[1,1,Role.ADMIN],[0,2,Role.MEMBER],[0,3,Role.MEMBER],[0,4,Role.MEMBER],[0,5,Role.MEMBER]],
    // Beta
    [[1,0,Role.OWNER],[1,1,Role.ADMIN],[1,6,Role.MEMBER],[1,7,Role.MEMBER],[1,8,Role.MEMBER]],
    // Gamma
    [[2,0,Role.OWNER],[2,2,Role.ADMIN],[2,3,Role.MEMBER]],
  ];
  // Format: [orgIdx, userIdx, role]

  const rawMembers: [number, number, Role][] = [
    [0,0,Role.OWNER],[0,1,Role.ADMIN],[0,2,Role.MEMBER],[0,3,Role.MEMBER],[0,4,Role.MEMBER],[0,5,Role.MEMBER],
    [1,0,Role.OWNER],[1,1,Role.ADMIN],[1,6,Role.MEMBER],[1,7,Role.MEMBER],[1,8,Role.MEMBER],
    [2,0,Role.OWNER],[2,2,Role.ADMIN],[2,3,Role.MEMBER],
  ];

  for (const [orgIdx, userIdx, role] of rawMembers) {
    const m = await db.orgMember.create({
      data: { orgId: orgs[orgIdx].id, userId: users[userIdx].id, role },
    });
    memberships.push({ orgId: orgs[orgIdx].id, userId: users[userIdx].id, role });
    // Audit: org.join
    await db.auditLog.create({
      data: { action: "org.join", userId: users[userIdx].id, orgId: orgs[orgIdx].id, resourceId: m.id, resourceType: "org_member" },
    });
  }
  console.log(`✓ ${memberships.length} memberships (user1 is in all 3 orgs, user10 is in none)`);

  // ── Tags ───────────────────────────────────────────────────────────────────
  const orgTagIds: Record<string, string[]> = {};
  for (const [orgIdx, org] of orgs.entries()) {
    const names = [...SHARED_TAG_NAMES, ...(ORG_EXCLUSIVE_TAGS[orgIdx] ?? [])];
    const tags = await Promise.all(names.map((name) => db.tag.create({ data: { name, orgId: org.id } })));
    orgTagIds[org.id] = tags.map((t) => t.id);
  }

  // ── Notes (10 000) ─────────────────────────────────────────────────────────
  const TOTAL = 10_000;
  // 70% ORG, 30% PRIVATE (no PUBLIC)
  const VIS_POOL: Visibility[] = [
    Visibility.ORG, Visibility.ORG, Visibility.ORG, Visibility.ORG,
    Visibility.ORG, Visibility.ORG, Visibility.ORG,
    Visibility.PRIVATE, Visibility.PRIVATE, Visibility.PRIVATE,
  ];

  type NoteRecord = { id: string; orgId: string; authorId: string; visibility: Visibility };
  const allNotes: NoteRecord[] = [];
  let noteIdx = 0;

  console.log(`Creating ${TOTAL} notes...`);

  for (let i = 0; i < TOTAL; i++) {
    const org = orgs[i % orgs.length];
    const orgMembers = memberships.filter((m) => m.orgId === org.id);
    const author = orgMembers[i % orgMembers.length];
    const visibility = VIS_POOL[i % VIS_POOL.length];
    const title = randomTitle(i);
    const content = randomContent(3 + (i % 4));

    const note = await db.note.create({
      data: { title, content, visibility, orgId: org.id, authorId: author.userId },
    });

    // v1 always
    await db.noteVersion.create({
      data: { noteId: note.id, version: 1, title, content, authorId: author.userId },
    });

    // 25% get v2 (content evolution)
    if (i % 4 === 0) {
      const v2 = content + "\n\nUpdate: " + randomContent(2);
      await db.note.update({ where: { id: note.id }, data: { content: v2 } });
      await db.noteVersion.create({ data: { noteId: note.id, version: 2, title, content: v2, authorId: author.userId } });
      // Audit for the update
      if (i % 8 === 0) {
        await db.auditLog.create({
          data: { action: "note.update", userId: author.userId, orgId: org.id, resourceId: note.id, resourceType: "note" },
        });
      }

      // 5% also get v3
      if (i % 20 === 0) {
        const v3 = v2 + "\n\nRevision: " + randomContent(2);
        await db.note.update({ where: { id: note.id }, data: { content: v3 } });
        await db.noteVersion.create({
          data: { noteId: note.id, version: 3, title: `${title} [Final]`, content: v3, authorId: author.userId },
        });
      }
    }

    // Tags: 0-2 per note
    const tagPool = orgTagIds[org.id] ?? [];
    const numTags = i % 3;
    if (numTags > 0 && tagPool.length > 0) {
      const tagIds = tagPool.slice(i % tagPool.length, i % tagPool.length + numTags);
      await db.noteTag.createMany({ data: tagIds.map((tagId) => ({ noteId: note.id, tagId })), skipDuplicates: true });
    }

    // AI summary every 20th note
    if (i % 20 === 0) {
      await db.aISummary.create({
        data: {
          noteId: note.id,
          content: JSON.stringify({
            summary: `This note covers ${title.toLowerCase()}, outlining key decisions and next steps.`,
            keyPoints: ["Scope aligned", "Dependencies assigned", "Review scheduled"],
            topics: [pick(SHARED_TAG_NAMES), pick(SHARED_TAG_NAMES)],
          }),
          model: "llama-3.3-70b-versatile",
          accepted: i % 40 === 0,
          acceptedAt: i % 40 === 0 ? new Date() : null,
        },
      });
    }

    // File record every 50th note
    if (i % 50 === 0) {
      await db.file.create({
        data: {
          filename: `attachment-${i}.pdf`,
          mimeType: "application/pdf",
          size: 1024 * (10 + (i % 90)),
          storageKey: `seed/${org.id}/${note.id}/attachment-${i}.pdf`,
          orgId: org.id,
          uploaderId: author.userId,
          noteId: note.id,
        },
      });
    }

    // Audit: note.create every 10th note (to avoid flooding the log table)
    if (i % 10 === 0) {
      await db.auditLog.create({
        data: { action: "note.create", userId: author.userId, orgId: org.id, resourceId: note.id, resourceType: "note" },
      });
    }

    allNotes.push({ id: note.id, orgId: org.id, authorId: author.userId, visibility });
    noteIdx++;

    if (i % 1000 === 0 && i > 0) process.stdout.write(`  ${i}/${TOTAL}\r`);
  }
  console.log(`✓ ${noteIdx} notes`);

  // ── NoteShares for PRIVATE notes ──────────────────────────────────────────
  const privateNotes = allNotes.filter((n) => n.visibility === Visibility.PRIVATE).slice(0, 250);
  const seen = new Set<string>();
  let shareCount = 0;

  for (const note of privateNotes) {
    if (shareCount >= 60) break;
    const candidates = memberships.filter((m) => m.orgId === note.orgId && m.userId !== note.authorId);
    if (!candidates.length) continue;
    for (let s = 0; s < Math.min(2, candidates.length) && shareCount < 60; s++) {
      const target = candidates[s % candidates.length];
      const key = `${note.id}:${target.userId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      await db.noteShare.create({ data: { noteId: note.id, userId: target.userId } });
      await db.auditLog.create({
        data: { action: "note.share", userId: note.authorId, orgId: note.orgId, resourceId: note.id, resourceType: "note", metadata: { sharedWith: target.userId } },
      });
      shareCount++;
    }
  }
  console.log(`✓ ${shareCount} NoteShare entries`);

  // ── Audit: simulate some auth.login events ─────────────────────────────────
  for (let i = 0; i < 20; i++) {
    const user = users[i % 9]; // users 1-9 (not user10 who has no org)
    await db.auditLog.create({
      data: { action: "auth.login", userId: user.id, metadata: { at: new Date(Date.now() - i * 3600_000).toISOString() } },
    });
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const counts = {
    notes: await db.note.count(),
    versions: await db.noteVersion.count(),
    summaries: await db.aISummary.count(),
    files: await db.file.count(),
    shares: await db.noteShare.count(),
    auditLogs: await db.auditLog.count(),
  };

  console.log("\n── Seed summary ──────────────────────────────────────");
  console.log(`  Notes:        ${counts.notes}`);
  console.log(`  Versions:     ${counts.versions}`);
  console.log(`  AI summaries: ${counts.summaries}`);
  console.log(`  File records: ${counts.files}`);
  console.log(`  NoteShares:   ${counts.shares}`);
  console.log(`  Audit logs:   ${counts.auditLogs}`);
  console.log("─────────────────────────────────────────────────────");
  console.log("Login: user1@example.com / password123  (in all 3 orgs)");
  console.log("       user10@example.com / password123 (no org — empty state)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
