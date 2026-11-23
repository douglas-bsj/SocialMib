// Cliente da API do TikTok (Content Posting API v2) usado pelo site e pelo worker.
// Sem acesso ao banco: quem chama salva os tokens renovados.
// Docs: https://developers.tiktok.com/doc/content-posting-api-get-started

import { getClientId, getClientSecret } from "./config";
import {
  TIKTOK_PRIVACY_LEVELS,
  type TikTokCreatorInfo,
  type TikTokPrivacyLevel,
} from "../tiktok-options";

const API = "https://open.tiktokapis.com/v2";

export class TikTokApiError extends Error {
  constructor(public code: string, message: string, public httpStatus?: number) {
    super(message);
  }
}

// Mensagens dos erros mais comuns, em português, com o que fazer.
const FRIENDLY_ERRORS: Record<string, string> = {
  unaudited_client_can_only_post_to_private_accounts:
    "o app do TikTok ainda não foi auditado: a conta TikTok precisa estar como PRIVADA e o post sai como \"Só eu\". Deixe a conta privada no app do TikTok ou peça a auditoria do app no TikTok Developers.",
  url_ownership_unverified:
    "o TikTok só aceita fotos de um domínio verificado. No TikTok Developers, verifique o domínio do Mib Social (URL properties) ou publique um vídeo.",
  privacy_level_option_mismatch:
    "a privacidade escolhida não é permitida para esta conta. Edite o post e escolha outra.",
  spam_risk_too_many_posts: "a conta atingiu o limite diário de posts do TikTok. Tente amanhã.",
  spam_risk_user_banned_from_posting: "o TikTok bloqueou esta conta de publicar.",
  reached_active_user_cap: "o app do TikTok atingiu o limite de usuários por dia.",
  access_token_invalid: "o acesso à conta expirou. Reconecte a conta TikTok em Contas.",
  scope_not_authorized:
    "a conta não autorizou a publicação. Reconecte a conta TikTok em Contas e aceite todas as permissões.",
  rate_limit_exceeded: "muitas requisições ao TikTok. Tente de novo em alguns minutos.",
  file_format_check_failed: "formato de arquivo não aceito pelo TikTok.",
  duration_check_failed: "a duração do vídeo não é aceita pelo TikTok para esta conta.",
  frame_rate_check_failed: "o vídeo precisa ter entre 23 e 60 quadros por segundo.",
  picture_size_check_failed: "tamanho de imagem/vídeo fora do aceito (cada lado entre 360 e 4096 px).",
  video_pull_failed: "o TikTok não conseguiu baixar o vídeo. Tente de novo.",
  photo_pull_failed: "o TikTok não conseguiu baixar as fotos. Confira se o domínio está verificado e tente de novo.",
  publish_cancelled: "a publicação foi cancelada no TikTok.",
  auth_removed: "a conta removeu a autorização do Mib Social. Reconecte a conta TikTok.",
  spam_risk_text: "o TikTok recusou o texto do post (suspeita de spam).",
  spam_risk: "o TikTok recusou o post (suspeita de spam).",
};

export function describeTikTokError(code: string, fallback = ""): string {
  return `TikTok: ${FRIENDLY_ERRORS[code] ?? (fallback || code)}`;
}

/** POST JSON na API do TikTok; lança TikTokApiError se error.code != "ok". */
export async function tiktokPost<T = Record<string, unknown>>(
  path: string,
  accessToken: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: { data?: T; error?: { code?: string; message?: string; log_id?: string } } = {};
  try {
    json = JSON.parse(text);
  } catch {
    // resposta não-JSON
  }
  const code = json.error?.code ?? (res.ok ? "ok" : `http_${res.status}`);
  if (code !== "ok" || !res.ok) {
    const detail = json.error?.message || text.slice(0, 200);
    throw new TikTokApiError(code, describeTikTokError(code, detail), res.status);
  }
  return (json.data ?? {}) as T;
}

// ── Token ─────────────────────────────────────────────────────────────────────
// O access token do TikTok dura poucas horas; o refresh token, meses. Cada
// renovação devolve um refresh token NOVO e invalida o anterior: salve sempre.

export interface TikTokTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/** true se o token vence nos próximos 10 minutos (ou não tem validade salva). */
export function tiktokTokenNeedsRefresh(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() - Date.now() < 10 * 60 * 1000;
}

export async function refreshTikTokToken(refreshToken: string): Promise<TikTokTokens> {
  const body = new URLSearchParams({
    client_key: getClientId("tiktok"),
    client_secret: getClientSecret("tiktok"),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(`${API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text);
  } catch {
    // ignora
  }
  if (!res.ok || data.error || !data.access_token) {
    const detail = (data.error_description as string) || (data.error as string) || text.slice(0, 200);
    throw new TikTokApiError(
      "refresh_failed",
      `TikTok: não foi possível renovar o acesso (${detail}). Reconecte a conta TikTok em Contas.`,
      res.status
    );
  }
  const expiresIn = Number(data.expires_in) || 3600;
  return {
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token ?? refreshToken),
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

/**
 * Devolve um access token válido, renovando se preciso. `save` recebe os tokens
 * novos para gravar no banco (o refresh token antigo deixa de valer).
 */
export async function getValidTikTokToken(
  account: { accessToken: string; refreshToken: string | null; expiresAt: Date | null },
  save: (tokens: TikTokTokens) => Promise<unknown>
): Promise<string> {
  if (!tiktokTokenNeedsRefresh(account.expiresAt)) return account.accessToken;
  if (!account.refreshToken) {
    throw new TikTokApiError("no_refresh_token", "TikTok: acesso expirado. Reconecte a conta TikTok em Contas.");
  }
  const tokens = await refreshTikTokToken(account.refreshToken);
  await save(tokens);
  return tokens.accessToken;
}

// ── Creator info ──────────────────────────────────────────────────────────────

export async function getTikTokCreatorInfo(accessToken: string): Promise<TikTokCreatorInfo> {
  const d = await tiktokPost<Record<string, unknown>>("/post/publish/creator_info/query/", accessToken);
  const options = Array.isArray(d.privacy_level_options) ? d.privacy_level_options : [];
  return {
    nickname: String(d.creator_nickname ?? ""),
    username: String(d.creator_username ?? ""),
    avatarUrl: d.creator_avatar_url ? String(d.creator_avatar_url) : undefined,
    privacyLevelOptions: options.filter((o): o is TikTokPrivacyLevel =>
      TIKTOK_PRIVACY_LEVELS.includes(o as TikTokPrivacyLevel)
    ),
    commentDisabled: d.comment_disabled === true,
    duetDisabled: d.duet_disabled === true,
    stitchDisabled: d.stitch_disabled === true,
    maxVideoPostDurationSec: Number(d.max_video_post_duration_sec) || 0,
  };
}
