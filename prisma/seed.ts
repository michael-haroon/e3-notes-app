// Seed credentials: user1@example.com through user10@example.com, password: password123

import { PrismaClient, Role, Visibility } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const ORGS = [
  { name: "Acme Corp", slug: "acme-corp" },
  { name: "Beta Labs", slug: "beta-labs" },
  { name: "Gamma Inc", slug: "gamma-inc" },
];

const TAG_NAMES = [
  "engineering",
  "design",
  "product",
  "marketing",
  "ops",
  "research",
  "meeting-notes",
  "roadmap",
  "bug",
  "feature",
  "retrospective",
  "onboarding",
];

const LOREM_SENTENCES = [
  "We need to improve the performance of the search feature significantly to meet our Q3 latency targets.",
  "The new onboarding flow is working well based on user feedback collected over the last two sprints.",
  "Engineering sync discussed the database migration timeline and agreed to proceed in three phases.",
  "Product roadmap for Q2 includes three major feature releases, each requiring cross-team coordination.",
  "Design system needs a thorough update to support dark mode and meet accessibility standards.",
  "Marketing campaign reached 50k impressions in the first week, exceeding our initial projections.",
  "Operations team is evaluating new monitoring tools for production to reduce mean time to resolution.",
  "Research findings suggest users prefer simpler navigation with fewer nested menu levels.",
  "Bug in the payment flow was identified and patched in a hotfix deployed to production on Friday.",
  "Retrospective action items include improving code review process and updating runbooks.",
  "Feature flag for new dashboard is ready for gradual rollout, starting at 5% of users.",
  "Meeting notes: the team agreed on API versioning strategy and will adopt semver going forward.",
  "Onboarding documentation needs to be updated for the v2 release before the beta launch.",
  "Load testing revealed bottlenecks in the notification service under high-concurrency conditions.",
  "Security audit is scheduled for next quarter and will cover authentication and data access controls.",
  "The API gateway refactor is expected to reduce response times by approximately 30% under load.",
  "We observed a 15% increase in user retention after shipping the improved dashboard experience.",
  "Infrastructure costs have stabilized after migrating from on-premise to managed Kubernetes.",
  "The mobile app team is targeting a mid-quarter release pending final QA sign-off.",
  "Cross-functional alignment meeting confirmed the go-live date for the new billing integration.",
  "Technical debt review surfaced three high-priority areas: auth library, logging pipeline, and job queue.",
  "The RFC for distributed tracing was approved after incorporating feedback from the platform team.",
  "User interviews confirmed that filtering and sorting are the most-requested dashboard improvements.",
  "Deployment pipeline now runs in under 8 minutes after parallelizing the integration test suite.",
  "The new tagging system will replace the current label approach and improve search discoverability.",
];

function randomParagraph(sentences: number = 4): string {
  const result: string[] = [];
  for (let i = 0; i < sentences; i++) {
    result.push(LOREM_SENTENCES[Math.floor(Math.random() * LOREM_SENTENCES.length)]);
  }
  return result.join(" ");
}

const TITLE_PREFIXES = [
  "Meeting Notes",
  "Design Doc",
  "Spec",
  "RFC",
  "Retrospective",
  "Proposal",
  "Analysis",
  "Update",
  "Plan",
  "Summary",
  "Bug Report",
  "Post-mortem",
  "Decision Record",
  "Investigation",
  "Architecture Review",
];

const TITLE_TOPICS = [
  "Auth Service",
  "Search Feature",
  "Mobile App",
  "Database Migration",
  "API Gateway",
  "User Onboarding",
  "Performance Review",
  "Q2 Roadmap",
  "Infrastructure",
  "Security Audit",
  "Billing Integration",
  "Notification Service",
  "Dark Mode Support",
  "Rate Limiting",
  "Data Pipeline",
  "Access Control",
  "CI/CD Pipeline",
  "Caching Strategy",
  "Error Monitoring",
  "Feature Flags",
];

function randomTitle(index: number): string {
  const prefix = TITLE_PREFIXES[index % TITLE_PREFIXES.length];
  const topic = TITLE_TOPICS[index % TITLE_TOPICS.length];
  return `${prefix}: ${topic} ${Math.floor(index / TITLE_PREFIXES.length) + 1}`;
}

