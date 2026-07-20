const GRAPH = "https://graph.facebook.com/v19.0";

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
}

async function getFirstPage(userToken: string): Promise<FacebookPage> {
  const res = await fetch(`${GRAPH}/me/accounts?access_token=${userToken}`);
  if (!res.ok) throw new Error(`Facebook: não foi possível listar páginas (${res.status})`);
  const data = await res.json();
  const pages: FacebookPage[] = data.data ?? [];
  if (pages.length === 0) {
    throw new Error(
      "Facebook: nenhuma Página encontrada. Conecte uma Página do Facebook (não perfil pessoal)."
    );
  }
  return pages[0];
}

export async function publishToFacebook(
  userAccessToken: string,
  content: string,
  images: string[]
): Promise<void> {
  const page = await getFirstPage(userAccessToken);

  if (images.length === 1) {
    const params = new URLSearchParams({
      url: images[0],
      caption: content,
      access_token: page.access_token,
    });
    const res = await fetch(`${GRAPH}/${page.id}/photos?${params}`, { method: "POST" });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Facebook photo: ${res.status} ${err}`);
    }
    return;
  }

  if (images.length > 1) {
    // Upload photos without publishing, then publish a multi-photo post
    const photoIds: string[] = [];
    for (const url of images.slice(0, 10)) {
      const p = new URLSearchParams({
        url,
        published: "false",
        access_token: page.access_token,
      });
      const r = await fetch(`${GRAPH}/${page.id}/photos?${p}`, { method: "POST" });
      if (!r.ok) throw new Error(`Facebook photo upload: ${r.status}`);
      photoIds.push((await r.json()).id);
    }

    const feedBody: Record<string, unknown> = {
      message: content,
      attached_media: photoIds.map((id) => ({ media_fbid: id })),
      access_token: page.access_token,
    };
    const res = await fetch(`${GRAPH}/${page.id}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedBody),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Facebook feed: ${res.status} ${err}`);
    }
    return;
  }

  // Text only
  const params = new URLSearchParams({
    message: content,
    access_token: page.access_token,
  });
  const res = await fetch(`${GRAPH}/${page.id}/feed?${params}`, { method: "POST" });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Facebook feed: ${res.status} ${err}`);
  }
}
