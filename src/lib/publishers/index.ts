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

export async function publish(
  platform: string,
  account: SocialAccountInfo,
  content: string,
  images: string[],
  title?: string
): Promise<void> {
  const { accessToken, username } = account;

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