async function main() {
  console.log("Seeding database...");

  // Clear existing data
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

  // Create 10 users
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
  console.log(`Created ${users.length} users`);

  // Create 3 orgs
  const orgs = await Promise.all(
    ORGS.map((org) => db.org.create({ data: org }))
  );
  console.log(`Created ${orgs.length} orgs`);

  // Assign users to orgs with varying roles
  const orgMemberships: { orgId: string; userId: string; role: Role }[] = [];

  for (const [orgIdx, org] of orgs.entries()) {
    // Each org gets some users; overlapping
    const orgUsers = users.slice(orgIdx * 2, orgIdx * 2 + 6);
    for (const [userIdx, user] of orgUsers.entries()) {
      const role: Role =
        userIdx === 0 ? Role.OWNER : userIdx === 1 ? Role.ADMIN : Role.MEMBER;
      await db.orgMember.create({
        data: { orgId: org.id, userId: user.id, role },
      });
      orgMemberships.push({ orgId: org.id, userId: user.id, role });
    }
  }
  console.log(`Created ${orgMemberships.length} memberships`);

  // Create tags per org
  const orgTags: Record<string, string[]> = {};
  for (const org of orgs) {
    const tags = await Promise.all(
      TAG_NAMES.slice(0, 8).map((name) =>
        db.tag.create({ data: { name, orgId: org.id } })
      )
    );
    orgTags[org.id] = tags.map((t) => t.id);
  }

  // Create ~10k notes distributed across orgs, in batches of 100
  const TOTAL_NOTES = 10000;
  const BATCH_SIZE = 100;
  let noteCount = 0;

  const visibilities: Visibility[] = [
    Visibility.PUBLIC,
    Visibility.ORG,
    Visibility.ORG,
    Visibility.ORG,
    Visibility.PRIVATE,
  ];

  console.log(`Creating ${TOTAL_NOTES} notes in batches...`);

  // Collect all created notes for NoteShare seeding
  const createdNotes: { id: string; orgId: string; authorId: string; visibility: Visibility }[] = [];

  for (let batch = 0; batch < TOTAL_NOTES / BATCH_SIZE; batch++) {
    const noteData = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const globalIdx = batch * BATCH_SIZE + i;
      const org = orgs[globalIdx % orgs.length];
      const members = orgMemberships.filter((m) => m.orgId === org.id);
      if (members.length === 0) continue;
      const author = members[globalIdx % members.length];
      const visibility = visibilities[globalIdx % visibilities.length];
      const title = randomTitle(globalIdx);
      const numSentences = Math.floor(Math.random() * 3) + 3; // 3-5 sentences
      const content = randomParagraph(numSentences);

      noteData.push({
        org,
        authorId: author.userId,
        visibility,
        title,
        content,
        tags: orgTags[org.id]?.slice(0, Math.floor(Math.random() * 3)) ?? [],
      });
    }

    // Create notes
    for (const nd of noteData) {
      const note = await db.note.create({
        data: {
          title: nd.title,
          content: nd.content,
          visibility: nd.visibility,
          orgId: nd.org.id,
          authorId: nd.authorId,
        },
      });

      createdNotes.push({ id: note.id, orgId: nd.org.id, authorId: nd.authorId, visibility: nd.visibility });

      // Create initial version
      await db.noteVersion.create({
        data: {
          noteId: note.id,
          version: 1,
          title: nd.title,
          content: nd.content,
          authorId: nd.authorId,
        },
      });

      // Some notes get a second version
      if (noteCount % 5 === 0) {
        const updatedContent = nd.content + " " + randomParagraph(2);
        await db.note.update({
          where: { id: note.id },
          data: { content: updatedContent, updatedAt: new Date() },
        });
        await db.noteVersion.create({
          data: {
            noteId: note.id,
            version: 2,
            title: nd.title,
            content: updatedContent,
            authorId: nd.authorId,
          },
        });
      }

      // Assign tags
      if (nd.tags.length > 0) {
        await db.noteTag.createMany({
          data: nd.tags.map((tagId) => ({ noteId: note.id, tagId })),
          skipDuplicates: true,
        });
      }

      // Some notes get AI summaries
      if (noteCount % 20 === 0) {
        await db.aISummary.create({
          data: {
            noteId: note.id,
            content: JSON.stringify({
              summary:
                "This note covers " +
                nd.title.toLowerCase() +
                ", detailing key decisions and next steps agreed upon by the team.",
              keyPoints: [
                "Alignment reached on scope and timeline",
                "Dependencies identified and assigned to owners",
                "Follow-up review scheduled for next sprint",
              ],
              topics: ["engineering", "planning", "collaboration"],
            }),
            model: "llama-3.3-70b-versatile",
            accepted: noteCount % 40 === 0,
            acceptedAt: noteCount % 40 === 0 ? new Date() : null,
          },
        });
      }

      noteCount++;
    }

    if (batch % 10 === 0) {
      console.log(`  ${noteCount}/${TOTAL_NOTES} notes created`);
    }
  }

  console.log(`Total notes created: ${noteCount}`);

  // Add ~50 NoteShare entries between org members for testing shared-with-me
  console.log("Creating NoteShare entries...");
  let shareCount = 0;
  const privateNotes = createdNotes.filter((n) => n.visibility === Visibility.PRIVATE).slice(0, 200);
  const seenShares = new Set<string>();

  for (const note of privateNotes) {
    if (shareCount >= 50) break;
    const orgMembers = orgMemberships.filter(
      (m) => m.orgId === note.orgId && m.userId !== note.authorId
    );
    if (orgMembers.length === 0) continue;
    // Share with 1-2 members
    const numShares = Math.min(Math.floor(Math.random() * 2) + 1, orgMembers.length);
    for (let s = 0; s < numShares && shareCount < 50; s++) {
      const target = orgMembers[s % orgMembers.length];
      const key = `${note.id}:${target.userId}`;
      if (seenShares.has(key)) continue;
      seenShares.add(key);
      await db.noteShare.create({
        data: {
          noteId: note.id,
          userId: target.userId,
        },
      });
      shareCount++;
    }
  }
  console.log(`Created ${shareCount} NoteShare entries`);

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
