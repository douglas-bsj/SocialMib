async function uploadMediaToTwitter(accessToken: string, imageUrl: string): Promise<string> {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Falha ao buscar imagem: ${imageUrl}`);
  const buffer = await imgRes.arrayBuffer();
  const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";

  const form = new FormData();
  form.append("media", new Blob([buffer], { type: contentType }));

  const res = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twitter media upload falhou: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.media_id_string as string;
}

export async function publishToTwitter(
  accessToken: string,
  content: string,
  images: string[]
): Promise<void> {
  const body: Record<string, unknown> = { text: content };

  if (images.length > 0) {
    const mediaIds: string[] = [];
    for (const url of images.slice(0, 4)) {
      const id = await uploadMediaToTwitter(accessToken, url);
      mediaIds.push(id);
    }
    body.media = { media_ids: mediaIds };
  }

  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new Error(`Twitter: ${err.title ?? err.detail ?? res.status}`);
  }
}
