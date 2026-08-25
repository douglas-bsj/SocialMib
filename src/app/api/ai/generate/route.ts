import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openai, PLATFORM_TONE } from "@/lib/openai";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  topic: z.string().min(3).max(500),
  platforms: z.array(z.string()).min(1).max(10),
  tone: z.enum(["professional", "casual", "humorous", "inspirational"]).default("casual"),
  language: z.string().default("pt-BR"),
  generateVariations: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, { limit: 20, window: 60, prefix: "rl:ai" });
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const { topic, platforms, tone, language, generateVariations } = parsed.data;

  const toneMap = {
    professional: "profissional e informativo",
    casual: "casual e conversacional",
    humorous: "bem-humorado e leve",
    inspirational: "inspiracional e motivacional",
  };

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-placeholder") {
    return NextResponse.json(
      { error: "OPENAI_API_KEY não configurada. Adicione sua chave no .env para usar a IA." },
      { status: 503 }
    );
  }

  try {
    if (!generateVariations || platforms.length === 1) {
      // Single post for the primary platform
      const platform = platforms[0];
      const platformGuidance = PLATFORM_TONE[platform] ?? "engajante e adequado à plataforma";

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em marketing de redes sociais. Escreva posts em ${language}. Seja ${toneMap[tone]}. Retorne APENAS o texto do post, sem explicações ou prefixos.`,
          },
          {
            role: "user",
            content: `Crie um post para ${platform} sobre: "${topic}"\n\nDiretrizes para ${platform}: ${platformGuidance}`,
          },
        ],
        temperature: 0.8,
        max_tokens: 600,
      });

      const content = completion.choices[0]?.message?.content?.trim() ?? "";
      return NextResponse.json({ content, variations: {} });
    }

    // Generate platform-specific variations in parallel
    const variationEntries = await Promise.all(
      platforms.map(async (platform) => {
        const platformGuidance = PLATFORM_TONE[platform] ?? "engajante e adequado à plataforma";

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Você é um especialista em marketing de redes sociais. Escreva posts em ${language}. Seja ${toneMap[tone]}. Retorne APENAS o texto do post, sem explicações ou prefixos.`,
            },
            {
              role: "user",
              content: `Crie um post para ${platform} sobre: "${topic}"\n\nDiretrizes para ${platform}: ${platformGuidance}`,
            },
          ],
          temperature: 0.8,
          max_tokens: 600,
        });

        const content = completion.choices[0]?.message?.content?.trim() ?? "";
        return [platform, content] as [string, string];
      })
    );

    const variations = Object.fromEntries(variationEntries);
    // Use the first platform's content as the main content
    const content = variations[platforms[0]] ?? "";

    return NextResponse.json({ content, variations });
  } catch (err) {
    console.error("OpenAI error:", err);
    const msg = err instanceof Error ? err.message : "Erro na geração de conteúdo.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
