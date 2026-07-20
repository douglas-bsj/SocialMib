export async function publishToPinterest(
  accessToken: string,
  content: string,
  images: string[]
): Promise<void> {
  if (images.length === 0) {
    throw new Error(
      "Pinterest requer uma imagem. Adicione uma imagem ao post para publicar no Pinterest."
    );
  }

  // Get first board
  const boardsRes = await fetch("https://api.pinterest.com/v5/boards?page_size=1", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!boardsRes.ok) throw new Error(`Pinterest: não foi possível listar boards (${boardsRes.status})`);
  const boardsData = await boardsRes.json();
  const boards: Array<{ id: string; name: string }> = boardsData.items ?? [];

  if (boards.length === 0) {
    throw new Error("Pinterest: crie pelo menos um Board na sua conta antes de publicar.");
  }

  const boardId = boards[0].id;
  const [firstImage, ...rest] = images;

  const pinBody: Record<string, unknown> = {
    board_id: boardId,
    description: content,
    media_source: {
      source_type: "image_url",
      url: firstImage,
    },
  };

  // Pinterest only supports one image per Pin — ignore additional images
  if (rest.length > 0) {
    console.warn(`Pinterest: apenas a primeira imagem será usada (${images.length} fornecidas).`);
  }

  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pinBody),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinterest: ${res.status} ${err}`);
  }
}
