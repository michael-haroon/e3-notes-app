-- Add pinnedAt to notes
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP(3);

-- CreateTable: note_templates
CREATE TABLE IF NOT EXISTS "note_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "orgId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "note_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "note_templates_orgId_idx" ON "note_templates"("orgId");

ALTER TABLE "note_templates" ADD CONSTRAINT "note_templates_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: comments
CREATE TABLE IF NOT EXISTS "comments" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "comments_noteId_idx" ON "comments"("noteId");

ALTER TABLE "comments" ADD CONSTRAINT "comments_noteId_fkey"
    FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
