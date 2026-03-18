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
  "We need to improve the performance of the search feature significantly.",
  "The new onboarding flow is working well based on user feedback.",
  "Engineering sync discussed the database migration timeline.",
  "Product roadmap for Q2 includes three major feature releases.",
  "Design system needs a thorough update to support dark mode.",
  "Marketing campaign reached 50k impressions in the first week.",
  "Operations team is evaluating new monitoring tools for production.",
  "Research findings suggest users prefer simpler navigation.",
  "Bug in the payment flow was identified and patched in hotfix.",
  "Retrospective action items: improve code review process.",
  "Feature flag for new dashboard is ready for gradual rollout.",
  "Meeting notes: agreed on API versioning strategy going forward.",
  "Onboarding documentation needs to be updated for v2 release.",
  "Load testing revealed bottlenecks in the notification service.",
  "Security audit scheduled for next quarter.",
];

function randomParagraph(sentences: number = 5): string {
  const result: string[] = [];
  for (let i = 0; i < sentences; i++) {
    result.push(LOREM_SENTENCES[Math.floor(Math.random() * LOREM_SENTENCES.length)]);
  }
  return result.join(" ");
}

function randomTitle(index: number): string {
  const prefixes = [
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
  ];
  const topics = [
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
  ];
  return `${prefixes[index % prefixes.length]}: ${topics[index % topics.length]} ${Math.floor(index / 10) + 1}`;
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
      const content = randomParagraph(Math.floor(Math.random() * 8) + 3);

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
        const updatedContent = nd.content + " Updated: " + randomParagraph(2);
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
              summary: "This note discusses " + nd.title.toLowerCase() + ".",
              keyPoints: ["Key point 1", "Key point 2"],
              topics: ["engineering", "planning"],
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
  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
