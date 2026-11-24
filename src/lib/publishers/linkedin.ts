// Publicação no LinkedIn (perfil pessoal) pela Posts API (/rest/posts).
// Requer o produto "Share on LinkedIn" (escopo w_member_social) no app.

// O LinkedIn desativa cada versão da API cerca de 1 ano depois do lançamento;
// sem uma versão ativa, toda chamada falha. Dá para trocar por env sem deploy de código.
const API_VERSION = process.env.LINKEDIN_API_VERSION || "202609";

// Formatos aceitos pela Images API do LinkedIn.
const SUPPORTED_IMAGE = /\.(jpe?g|png|gif)(\?|$)/i;

function headers(accessToken: string, json = true): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "LinkedIn-Version": API_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function linkedInError(step: string, res: Response): Promise<Error> {
  const text = await res.text().catch(() => "");
  if (res.status === 401) {
    return new Error("LinkedIn: a autorização expirou (dura 60 dias). Reconecte a conta em Contas.");
  }
  if (res.status === 403) {
    return new Error(
      "LinkedIn: sem permissão para publicar. Confira se o app tem o produto \"Share on LinkedIn\" e reconecte a conta."
    );
  }
  if (res.status === 426 || /NONEXISTENT_VERSION|VERSION_MISSING/i.test(text)) {
    return new Error(
      `LinkedIn: a versão da API (${API_VERSION}) não é mais aceita. Defina LINKEDIN_API_VERSION com um mês recente (AAAAMM).`
    );
  }
  return new Error(`LinkedIn (${step}): ${res.status} ${text.slice(0, 300)}`);
}

async function uploadImage(accessToken: string, ownerUrn: string, imageUrl: string): Promise<string> {
  const init = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({ initializeUploadRequest: { owner: ownerUrn } }),
  });
  if (!init.ok) throw await linkedInError("preparar imagem", init);
  const data = await init.json();
  const uploadUrl: string = data.value.uploadUrl;
  const imageUrn: string = data.value.image;

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`LinkedIn: não foi possível baixar a imagem ${imageUrl} (${imgRes.status}).`);
  const buffer = await imgRes.arrayBuffer();

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/octet-stream" },
    body: buffer,
  });
  if (!put.ok) throw await linkedInError("enviar imagem", put);
  return imageUrn;
}

export async function publishToLinkedIn(
  accessToken: string,
  personId: string,
  content: string,
  images: string[]
): Promise<void> {
  const authorUrn = `urn:li:person:${personId}`;
  const selected = images.slice(0, 20);

  const unsupported = selected.find((url) => !SUPPORTED_IMAGE.test(url));
  if (unsupported) {
    throw new Error("LinkedIn aceita só imagens JPG, PNG ou GIF. Troque as imagens WebP antes de publicar.");
  }

  const body: Record<string, unknown> = {
    author: authorUrn,
    commentary: content,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  if (selected.length > 0) {
    const imageUrns: string[] = [];
    for (const url of selected) {
      imageUrns.push(await uploadImage(accessToken, authorUrn, url));
    }
    // multiImage exige de 2 a 20 imagens; uma imagem vai em content.media.
    body.content =
      imageUrns.length === 1
        ? { media: { id: imageUrns[0], altText: "" } }
        : { multiImage: { images: imageUrns.map((id) => ({ id, altText: "" })) } };
  }

  const res = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await linkedInError("publicar", res);
}
