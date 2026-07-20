-- CreateEnum
CREATE TYPE "InboxType" AS ENUM ('COMMENT', 'MENTION', 'MESSAGE');

-- CreateTable
CREATE TABLE "inbox_items" (
    "id" TEXT NOT NULL,
    "type" "InboxType" NOT NULL,
    "platform" "Platform" NOT NULL,
    "externalId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorUsername" TEXT,
    "authorImage" TEXT,
    "text" TEXT NOT NULL,
    "postUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,

    CONSTRAINT "inbox_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inbox_items_platform_externalId_key" ON "inbox_items"("platform", "externalId");

-- AddForeignKey
ALTER TABLE "inbox_items" ADD CONSTRAINT "inbox_items_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbox_items" ADD CONSTRAINT "inbox_items_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
