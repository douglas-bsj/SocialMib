const BASE = "https://graph.instagram.com/v21.0";

export async function publishToInstagram(
  accessToken: string,
  content: string,
  images: string[]
): Promise<void> {
  if (images.length === 0) {
    throw new Error(
      "Instagram requer pelo menos uma imagem. Adicione uma imagem ao post para publicar no Instagram."
    );
  }

  let creationId: string;

  if (images.length === 1) {
    const params = new URLSearchParams({
      image_url: images[0],
      caption: content,
      media_type: "IMAGE",
      access_token: accessToken,
    });
    const res = await fetch(`${BASE}/me/media?${params}`, { method: "POST" });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Instagram criar container: ${res.status} ${err}`);
    }
    creationId = (await res.json()).id;
  } else {
    // Carousel
    const itemIds: string[] = [];
    for (const url of images.slice(0, 10)) {
      const p = new URLSearchParams({
        image_url: url,
        media_type: "IMAGE",
        is_carousel_item: "true",
        access_token: accessToken,
      });
      const r = await fetch(`${BASE}/me/media?${p}`, { method: "POST" });
      if (!r.ok) throw new Error(`Instagram carousel item: ${r.status}`);
      itemIds.push((await r.json()).id);
    }

    const carouselParams = new URLSearchParams({
      media_type: "CAROUSEL",
      children: itemIds.join(","),
      caption: content,
      access_token: accessToken,
    });
    const res = await fetch(`${BASE}/me/media?${carouselParams}`, { method: "POST" });
    if (!res.ok) throw new Error(`Instagram carousel container: ${res.status}`);
    creationId = (await res.json()).id;
  }

  // Publish
  const publishParams = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });
  const publishRes = await fetch(`${BASE}/me/media_publish?${publishParams}`, { method: "POST" });

  if (!publishRes.ok) {
    const err = await publishRes.text();
    throw new Error(`Instagram publicar: ${publishRes.status} ${err}`);
  }
}
