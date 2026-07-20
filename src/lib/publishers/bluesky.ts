const BSKY = "https://bsky.social/xrpc";

async function resolveDid(handle: string): Promise<string> {
  const res = await fetch(
    `${BSKY}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`
  );
  if (!res.ok) throw new Error(`Bluesky: não foi possível resolver o handle "${handle}"`);
  const data = await res.json();
  return data.did as string;
}

async function uploadBlob(
  accessToken: string,
  imageUrl: string
): Promise<{ ref: { $link: string }; mimeType: string; size: number }> {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Falha ao buscar imagem: ${imageUrl}`);
  const buffer = await imgRes.arrayBuffer();
  const mimeType = imgRes.headers.get("content-type") ?? "image/jpeg";

  const res = await fetch(`${BSKY}/com.atproto.repo.uploadBlob`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": mimeType,
    },
    body: buffer,
  });

  if (!res.ok) throw new Error(`Bluesky upload blob: ${res.status}`);
  const data = await res.json();
  return data.blob;
}

export async function publishToBluesky(
  accessToken: string,
  handle: string,
  content: string,
  images: string[]
): Promise<void> {
  const did = await resolveDid(handle);

  const record: Record<string, unknown> = {
    $type: "app.bsky.feed.post",
    text: content,
    createdAt: new Date().toISOString(),
    langs: ["pt"],
  };

  if (images.length > 0) {
    const imageEmbeds = await Promise.all(
      images.slice(0, 4).map(async (url) => {
        const blob = await uploadBlob(accessToken, url);
        return { alt: "", image: blob };
      })
    );
    record.embed = {
      $type: "app.bsky.embed.images",
      images: imageEmbeds,
    };
  }

  const res = await fetch(`${BSKY}/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repo: did,
      collection: "app.bsky.feed.post",
      record,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bluesky: ${res.status} ${err}`);
  }
}
