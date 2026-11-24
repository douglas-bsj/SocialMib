// Opções do TikTok guardadas em Post.platformOptions.tiktok.
// Client-safe: usado pela tela de publicação, pela API de posts, pelo MCP e pelo worker.

export const TIKTOK_PRIVACY_LEVELS = [
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "FOLLOWER_OF_CREATOR",
  "SELF_ONLY",
] as const;

export type TikTokPrivacyLevel = (typeof TIKTOK_PRIVACY_LEVELS)[number];

export const TIKTOK_PRIVACY_LABELS: Record<TikTokPrivacyLevel, string> = {
  PUBLIC_TO_EVERYONE: "Todos",
  MUTUAL_FOLLOW_FRIENDS: "Amigos (seguidores mútuos)",
  FOLLOWER_OF_CREATOR: "Seguidores",
  SELF_ONLY: "Só eu (privado)",
};

export interface TikTokOptions {
  /** Escolhido manualmente pelo usuário (regra do TikTok: sem valor padrão). */
  privacyLevel?: TikTokPrivacyLevel;
  /** Desligados por padrão (regra do TikTok). */
  allowComment?: boolean;
  allowDuet?: boolean;
  allowStitch?: boolean;
}

// ── YouTube (Post.platformOptions.youtube) ───────────────────────────────────

export const YOUTUBE_PRIVACY_LEVELS = ["public", "unlisted", "private"] as const;
export type YouTubePrivacy = (typeof YOUTUBE_PRIVACY_LEVELS)[number];

export const YOUTUBE_PRIVACY_LABELS: Record<YouTubePrivacy, string> = {
  public: "Público",
  unlisted: "Não listado (só quem tem o link)",
  private: "Privado",
};

/** Limite do YouTube para o título; "<" e ">" não são aceitos. */
export const YOUTUBE_TITLE_MAX = 100;

export interface YouTubeOptions {
  title?: string;
  privacy?: YouTubePrivacy;
  /** Declaração obrigatória do YouTube (COPPA): o vídeo é feito para crianças? */
  madeForKids?: boolean;
}

export interface PlatformOptions {
  tiktok?: TikTokOptions;
  youtube?: YouTubeOptions;
}

function parseTikTok(raw: unknown): TikTokOptions | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const t = raw as Record<string, unknown>;
  const privacy = TIKTOK_PRIVACY_LEVELS.includes(t.privacyLevel as TikTokPrivacyLevel)
    ? (t.privacyLevel as TikTokPrivacyLevel)
    : undefined;
  return {
    privacyLevel: privacy,
    allowComment: t.allowComment === true,
    allowDuet: t.allowDuet === true,
    allowStitch: t.allowStitch === true,
  };
}

function parseYouTube(raw: unknown): YouTubeOptions | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const y = raw as Record<string, unknown>;
  const title = typeof y.title === "string" ? y.title.replace(/[<>]/g, "").trim().slice(0, YOUTUBE_TITLE_MAX) : "";
  return {
    title: title || undefined,
    privacy: YOUTUBE_PRIVACY_LEVELS.includes(y.privacy as YouTubePrivacy) ? (y.privacy as YouTubePrivacy) : undefined,
    madeForKids: typeof y.madeForKids === "boolean" ? y.madeForKids : undefined,
  };
}

/** Lê com segurança o JSON salvo no banco. */
export function parsePlatformOptions(value: unknown): PlatformOptions {
  if (!value || typeof value !== "object") return {};
  const v = value as Record<string, unknown>;
  const result: PlatformOptions = {};
  const tiktok = parseTikTok(v.tiktok);
  const youtube = parseYouTube(v.youtube);
  if (tiktok) result.tiktok = tiktok;
  if (youtube) result.youtube = youtube;
  return result;
}

/** Dados da conta TikTok exibidos antes de publicar (creator_info). */
export interface TikTokCreatorInfo {
  nickname: string;
  username: string;
  avatarUrl?: string;
  privacyLevelOptions: TikTokPrivacyLevel[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec: number;
}

export const TIKTOK_MUSIC_CONFIRMATION_URL =
  "https://www.tiktok.com/legal/page/global/music-usage-confirmation/en";
