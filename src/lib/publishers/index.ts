import { publishToTwitter } from "./twitter";
import { publishToLinkedIn } from "./linkedin";
import { publishToThreads } from "./threads";
import { publishToBluesky } from "./bluesky";
import { publishToReddit } from "./reddit";
import { publishToInstagram } from "./instagram";
import { publishToFacebook } from "./facebook";
import { publishToPinterest } from "./pinterest";

export interface SocialAccountInfo {
  accessToken: string;
  refreshToken?: string | null;
  username?: string | null;
}

// Uploads sem S3 são salvos como "/uploads/<arquivo>". O worker precisa baixar a
// imagem e as redes (Instagram, Facebook...) precisam de uma URL pública, então
// caminhos relativos viram absolutos com a URL pública do app.
function toAbsoluteUrl(url: string): string {
  if (!url.startsWith("/")) return url;
  const base = (process.env.NEXTAUTH_URL || process.env.AUTH_URL || "").replace(/\/+$/, "");
  if (!base) {
    throw new Error("Imagem local sem NEXTAUTH_URL configurada no worker: não há como gerar a URL pública.");
  }
  return `${base}${url}`;
}

export async function publish(
  platform: string,
  account: SocialAccountInfo,
  content: string,
  rawImages: string[],
  title?: string
): Promise<void> {
  const { accessToken, username } = account;
  const images = rawImages.map(toAbsoluteUrl);

  switch (platform) {
    case "TWITTER":
      return publishToTwitter(accessToken, content, images);

    case "LINKEDIN":
      if (!username) throw new Error("LinkedIn: ID de pessoa não encontrado na conta.");
      return publishToLinkedIn(accessToken, username, content, images);

    case "THREADS":
      return publishToThreads(accessToken, content, images);

    case "BLUESKY":
      if (!username) throw new Error("Bluesky: handle não encontrado na conta.");
      return publishToBluesky(accessToken, username, content, images);

    case "REDDIT":
      if (!username) throw new Error("Reddit: username não encontrado na conta.");
      return publishToReddit(accessToken, username, content, title);

    case "INSTAGRAM":
      return publishToInstagram(accessToken, content, images);

    case "FACEBOOK":
      return publishToFacebook(accessToken, content, images);

    case "PINTEREST":
      return publishToPinterest(accessToken, content, images);

    case "TIKTOK":
      throw new Error(
        "TikTok requer upload de vídeo — suporte a vídeo será adicionado em breve."
      );

    case "YOUTUBE":
      throw new Error(
        "YouTube requer upload de vídeo — suporte a vídeo será adicionado em breve."
      );

    default:
      throw new Error(`Plataforma desconhecida: ${platform}`);
  }
}
