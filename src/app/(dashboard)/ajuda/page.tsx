import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, ArrowLeft, Info } from "lucide-react";

export const metadata: Metadata = {
  title: "Ajuda — Como preparar suas contas | Mib Social",
};

type Requirement = "any" | "professional" | "page";

interface Guide {
  id: string;
  name: string;
  icon: string;
  bg: string;
  requirement: Requirement;
  summary: string;
  steps: string[];
  tips?: string[];
}

const REQUIREMENT_LABEL: Record<Requirement, { text: string; cls: string }> = {
  any: { text: "Qualquer conta", cls: "bg-green-50 text-green-700 border-green-200" },
  professional: { text: "Conta profissional (grátis)", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  page: { text: "Precisa de uma Página", cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

const GUIDES: Guide[] = [
  {
    id: "instagram",
    name: "Instagram",
    icon: "📸",
    bg: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400",
    requirement: "professional",
    summary:
      "O Instagram só permite publicar por aplicativos em contas Profissionais. A troca é gratuita, leva 1 minuto e você não precisa ter empresa — basta escolher “Criador de conteúdo”.",
    steps: [
      "Abra o app do Instagram e vá até o seu perfil.",
      "Toque no menu ☰ (canto superior direito) → Configurações e privacidade.",
      "Toque em “Tipo de conta e ferramentas” → “Mudar para conta profissional”.",
      "Escolha uma categoria (ex.: “Criador de conteúdo digital”) e depois “Criador de conteúdo” ou “Empresa”.",
      "Pronto! Volte ao Mib Social e conecte o Instagram em Contas → Conectar Conta.",
    ],
    tips: [
      "Seu perfil continua igual para os seguidores e você ganha acesso a estatísticas.",
      "Se quiser, dá para voltar para conta pessoal depois nas mesmas configurações.",
      "As publicações no Instagram precisam ter pelo menos uma imagem.",
    ],
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "f",
    bg: "bg-blue-600",
    requirement: "page",
    summary:
      "O Facebook não permite que aplicativos publiquem em perfis pessoais — apenas em Páginas. Qualquer pessoa pode criar uma Página de graça em poucos minutos.",
    steps: [
      "No Facebook, abra o menu e toque em “Páginas” → “Criar nova Página”.",
      "Dê um nome (pode ser o seu nome ou da sua marca) e escolha uma categoria.",
      "Conclua a criação. Você será o administrador da Página.",
      "No Mib Social, conecte o Facebook e, na janela do Facebook, selecione a Página que deseja usar.",
    ],
    tips: [
      "Se você já administra uma Página, é só conectá-la — não precisa criar outra.",
      "Na autorização, marque todas as Páginas que quer gerenciar pelo Mib Social.",
    ],
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "♪",
    bg: "bg-gray-900",
    requirement: "any",
    summary:
      "Funciona com contas pessoais, de criador ou empresariais. Publica vídeo (MP4, MOV ou WebM, até 95 MB) ou fotos (JPG ou WebP).",
    steps: [
      "No Mib Social, vá em Contas → Conectar Conta → TikTok.",
      "Entre com a sua conta do TikTok e autorize o acesso, aceitando todas as permissões.",
      "Ao criar o post, marque a conta TikTok, adicione o vídeo ou as fotos e escolha quem pode ver o post.",
    ],
    tips: [
      "Enquanto o app do Mib Social não for aprovado (auditado) pelo TikTok, a conta TikTok precisa estar como privada e os posts saem visíveis só para você (“Só eu”). Depois dá para mudar cada post para “Todos” no app do TikTok.",
      "Um post com vídeo vai só para o TikTok; as outras redes ainda não recebem vídeo pelo Mib Social.",
      "Fotos só funcionam depois que o domínio do Mib Social for verificado no TikTok Developers. Vídeo não precisa disso.",
      "O TikTok limita cerca de 15 posts por dia por conta.",
    ],
  },
  {
    id: "threads",
    name: "Threads",
    icon: "@",
    bg: "bg-gray-900",
    requirement: "any",
    summary: "Funciona com qualquer perfil do Threads.",
    steps: [
      "Se ainda não usa o Threads, abra o app do Threads uma vez com sua conta do Instagram para ativar o perfil.",
      "No Mib Social, vá em Contas → Conectar Conta → Threads e autorize.",
    ],
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "▶",
    bg: "bg-red-600",
    requirement: "any",
    summary: "Funciona com qualquer canal do YouTube.",
    steps: [
      "Se ainda não tem um canal, entre no YouTube com sua conta Google e crie um canal (ícone do perfil → Criar um canal).",
      "No Mib Social, vá em Contas → Conectar Conta → YouTube e autorize com a mesma conta Google.",
    ],
    tips: ["O YouTube aceita apenas vídeos."],
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    icon: "𝕏",
    bg: "bg-black",
    requirement: "any",
    summary: "Funciona com qualquer conta do X.",
    steps: [
      "No Mib Social, vá em Contas → Conectar Conta → X (Twitter).",
      "Entre com a sua conta do X e clique em “Autorizar app”.",
    ],
  },
  {
    id: "pinterest",
    name: "Pinterest",
    icon: "P",
    bg: "bg-red-500",
    requirement: "any",
    summary: "Funciona com contas pessoais ou empresariais. Você precisa ter pelo menos uma pasta (board).",
    steps: [
      "No Pinterest, crie uma pasta caso ainda não tenha (Perfil → + → Pasta).",
      "No Mib Social, vá em Contas → Conectar Conta → Pinterest e autorize.",
    ],
  },
  {
    id: "reddit",
    name: "Reddit",
    icon: "🤖",
    bg: "bg-orange-600",
    requirement: "any",
    summary: "Funciona com qualquer conta do Reddit. As publicações vão para o seu perfil.",
    steps: ["No Mib Social, vá em Contas → Conectar Conta → Reddit e clique em “Allow”."],
  },
  {
    id: "bluesky",
    name: "Bluesky",
    icon: "🦋",
    bg: "bg-sky-500",
    requirement: "any",
    summary:
      "Funciona com qualquer conta. O Bluesky usa uma “senha de app” em vez da sua senha principal — é mais seguro.",
    steps: [
      "No Bluesky, vá em Configurações → Privacidade e segurança → Senhas de app.",
      "Clique em “Adicionar senha de app”, dê um nome (ex.: Mib Social) e copie a senha gerada.",
      "No Mib Social, vá em Contas → Conectar Conta → Bluesky.",
      "Informe seu usuário (ex.: seunome.bsky.social) e cole a senha de app.",
    ],
    tips: ["Nunca use sua senha principal do Bluesky — use sempre a senha de app."],
  },
];

export default function HelpPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link
        href="/accounts"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Contas
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Como preparar suas contas</h1>
      <p className="mt-1 text-sm text-gray-500">
        Veja o que cada rede social exige para conectar ao Mib Social. Você pode voltar a esta página
        sempre que precisar.
      </p>

      {/* Resumo */}
      <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
        <div className="flex gap-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Resumo rápido</p>
            <p className="mt-1">
              Quase todas as redes funcionam com qualquer conta. As exceções são do próprio Instagram e
              Facebook: o <strong>Instagram</strong> exige conta <strong>Profissional</strong> e o{" "}
              <strong>Facebook</strong> exige uma <strong>Página</strong> — os dois são gratuitos e
              rápidos de configurar.
            </p>
          </div>
        </div>
      </div>

      {/* Índice */}
      <div className="mt-6 flex flex-wrap gap-2">
        {GUIDES.map((g) => (
          <a
            key={g.id}
            href={`#${g.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-violet-300 hover:bg-violet-50"
          >
            {g.name}
            {g.requirement !== "any" && <AlertTriangle className="h-3 w-3 text-amber-500" />}
          </a>
        ))}
      </div>

      {/* Guias */}
      <div className="mt-6 space-y-3">
        {GUIDES.map((g) => {
          const req = REQUIREMENT_LABEL[g.requirement];
          return (
            <details
              key={g.id}
              id={g.id}
              open={g.requirement !== "any"}
              className="group scroll-mt-6 rounded-xl border border-gray-200 bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${g.bg}`}
                >
                  {g.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{g.name}</p>
                  <span
                    className={`mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${req.cls}`}
                  >
                    {g.requirement === "any" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {req.text}
                  </span>
                </div>
                <span className="text-xs text-gray-400 group-open:hidden">Ver passo a passo</span>
                <span className="hidden text-xs text-gray-400 group-open:inline">Fechar</span>
              </summary>

              <div className="border-t border-gray-100 px-5 py-4 text-sm">
                <p className="text-gray-600">{g.summary}</p>
                <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-gray-700">
                  {g.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
                {g.tips && (
                  <ul className="mt-3 space-y-1 text-xs text-gray-500">
                    {g.tips.map((t, i) => (
                      <li key={i}>💡 {t}</li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-gray-400">
        Ainda com dúvidas? Fale com o suporte em{" "}
        <Link href="/contato" className="text-violet-600 hover:text-violet-700">
          Contato
        </Link>
        .
      </p>
    </div>
  );
}
