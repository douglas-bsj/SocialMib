// Publicação de vídeo no YouTube (Data API v3, upload resumable).
// Docs: https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol

import { isVideoUrl } from "../storage-constants";
import { YOUTUBE_TITLE_MAX, type YouTubeOptions } from "../tiktok-options";

const UPLOAD_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";

// Descrição: até 5000 bytes, sem "<" e ">".
function cleanDescription(text: string): string {
  let out = text.replace(/[<>]/g, "");
  while (Buffer.byteLength(out, "utf8") > 5000) out = out.slice(0, -1);
  return out;
}

// Erros comuns da API, em português, com o que fazer.
function describeYouTubeError(status: number, raw: string): string {
  let reason = "";
  let message = "";
  try {
    const json = JSON.parse(raw);
    reason = json.error?.errors?.[0]?.reason ?? json.error?.status ?? "";
    message = json.error?.message ?? "";
  } catch {
    // resposta não-JSON
  }
  // youtubeSignupRequired chega como 401: conferir o motivo antes do status.
  if (reason === "youtubeSignupRequired" || reason === "channelNotFound") {
    return "YouTube: esta conta Google não tem canal no YouTube. Crie o canal e reconecte.";
  }
  if (reason === "quotaExceeded" || reason === "uploadLimitExceeded" || reason === "rateLimitExceeded") {
    return "YouTube: limite diário de envios atingido. Tente de novo amanhã.";
  }
  if (status === 401) return "YouTube: o acesso expirou. Reconecte o canal em Contas.";
  if (reason === "insufficientPermissions" || status === 403) {
    return `YouTube: sem permissão para enviar vídeos (${message || reason || status}). Reconecte o canal e aceite todas as permissões.`;
  }
  if (reason === "invalidTitle") return "YouTube: título inválido (até 100 caracteres, sem < ou >).";
  if (reason === "invalidDescription") return "YouTube: descrição inválida (texto longo demais ou com < ou >).";
  return `YouTube: ${status} ${message || raw.slice(0, 300)}`;
}

export async function publishToYouTube(
  accessToken: string,
  content: string,
  media: string[],
  options: YouTubeOptions | undefined
): Promise<void> {
  const videoUrl = media.find(isVideoUrl);
  if (!videoUrl) throw new Error("YouTube: o post precisa de um vídeo.");
  const title = options?.title?.replace(/[<>]/g, "").trim().slice(0, YOUTUBE_TITLE_MAX);
  if (!title) throw new Error("YouTube: o vídeo precisa de um título. Edite o post e preencha.");
  if (!options?.privacy) throw new Error("YouTube: escolha a visibilidade do vídeo. Edite o post e escolha.");
  if (typeof options.madeForKids !== "boolean") {
    throw new Error("YouTube: informe se o vídeo é feito para crianças. Edite o post e escolha.");
  }

  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) throw new Error(`YouTube: não foi possível baixar o vídeo ${videoUrl} (${videoRes.status}).`);
  const video = Buffer.from(await videoRes.arrayBuffer());
  const contentType = videoRes.headers.get("content-type")?.startsWith("video/")
    ? videoRes.headers.get("content-type")!
    : "video/*";

  // 1) Abre a sessão de upload com os dados do vídeo.
  const init = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(video.length),
      "X-Upload-Content-Type": contentType,
    },
    body: JSON.stringify({
      snippet: {
        title,
        description: cleanDescription(content),
        categoryId: "22", // People & Blogs (padrão do YouTube)
      },
      status: {
        privacyStatus: options.privacy,
        selfDeclaredMadeForKids: options.madeForKids,
      },
    }),
  });
  if (!init.ok) throw new Error(describeYouTubeError(init.status, await init.text()));
  const sessionUrl = init.headers.get("location");
  if (!sessionUrl) throw new Error("YouTube: a API não devolveu o endereço de envio do vídeo.");

  // 2) Envia o arquivo inteiro (o Mib Social limita vídeos a 95 MB).
  const put = await fetch(sessionUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: video,
  });
  if (put.status !== 200 && put.status !== 201) {
    throw new Error(describeYouTubeError(put.status, await put.text()));
  }
  const result = (await put.json().catch(() => ({}))) as { id?: string; status?: { uploadStatus?: string; rejectionReason?: string } };
  if (result.status?.uploadStatus === "rejected") {
    throw new Error(`YouTube: o vídeo foi recusado (${result.status.rejectionReason ?? "motivo não informado"}).`);
  }
  if (!result.id) throw new Error("YouTube: o envio terminou sem devolver o ID do vídeo.");
}
