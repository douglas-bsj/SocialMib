const BASE = "https://graph.threads.net/v1.0";

export async function publishToThreads(
  accessToken: string,
  content: string,
  images: string[]
): Promise<void> {
  let creationId: string;

  if (images.length === 1) {
    const params = new URLSearchParams({
      media_type: "IMAGE",
      image_url: images[0],
      text: content,
      access_token: accessToken,
    });
    const res = await fetch(`${BASE}/me/threads?${params}`, { method: "POST" });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Threads criar container: ${res.status} ${err}`);
    }
    creationId = (await res.json()).id;
  } else if (images.length > 1) {
    // Carousel: create individual item containers, then carousel container
    const itemIds: string[] = [];
    for (const url of images.slice(0, 10)) {
      const p = new URLSearchParams({
        media_type: "IMAGE",
        image_url: url,
        is_carousel_item: "true",
        access_token: accessToken,
      });
      const r = await fetch(`${BASE}/me/threads?${p}`, { method: "POST" });
      if (!r.ok) throw new Error(`Threads carousel item: ${r.status}`);
      itemIds.push((await r.json()).id);
    }

    const carouselParams = new URLSearchParams({
      media_type: "CAROUSEL",
      children: itemIds.join(","),
      text: content,
      access_token: accessToken,
    });
    const res = await fetch(`${BASE}/me/threads?${carouselParams}`, { method: "POST" });
    if (!res.ok) throw new Error(`Threads carousel container: ${res.status}`);
    creationId = (await res.json()).id;
  } else {
    // Text only
    const params = new URLSearchParams({
      media_type: "TEXT",
      text: content,
      access_token: accessToken,
    });
    const res = await fetch(`${BASE}/me/threads?${params}`, { method: "POST" });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Threads criar container: ${res.status} ${err}`);
    }
    creationId = (await res.json()).id;
  }

  // Publish the container
  const publishParams = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });
  const publishRes = await fetch(`${BASE}/me/threads_publish?${publishParams}`, {
    method: "POST",
  });

  if (!publishRes.ok) {
    const err = await publishRes.text();
    throw new Error(`Threads publicar: ${publishRes.status} ${err}`);
  }
}
