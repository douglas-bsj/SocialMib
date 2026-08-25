export async function publishToReddit(
  accessToken: string,
  username: string,
  content: string,
  title?: string
): Promise<void> {
  // Posts to the user's own profile subreddit (u/username)
  const subreddit = `u_${username}`;
  const postTitle = title && title.trim() ? title : content.slice(0, 150);
  const postText = title ? content : "";

  const form = new URLSearchParams({
    sr: subreddit,
    kind: "self",
    title: postTitle,
    text: postText,
    api_type: "json",
    nsfw: "false",
    spoiler: "false",
  });

  const res = await fetch("https://oauth.reddit.com/api/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "MibSocial/1.0",
    },
    body: form.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Reddit: ${res.status} ${err}`);
  }

  const data = await res.json();
  const errors = data?.json?.errors;
  if (errors && errors.length > 0) {
    throw new Error(`Reddit: ${errors.map((e: string[]) => e[1]).join(", ")}`);
  }
}
