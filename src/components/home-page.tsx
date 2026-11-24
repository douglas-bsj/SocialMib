import Link from "next/link";
import {
  Zap, CalendarClock, Send, Inbox, BarChart3, Users, Sparkles, ArrowRight,
} from "lucide-react";

// Página inicial pública. As plataformas (ex.: TikTok) exigem um site que não
// seja só uma tela de login, com Privacidade e Termos visíveis sem abrir menu.
// Só informações reais do produto — nada de números ou depoimentos inventados.

const FEATURES = [
  {
    icon: Send,
    title: "Publique em várias redes de uma vez",
    text: "Escreva o post uma vez, adapte o texto para cada rede se quiser e publique em todas as contas selecionadas.",
  },
  {
    icon: CalendarClock,
    title: "Agende e acompanhe",
    text: "Escolha dia e hora, veja tudo num calendário e saiba o que foi publicado, o que está agendado e o que falhou.",
  },
  {
    icon: Inbox,
    title: "Caixa de entrada unificada",
    text: "Comentários e mensagens das redes conectadas num só lugar.",
  },
  {
    icon: BarChart3,
    title: "Análise",
    text: "Acompanhe os posts publicados em cada rede.",
  },
  {
    icon: Users,
    title: "Trabalho em equipe",
    text: "Workspaces com dono, administradores e membros, cada um com seu acesso.",
  },
  {
    icon: Sparkles,
    title: "Textos com IA",
    text: "Gere sugestões de texto adaptadas a cada rede a partir de um tema.",
  },
];

const NETWORKS = [
  "Instagram", "Facebook", "TikTok", "X (Twitter)", "Threads", "Bluesky", "Pinterest", "Reddit",
];

const STEPS = [
  { n: "1", title: "Conecte as contas", text: "Autorize cada rede social pela tela oficial dela. Você pode desconectar quando quiser." },
  { n: "2", title: "Crie o post", text: "Texto, imagens ou vídeo, e as opções de cada rede, como a privacidade no TikTok." },
  { n: "3", title: "Publique ou agende", text: "O Mib Social publica na hora ou no horário escolhido e mostra o resultado." },
];

export function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Cabeçalho: links legais sempre visíveis (também no celular). */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold">Mib Social</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/privacidade" className="text-gray-600 hover:text-violet-600">Privacidade</Link>
            <Link href="/termos" className="text-gray-600 hover:text-violet-600">Termos</Link>
            <Link href="/contato" className="hidden text-gray-600 hover:text-violet-600 sm:inline">Contato</Link>
            <Link
              href="/login"
              className="rounded-lg bg-violet-600 px-3.5 py-1.5 font-medium text-white hover:bg-violet-500"
            >
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Apresentação */}
        <section className="mx-auto max-w-5xl px-4 pb-12 pt-16 text-center sm:pt-24">
          <p className="mb-4 text-sm font-medium text-violet-600">Gestão de redes sociais · mibtecno</p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Todas as redes sociais da sua empresa em um só lugar
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">
            O Mib Social, da mibtecno, é uma plataforma para criar, agendar e publicar conteúdo nas
            redes sociais, acompanhar mensagens e ver resultados — sem trocar de aba.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-500"
            >
              Entrar na plataforma <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contato"
              className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 hover:border-violet-300"
            >
              Quero usar o Mib Social
            </Link>
          </div>
        </section>

        {/* Redes */}
        <section className="mx-auto max-w-5xl px-4 pb-16">
          <p className="mb-4 text-center text-sm text-gray-500">Redes sociais suportadas</p>
          <ul className="flex flex-wrap justify-center gap-2">
            {NETWORKS.map((n) => (
              <li key={n} className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm text-gray-700">
                {n}
              </li>
            ))}
          </ul>
        </section>

        {/* Funcionalidades */}
        <section className="border-y border-gray-200 bg-white py-16">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">O que dá para fazer</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-gray-200 p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                    <Icon className="h-5 w-5 text-violet-600" />
                  </div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Como funciona</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 font-bold text-white">
                  {s.n}
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{s.text}</p>
              </li>
            ))}
          </ol>
          <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-gray-500">
            O Mib Social só publica com a sua autorização e usa os dados das contas conectadas apenas
            para as funções acima. Veja a{" "}
            <Link href="/privacidade" className="text-violet-600 underline">Política de Privacidade</Link> e os{" "}
            <Link href="/termos" className="text-violet-600 underline">Termos de Uso</Link>.
          </p>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-gray-500">
          <p>© 2026 Mib Social — um produto mibtecno. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <Link href="/privacidade" className="hover:text-violet-600">Privacidade</Link>
            <Link href="/termos" className="hover:text-violet-600">Termos</Link>
            <Link href="/contato" className="hover:text-violet-600">Contato</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
