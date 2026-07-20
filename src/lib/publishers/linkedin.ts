async function initializeImageUpload(
  accessToken: string,
  ownerUrn: string
): Promise<{ uploadUrl: string; imageUrn: string }> {
  const res = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202406",
    },
    body: JSON.stringify({ initializeUploadRequest: { owner: ownerUrn } }),
  });

  if (!res.ok) throw new Error(`LinkedIn initializeUpload: ${res.status}`);
  const data = await res.json();
  return {
    uploadUrl: data.value.uploadUrl,
    imageUrn: data.value.image,
  };
}

async function uploadImageToLinkedIn(uploadUrl: string, imageUrl: string): Promise<void> {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Falha ao buscar imagem: ${imageUrl}`);
  const buffer = await imgRes.arrayBuffer();

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: buffer,
  });

  if (!res.ok) throw new Error(`LinkedIn image upload falhou: ${res.status}`);
}

export async function publishToLinkedIn(
  accessToken: string,
  personId: string,
  content: string,
  images: string[]
): Promise<void> {
  const authorUrn = `urn:li:person:${personId}`;
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

  if (images.length > 0) {
    const imageUrns: string[] = [];

    for (const url of images.slice(0, 20)) {
      const { uploadUrl, imageUrn } = await initializeImageUpload(accessToken, authorUrn);
      await uploadImageToLinkedIn(uploadUrl, url);
      imageUrns.push(imageUrn);
    }

    body.content = {
      multiImage: {
        images: imageUrns.map((urn) => ({ id: urn, altText: "" })),
      },
    };
  }

  const res = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202406",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn: ${res.status} ${err}`);
  }
}
