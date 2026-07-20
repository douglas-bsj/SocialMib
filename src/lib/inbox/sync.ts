import { PrismaClient, Platform, InboxType } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface RawItem {
  externalId: string;
  type: InboxType;
  authorName: string;
  authorUsername?: string;
  authorImage?: string;
  text: string;
  postUrl?: string;
  receivedAt: Date;
}

async function upsertItems(
  workspaceId: string,
  socialAccountId: string,
  platform: Platform,
  items: RawItem[]
) {
  for (const item of items) {
    await prisma.inboxItem.upsert({
      where: { platform_externalId: { platform, externalId: item.externalId } },
      create: {
        workspaceId,
        socialAccountId,
        platform,
        type: item.type,
        externalId: item.externalId,
        authorName: item.authorName,
        authorUsername: item.authorUsername,
        authorImage: item.authorImage,
        text: item.text,
        postUrl: item.postUrl,
        receivedAt: item.receivedAt,
      },
      update: { text: item.text },
    });
  }
}

// ── Instagram ────────────────────────────────────────────────────────────────
async function syncInstagram(
  workspaceId: string,
  socialAccountId: string,
  accessToken: string
): Promise<number> {
  // Fetch recent media (last 10 posts)
  const mediaRes = await fetch(
    `https://graph.instagram.com/v21.0/me/media?fields=id,permalink&limit=10&access_token=${accessToken}`
  );
  if (!mediaRes.ok) throw new Error(`Instagram media fetch failed: ${mediaRes.status}`);
  const { data: media } = await mediaRes.json();
  if (!media?.length) return 0;

  const items: RawItem[] = [];
  for (const post of media.slice(0, 5)) {
    const commentsRes = await fetch(
      `https://graph.instagram.com/v21.0/${post.id}/comments?fields=id,text,username,timestamp&access_token=${accessToken}`
    );
    if (!commentsRes.ok) continue;
    const { data: comments } = await commentsRes.json();
    for (const c of comments ?? []) {
      items.push({
        externalId: c.id,
        type: InboxType.COMMENT,
        authorName: c.username ?? "Instagram User",
        authorUsername: c.username,
        text: c.text,
        postUrl: post.permalink,
        receivedAt: new Date(c.timestamp),
      });
    }
  }
  await upsertItems(workspaceId, socialAccountId, Platform.INSTAGRAM, items);
  return items.length;
}

// ── Facebook ─────────────────────────────────────────────────────────────────
async function syncFacebook(
  workspaceId: string,
  socialAccountId: string,
  accessToken: string
): Promise<number> {
  // Get pages
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`
  );
  if (!pagesRes.ok) return 0;
  const { data: pages } = await pagesRes.json();
  if (!pages?.length) return 0;

  const page = pages[0];
  const pageToken = page.access_token;
  const items: RawItem[] = [];

  // Recent page feed comments
  const feedRes = await fetch(
    `https://graph.facebook.com/v21.0/${page.id}/feed?fields=id,permalink_url,comments{id,message,from,created_time}&limit=10&access_token=${pageToken}`
  );
  if (feedRes.ok) {
    const { data: posts } = await feedRes.json();
    for (const post of posts ?? []) {
      for (const c of post.comments?.data ?? []) {
        items.push({
          externalId: c.id,
          type: InboxType.COMMENT,
          authorName: c.from?.name ?? "Facebook User",
          text: c.message,
          postUrl: post.permalink_url,
          receivedAt: new Date(c.created_time),
        });
      }
    }
  }

  // Page messages (conversations)
  const convRes = await fetch(
    `https://graph.facebook.com/v21.0/${page.id}/conversations?fields=messages{message,from,created_time}&access_token=${pageToken}`
  );
  if (convRes.ok) {
    const { data: convs } = await convRes.json();
    for (const conv of convs ?? []) {
      for (const msg of conv.messages?.data ?? []) {
        if (msg.from?.id === page.id) continue; // skip own messages
        items.push({
          externalId: msg.id ?? `${conv.id}-${msg.created_time}`,
          type: InboxType.MESSAGE,
          authorName: msg.from?.name ?? "Facebook User",
          text: msg.message,
          receivedAt: new Date(msg.created_time),
        });
      }
    }
  }

  await upsertItems(workspaceId, socialAccountId, Platform.FACEBOOK, items);
  return items.length;
}

