// Publicação no TikTok (Direct Post).
// - Vídeo: FILE_UPLOAD — o worker baixa o vídeo e envia em partes ao TikTok
//   (não exige verificar domínio).
// - Fotos: só PULL_FROM_URL — o TikTok baixa as imagens do nosso site, e para
//   isso o domínio precisa estar verificado no TikTok Developers. Aceita JPG/WebP.
// Apps não auditados pelo TikTok só publicam em contas privadas, como "Só eu".

import {
  TikTokApiError,
  describeTikTokError,
  getTikTokCreatorInfo,
  tiktokPost,
} from "../social/tiktok";
import { TIKTOK_PRIVACY_LABELS, type TikTokOptions } from "../tiktok-options";
import { isVideoUrl } from "../storage-constants";

const MIN_CHUNK = 5 * 1024 * 1024;
const MAX_SINGLE_CHUNK = 64 * 1024 * 1024;
const CHUNK = 10 * 1024 * 1024;

const VIDEO_MIME: Record<string, string> = { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" };

export async function publishToTikTok(
  accessToken: string,
  content: string,
  media: string[],
  options: TikTokOptions | undefined
): Promise<void> {
  if (!options?.privacyLevel) {
    throw new Error("TikTok: escolha quem pode ver o post (privacidade) antes de publicar. Edite o post.");
  }
  if (media.length === 0) {
    throw new Error("TikTok: o post precisa de um vídeo ou de fotos.");
  }

  // Regras do TikTok: conferir a conta logo antes de publicar.
  const creator = await getTikTokCreatorInfo(accessToken);
  if (!creator.privacyLevelOptions.includes(options.privacyLevel)) {
    const allowed = creator.privacyLevelOptions.map((p) => TIKTOK_PRIVACY_LABELS[p]).join(", ");
    throw new Error(
      `TikTok: a privacidade "${TIKTOK_PRIVACY_LABELS[options.privacyLevel]}" não é permitida para esta conta agora (permitidas: ${allowed || "nenhuma"}). Edite o post.`
    );
  }

  const video = media.find(isVideoUrl);
  const publishId = video
    ? await postVideo(accessToken, content, video, options, creator)
    : await postPhotos(accessToken, content, media, options, creator);

  await waitForResult(accessToken, publishId);
}

async function postVideo(
  accessToken: string,
  content: string,
  url: string,
  options: TikTokOptions,
  creator: { commentDisabled: boolean; duetDisabled: boolean; stitchDisabled: boolean }
): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TikTok: não foi possível ler o vídeo do Mib Social (${res.status}).`);
  const data = Buffer.from(await res.arrayBuffer());
  const size = data.length;

  const ext = url.split(/[?#]/)[0].split(".").pop()?.toLowerCase() ?? "mp4";
  const mime = VIDEO_MIME[ext] ?? "video/mp4";

  // Até 64 MB vai numa parte só; acima disso, partes de 10 MB e a última
  // absorve o resto (regra do TikTok: total = arredondar para baixo).
  const chunkSize = size <= MAX_SINGLE_CHUNK ? size : CHUNK;
  const totalChunks = size <= MAX_SINGLE_CHUNK ? 1 : Math.floor(size / CHUNK);
  if (size > MAX_SINGLE_CHUNK && chunkSize < MIN_CHUNK) throw new Error("TikTok: tamanho de parte inválido.");

  const init = await tiktokPost<{ publish_id: string; upload_url: string }>(
    "/post/publish/video/init/",
    accessToken,
    {
      post_info: {
        title: content.slice(0, 2200),
        privacy_level: options.privacyLevel,
        disable_comment: creator.commentDisabled || !options.allowComment,
        disable_duet: creator.duetDisabled || !options.allowDuet,
        disable_stitch: creator.stitchDisabled || !options.allowStitch,
        brand_content_toggle: false,
        brand_organic_toggle: false,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: size,
        chunk_size: chunkSize,
        total_chunk_count: totalChunks,
      },
    }
  );

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = i === totalChunks - 1 ? size - 1 : start + chunkSize - 1;
    const part = data.subarray(start, end + 1);
    const put = await fetch(init.upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": mime,
        "Content-Length": String(part.length),
        "Content-Range": `bytes ${start}-${end}/${size}`,
      },
      body: new Uint8Array(part),
    });
    if (put.status !== 201 && put.status !== 206) {
      const text = await put.text().catch(() => "");
      throw new Error(`TikTok: falha ao enviar o vídeo (parte ${i + 1}/${totalChunks}, HTTP ${put.status}). ${text.slice(0, 200)}`);
    }
  }

  return init.publish_id;
}

async function postPhotos(
  accessToken: string,
  content: string,
  images: string[],
  options: TikTokOptions,
  creator: { commentDisabled: boolean }
): Promise<string> {
  const bad = images.filter((u) => !/\.(jpe?g|webp)$/i.test(u.split(/[?#]/)[0]));
  if (bad.length) {
    throw new Error("TikTok: fotos precisam ser JPG ou WebP (PNG e GIF não são aceitos).");
  }

  // Título curto (até 90 caracteres) = primeira linha; o texto completo vai na descrição.
  const firstLine = content.split("\n").find((l) => l.trim())?.trim() ?? "";
  const init = await tiktokPost<{ publish_id: string }>("/post/publish/content/init/", accessToken, {
    media_type: "PHOTO",
    post_mode: "DIRECT_POST",
    post_info: {
      title: firstLine.slice(0, 90),
      description: content.slice(0, 4000),
      privacy_level: options.privacyLevel,
      disable_comment: creator.commentDisabled || !options.allowComment,
      auto_add_music: true,
      brand_content_toggle: false,
      brand_organic_toggle: false,
    },
    source_info: {
      source: "PULL_FROM_URL",
      photo_images: images.slice(0, 35),
      photo_cover_index: 0,
    },
  });
  return init.publish_id;
}

/**
 * Acompanha o processamento por até ~2 minutos. Falha → erro; concluído → ok.
 * Se ainda estiver processando (moderação pode levar horas), considera enviado.
 */
async function waitForResult(accessToken: string, publishId: string): Promise<void> {
  const deadline = Date.now() + 2 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5000));
    let status: { status?: string; fail_reason?: string };
    try {
      status = await tiktokPost("/post/publish/status/fetch/", accessToken, { publish_id: publishId });
    } catch (e) {
      if (e instanceof TikTokApiError && e.code === "rate_limit_exceeded") continue;
      throw e;
    }
    if (status.status === "FAILED") {
      throw new Error(describeTikTokError(status.fail_reason ?? "", `falha ao publicar (${status.fail_reason ?? "sem motivo"})`));
    }
    if (status.status === "PUBLISH_COMPLETE") return;
  }
  console.log(`  TikTok: publish_id ${publishId} ainda processando; considerado enviado.`);
}
