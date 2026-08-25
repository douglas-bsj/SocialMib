import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/legal-page";
import { Mail, Phone, MapPin, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Contato",
};

const CHANNELS = [
  {
    icon: Mail,
    label: "E-mail",
    value: "contato@mibtecno.com.br",
    href: "mailto:contato@mibtecno.com.br",
  },
  {
    icon: Phone,
    label: "Telefone / WhatsApp",
    value: "(62) 99860-6938",
    href: "https://wa.me/5562998606938",
  },
  {
    icon: Globe,
    label: "Website",
    value: "mibtecno.com.br",
    href: "https://mibtecno.com.br",
  },
];

export default function ContatoPage() {
  return (
    <LegalPage title="Contato" updatedAt="25 de agosto de 2026">
      <Section title="Fale com a gente">
        <p>
          O Mib Social é um produto da <strong>MIBTECNO</strong>. Para suporte, dúvidas comerciais
          ou parcerias, use um dos canais abaixo.
        </p>
      </Section>

      <div className="grid gap-3 sm:grid-cols-2">
        {CHANNELS.map(({ icon: Icon, label, value, href }) => (
          <a
            key={label}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-violet-300"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-sm font-medium text-gray-900">{value}</p>
            </div>
          </a>
        ))}
        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:col-span-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Endereço</p>
            <p className="text-sm font-medium text-gray-900">
              Av. Marechal Rondon, Quadra 5, Lote 6, S/N — Sobre loja 04, Setor Centro Oeste
              <br />
              CEP 74.560-540, Goiânia/GO
            </p>
          </div>
        </div>
      </div>

      <Section title="Questões sobre privacidade e dados pessoais">
        <p>
          Para exercer seus direitos como titular de dados (acesso, correção, exclusão, entre
          outros), escreva para{" "}
          <a href="mailto:privacidade@mibtecno.com.br" className="text-violet-600 hover:underline">
            privacidade@mibtecno.com.br
          </a>{" "}
          — veja também a nossa{" "}
          <a href="/privacidade" className="text-violet-600 hover:underline">Política de Privacidade</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
