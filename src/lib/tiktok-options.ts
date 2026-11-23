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

export interface PlatformOptions {
  tiktok?: TikTokOptions;
}

/** Lê com segurança o JSON salvo no banco. */
export function parsePlatformOptions(value: unknown): PlatformOptions {
  if (!value || typeof value !== "object") return {};
  const raw = (value as Record<string, unknown>).tiktok;
  if (!raw || typeof raw !== "object") return {};
  const t = raw as Record<string, unknown>;
  const privacy = TIKTOK_PRIVACY_LEVELS.includes(t.privacyLevel as TikTokPrivacyLevel)
    ? (t.privacyLevel as TikTokPrivacyLevel)
    : undefined;
  return {
    tiktok: {
      privacyLevel: privacy,
      allowComment: t.allowComment === true,
      allowDuet: t.allowDuet === true,
      allowStitch: t.allowStitch === true,
    },
  };
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
