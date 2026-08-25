import Link from "next/link";
import { Zap } from "lucide-react";

export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Mib Social</span>
          </Link>
          <Link href="/" className="text-sm text-violet-600 hover:underline">
            Voltar ao início
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">Última atualização: {updatedAt}</p>
        <div className="prose-legal mt-8 space-y-8 text-[15px] leading-relaxed text-gray-700">
          {children}
        </div>
      </main>

      <footer className="border-t border-gray-200 py-8">
        <div className="mx-auto max-w-3xl px-4 text-sm text-gray-400">
          <p>© 2026 Mib Social — um produto mibtecno. Todos os direitos reservados.</p>
          <div className="mt-2 flex gap-4">
            <Link href="/privacidade" className="hover:text-violet-600">Privacidade</Link>
            <Link href="/termos" className="hover:text-violet-600">Termos</Link>
            <Link href="/contato" className="hover:text-violet-600">Contato</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
