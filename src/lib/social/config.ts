export type PlatformId =
  | "twitter"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "pinterest"
  | "threads"
  | "reddit";

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  prismaEnum: string;
  authUrl: string;
  tokenUrl: string;
  profileUrl: string;
  scopes: string[];
  scopeJoiner: " " | ",";
  usesPKCE: boolean;
  usesBasicAuth: boolean;
  extraAuthParams?: Record<string, string>;
  extraTokenParams?: Record<string, string>;
}

const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export const PLATFORM_CONFIGS: Record<PlatformId, PlatformConfig> = {
  twitter: {
    id: "twitter",
    name: "X (Twitter)",
    prismaEnum: "TWITTER",
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    profileUrl: "https://api.twitter.com/2/users/me?user.fields=profile_image_url,username",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    scopeJoiner: " ",
    usesPKCE: true,
    usesBasicAuth: true,
    extraAuthParams: { code_challenge_method: "S256" },
  },

  instagram: {
    id: "instagram",
    name: "Instagram",
    prismaEnum: "INSTAGRAM",
    authUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    profileUrl:
      "https://graph.instagram.com/v21.0/me?fields=id,username,name,account_type,profile_picture_url",
    scopes: [
      "instagram_basic",
      "instagram_content_publish",
      "instagram_manage_comments",
      "instagram_manage_insights",
    ],
    scopeJoiner: ",",
    usesPKCE: false,
    usesBasicAuth: false,
  },

  facebook: {
    id: "facebook",
    name: "Facebook",
    prismaEnum: "FACEBOOK",
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    profileUrl: "https://graph.facebook.com/me?fields=id,name,picture",
    scopes: [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "publish_to_groups",
      "public_profile",
    ],
    scopeJoiner: ",",
    usesPKCE: false,
    usesBasicAuth: false,
    extraAuthParams: { response_type: "code" },
  },

  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    prismaEnum: "LINKEDIN",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    profileUrl: "https://api.linkedin.com/v2/userinfo",
    scopes: ["openid", "profile", "email", "w_member_social"],
    scopeJoiner: " ",
    usesPKCE: false,
    usesBasicAuth: false,
  },

  tiktok: {
    id: "tiktok",
    name: "TikTok",
    prismaEnum: "TIKTOK",
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    profileUrl: "https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url,username",
    scopes: ["user.info.basic", "video.upload", "video.publish"],
    scopeJoiner: ",",
    usesPKCE: true,
    usesBasicAuth: false,
    extraAuthParams: { code_challenge_method: "S256" },
  },

  youtube: {
    id: "youtube",
    name: "YouTube",
    prismaEnum: "YOUTUBE",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    profileUrl: "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    scopes: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    scopeJoiner: " ",
    usesPKCE: false,
    usesBasicAuth: false,
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },

  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    prismaEnum: "PINTEREST",
    authUrl: "https://www.pinterest.com/oauth/",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    profileUrl: "https://api.pinterest.com/v5/user_account",
    scopes: ["boards:read", "boards:write", "pins:read", "pins:write", "user_accounts:read"],
    scopeJoiner: ",",
    usesPKCE: false,
    usesBasicAuth: true,
  },

  threads: {
    id: "threads",
    name: "Threads",
    prismaEnum: "THREADS",
    authUrl: "https://threads.net/oauth/authorize",
    tokenUrl: "https://graph.threads.net/oauth/access_token",
    profileUrl: "https://graph.threads.net/me?fields=id,username,name,threads_profile_picture_url",
    scopes: [
      "threads_basic",
      "threads_content_publish",
      "threads_manage_insights",
      "threads_manage_replies",
      "threads_read_replies",
    ],
    scopeJoiner: ",",
    usesPKCE: false,
    usesBasicAuth: false,
  },

  reddit: {
    id: "reddit",
    name: "Reddit",
    prismaEnum: "REDDIT",
    authUrl: "https://www.reddit.com/api/v1/authorize",
    tokenUrl: "https://www.reddit.com/api/v1/access_token",
    profileUrl: "https://oauth.reddit.com/api/v1/me",
    scopes: ["submit", "identity", "read"],
    scopeJoiner: " ",
    usesPKCE: false,
    usesBasicAuth: true,
    extraAuthParams: { duration: "permanent" },
  },
};

export function getCallbackUrl(platform: PlatformId): string {
  return `${BASE_URL}/api/social/${platform}/callback`;
}

export function getClientId(platform: PlatformId): string {
  const map: Record<PlatformId, string> = {
    twitter: process.env.TWITTER_CLIENT_ID ?? "",
    instagram: process.env.INSTAGRAM_CLIENT_ID ?? "",
    facebook: process.env.FACEBOOK_CLIENT_ID ?? "",
    linkedin: process.env.LINKEDIN_CLIENT_ID ?? "",
    tiktok: process.env.TIKTOK_CLIENT_KEY ?? "",
    youtube: process.env.YOUTUBE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "",
    pinterest: process.env.PINTEREST_APP_ID ?? "",
    threads: process.env.THREADS_CLIENT_ID ?? "",
    reddit: process.env.REDDIT_CLIENT_ID ?? "",
  };
  return map[platform];
}

export function getClientSecret(platform: PlatformId): string {
  const map: Record<PlatformId, string> = {
    twitter: process.env.TWITTER_CLIENT_SECRET ?? "",
    instagram: process.env.INSTAGRAM_CLIENT_SECRET ?? "",
    facebook: process.env.FACEBOOK_CLIENT_SECRET ?? "",
    linkedin: process.env.LINKEDIN_CLIENT_SECRET ?? "",
    tiktok: process.env.TIKTOK_CLIENT_SECRET ?? "",
    youtube: process.env.YOUTUBE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "",
    pinterest: process.env.PINTEREST_APP_SECRET ?? "",
    threads: process.env.THREADS_CLIENT_SECRET ?? "",
    reddit: process.env.REDDIT_CLIENT_SECRET ?? "",
  };
  return map[platform];
}
