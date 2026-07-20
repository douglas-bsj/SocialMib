import OpenAI from "openai";

const globalForOpenAI = globalThis as unknown as { openai: OpenAI | undefined };

export const openai =
  globalForOpenAI.openai ??
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

if (process.env.NODE_ENV !== "production") globalForOpenAI.openai = openai;

export const PLATFORM_TONE: Record<string, string> = {
  TWITTER: "conciso, direto, uso de hashtags relevantes, máximo 280 caracteres, pode usar emojis com moderação",
  INSTAGRAM: "engajante, visual, storytelling, hashtags no final (5-10), emojis, pode ser mais longo",
  FACEBOOK: "conversacional, informativo, pode ter CTA, tom de comunidade, sem excesso de hashtags",
  LINKEDIN: "profissional, insights de negócio, tom de autoridade, dados e resultados, hashtags estratégicos (3-5)",
  TIKTOK: "jovem, dinâmico, trend-aware, hashtags virais, CTA para engajamento",
  YOUTUBE: "descritivo, inclui palavras-chave, convida para o canal, menciona se inscrever",
  PINTEREST: "inspiracional, descritivo, palavras-chave para busca, foco no benefício visual",
  BLUESKY: "autêntico, direto, tom de early-adopter tech, sem excesso de hashtags, máximo 300 caracteres",
  THREADS: "casual, conversacional, engajante, curto, similar ao Instagram sem hashtags excessivas",
  REDDIT: "informativo, honesto, sem parecer spam, adiciona valor real à discussão",
};
