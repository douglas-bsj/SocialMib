// Token do Google/YouTube usado pelo worker. Sem acesso ao banco: quem chama
// salva o token renovado.
// O access token do Google dura 1 hora; o refresh token não muda a cada
// renovação (só é devolvido na primeira autorização, com prompt=consent).

import { getClientId, getClientSecret } from "./config";

export interface YouTubeTokens {
  accessToken: string;
  /** Só vem quando o Google troca o refresh token (raro). */
  refreshToken?: string;
  expiresAt: Date;
}

/** true se o token vence nos próximos 5 minutos (ou não tem validade salva). */
export function youtubeTokenNeedsRefresh(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() - Date.now() < 5 * 60 * 1000;
}

export async function refreshYouTubeToken(refreshToken: string): Promise<YouTubeTokens> {
  const body = new URLSearchParams({
    client_id: getClientId("youtube"),
    client_secret: getClientSecret("youtube"),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
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
  if (!res.ok || !data.access_token) {
    const code = String(data.error ?? res.status);
    // invalid_grant: autorização revogada, senha trocada ou app em modo "Teste"
    // no Google Cloud (nesse modo o refresh token vence em 7 dias).
    const hint =
      code === "invalid_grant"
        ? "a autorização do Google expirou ou foi revogada"
        : String(data.error_description ?? code);
    throw new Error(`YouTube: não foi possível renovar o acesso (${hint}). Reconecte o canal em Contas.`);
  }
  const expiresIn = Number(data.expires_in) || 3600;
  return {
    accessToken: String(data.access_token),
    refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

/** Devolve um access token válido, renovando (e salvando via `save`) se preciso. */
export async function getValidYouTubeToken(
  account: { accessToken: string; refreshToken: string | null; expiresAt: Date | null },
  save: (tokens: YouTubeTokens) => Promise<unknown>
): Promise<string> {
  if (!youtubeTokenNeedsRefresh(account.expiresAt)) return account.accessToken;
  if (!account.refreshToken) {
    throw new Error("YouTube: acesso expirado e sem renovação automática. Reconecte o canal em Contas.");
  }
  const tokens = await refreshYouTubeToken(account.refreshToken);
  await save(tokens);
  return tokens.accessToken;
}
