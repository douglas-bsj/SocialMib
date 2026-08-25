import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserWorkspace } from "@/lib/workspace";
import { AnalyticsClient } from "./analytics-client";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDay(date: Date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

const PLATFORM_LABELS: Record<string, string> = {
  TWITTER: "Twitter / X",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  PINTEREST: "Pinterest",
  REDDIT: "Reddit",
  BLUESKY: "Bluesky",
  THREADS: "Threads",
};

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspace = await getUserWorkspace(session.user.id);

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">Nenhum workspace encontrado.</p>
      </div>
    );
  }

  const since30 = daysAgo(30);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalPublished,
    totalFailed,
    totalScheduled,
    totalAccounts,
    postsLast30,
    postSocialAccountsLast30,
    recentPublished,
  ] = await Promise.all([
    db.post.count({ where: { workspaceId: workspace.id, status: "PUBLISHED" } }),
    db.post.count({ where: { workspaceId: workspace.id, status: "FAILED" } }),
    db.post.count({ where: { workspaceId: workspace.id, status: "SCHEDULED" } }),
    db.socialAccount.count({ where: { workspaceId: workspace.id, isActive: true } }),
    db.post.findMany({
      where: { workspaceId: workspace.id, createdAt: { gte: since30 } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    }),
    db.postSocialAccount.findMany({
      where: {
        post: { workspaceId: workspace.id },
        status: { in: ["PUBLISHED", "FAILED"] },
        publishedAt: { gte: since30 },
      },
      select: { socialAccount: { select: { platform: true } }, status: true },
    }),
    db.post.findMany({
      where: { workspaceId: workspace.id, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 8,
      select: {
        id: true,
        content: true,
        publishedAt: true,
        status: true,
        socialAccounts: {
          select: { socialAccount: { select: { platform: true } }, status: true },
        },
      },
    }),
  ]);

  // Build posts-over-time for last 30 days
  const dayMap: Record<string, { published: number; failed: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = daysAgo(i);
    dayMap[formatDay(d)] = { published: 0, failed: 0 };
  }
  for (const p of postsLast30) {
    const key = formatDay(p.createdAt);
    if (dayMap[key]) {
      if (p.status === "PUBLISHED") dayMap[key].published++;
      else if (p.status === "FAILED") dayMap[key].failed++;
    }
  }
  const postsOverTime = Object.entries(dayMap).map(([date, counts]) => ({
    date: date.slice(5), // MM-DD
    ...counts,
  }));

  // Posts by platform (from PostSocialAccount)
  const platformMap: Record<string, number> = {};
  for (const psa of postSocialAccountsLast30) {
    const p = psa.socialAccount.platform;
    platformMap[p] = (platformMap[p] ?? 0) + 1;
  }
  const byPlatform = Object.entries(platformMap)
    .map(([platform, count]) => ({ platform: PLATFORM_LABELS[platform] ?? platform, count }))
    .sort((a, b) => b.count - a.count);

  const successRate =
    totalPublished + totalFailed > 0
      ? Math.round((totalPublished / (totalPublished + totalFailed)) * 100)
      : 100;

  const recentPosts = recentPublished.map((p) => ({
    id: p.id,
    content: p.content,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    platforms: [...new Set(p.socialAccounts.map((psa) => psa.socialAccount.platform))],
  }));

  return (
    <AnalyticsClient
      overview={{ totalPublished, totalFailed, totalScheduled, totalAccounts, successRate }}
      postsOverTime={postsOverTime}
      byPlatform={byPlatform}
      recentPosts={recentPosts}
    />
  );
}