// ── Twitter / X ──────────────────────────────────────────────────────────────
async function syncTwitter(
  workspaceId: string,
  socialAccountId: string,
  accessToken: string,
  username: string
): Promise<number> {
  // Get user ID from username
  const userRes = await fetch(
    `https://api.twitter.com/2/users/by/username/${username}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!userRes.ok) return 0;
  const { data: user } = await userRes.json();
  if (!user?.id) return 0;

  // Fetch mentions
  const mentionsRes = await fetch(
    `https://api.twitter.com/2/users/${user.id}/mentions?tweet.fields=created_at,author_id,text&expansions=author_id&user.fields=name,username,profile_image_url&max_results=20`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!mentionsRes.ok) return 0;
  const mentionsData = await mentionsRes.json();
  const tweets = mentionsData.data ?? [];
  const usersMap: Record<string, { name: string; username: string; profile_image_url?: string }> = {};
  for (const u of mentionsData.includes?.users ?? []) {
    usersMap[u.id] = u;
  }

  const items: RawItem[] = tweets.map((t: { id: string; author_id: string; text: string; created_at: string }) => {
    const author = usersMap[t.author_id];
    return {
      externalId: t.id,
      type: InboxType.MENTION,
      authorName: author?.name ?? "Twitter User",
      authorUsername: author?.username,
      authorImage: author?.profile_image_url,
      text: t.text,
      postUrl: author ? `https://x.com/${author.username}/status/${t.id}` : undefined,
      receivedAt: new Date(t.created_at),
    };
  });

  await upsertItems(workspaceId, socialAccountId, Platform.TWITTER, items);
  return items.length;
}

// ── Threads ──────────────────────────────────────────────────────────────────
async function syncThreads(
  workspaceId: string,
  socialAccountId: string,
  accessToken: string
): Promise<number> {
  const repliesRes = await fetch(
    `https://graph.threads.net/v1.0/me/replies?fields=id,text,username,timestamp&access_token=${accessToken}`
  );
  if (!repliesRes.ok) return 0;
  const { data: replies } = await repliesRes.json();

  const items: RawItem[] = (replies ?? []).map((r: { id: string; username?: string; text: string; timestamp: string }) => ({
    externalId: r.id,
    type: InboxType.COMMENT,
    authorName: r.username ?? "Threads User",
    authorUsername: r.username,
    text: r.text,
    receivedAt: new Date(r.timestamp),
  }));

  await upsertItems(workspaceId, socialAccountId, Platform.THREADS, items);
  return items.length;
}

// ── LinkedIn ─────────────────────────────────────────────────────────────────
async function syncLinkedIn(
  workspaceId: string,
  socialAccountId: string,
  accessToken: string
): Promise<number> {
  const postsRes = await fetch(
    "https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn%3Ali%3Aperson%3A~)&count=10",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!postsRes.ok) return 0;
  const { elements: posts } = await postsRes.json();
  if (!posts?.length) return 0;

  const items: RawItem[] = [];
  for (const post of posts.slice(0, 5)) {
    const commentsRes = await fetch(
      `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(post.id)}/comments?count=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!commentsRes.ok) continue;
    const { elements: comments } = await commentsRes.json();
    for (const c of comments ?? []) {
      items.push({
        externalId: c.id ?? c.created?.time?.toString(),
        type: InboxType.COMMENT,
        authorName: c.actor?.replace("urn:li:person:", "") ?? "LinkedIn User",
        text: c.message?.text ?? "",
        receivedAt: new Date(c.created?.time ?? Date.now()),
      });
    }
  }

  await upsertItems(workspaceId, socialAccountId, Platform.LINKEDIN, items);
  return items.length;
}

// ── Main sync function ───────────────────────────────────────────────────────
export async function syncWorkspaceInbox(workspaceId: string): Promise<{ synced: number; errors: string[] }> {
  const accounts = await prisma.socialAccount.findMany({
    where: { workspaceId, isActive: true },
    select: { id: true, platform: true, accessToken: true, username: true },
  });

  let synced = 0;
  const errors: string[] = [];

  for (const account of accounts) {
    try {
      let count = 0;
      switch (account.platform) {
        case "INSTAGRAM":
          count = await syncInstagram(workspaceId, account.id, account.accessToken);
          break;
        case "FACEBOOK":
          count = await syncFacebook(workspaceId, account.id, account.accessToken);
          break;
        case "TWITTER":
          count = await syncTwitter(workspaceId, account.id, account.accessToken, account.username ?? "");
          break;
        case "THREADS":
          count = await syncThreads(workspaceId, account.id, account.accessToken);
          break;
        case "LINKEDIN":
          count = await syncLinkedIn(workspaceId, account.id, account.accessToken);
          break;
        default:
          break;
      }
      synced += count;
    } catch (err) {
      errors.push(`${account.platform}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { synced, errors };
}
