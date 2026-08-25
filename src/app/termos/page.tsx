import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Termos de Uso",
};

export default function TermosPage() {
  return (
    <LegalPage title="Termos de Uso" updatedAt="25 de agosto de 2026">
      <Section title="1. Aceitação dos termos">
        <p>
          Estes Termos de Uso regem o acesso e uso do Mib Social, plataforma operada por{" "}
          <strong>MIBTECNO</strong> (JACKSON G. DOS SANTOS), CNPJ 20.122.481/0001-15. Ao criar uma
          conta ou usar a plataforma, você concorda com estes termos e com a nossa{" "}
          <a href="/privacidade" className="text-violet-600 hover:underline">Política de Privacidade</a>.
        </p>
      </Section>

      <Section title="2. Descrição do serviço">
        <p>
          O Mib Social é um SaaS de gestão de redes sociais que permite agendar posts, acompanhar
          métricas, gerenciar um inbox unificado de comentários e mensagens, e colaborar em
          workspaces para múltiplas contas de redes sociais.
        </p>
      </Section>

      <Section title="3. Cadastro e conta">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Você deve fornecer informações verdadeiras e mantê-las atualizadas;</li>
          <li>Você é responsável por manter sua senha em sigilo e por toda atividade realizada com sua conta;</li>
          <li>Ao se cadastrar, um workspace é criado automaticamente em seu nome, do qual você é proprietário;</li>
          <li>Você pode convidar outros membros para o seu workspace, definindo seu papel de acesso.</li>
        </ul>
      </Section>

      <Section title="4. Planos e pagamento">
        <p>
          O Mib Social oferece os planos <strong>Grátis</strong>, <strong>Pro</strong> e{" "}
          <strong>Agência</strong>. Novas contas iniciam com um período de teste gratuito. Planos
          pagos são cobrados recorrentemente através da Stripe e podem ser cancelados a qualquer
          momento — o acesso ao plano pago permanece ativo até o fim do período já pago.
        </p>
      </Section>

      <Section title="5. Uso aceitável">
        <p>Ao usar o Mib Social, você concorda em não:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Publicar conteúdo ilegal, difamatório, discriminatório ou que viole direitos de terceiros;</li>
          <li>Usar a plataforma para envio de spam ou práticas enganosas;</li>
          <li>Violar os termos de uso das plataformas de redes sociais que você conecta (Instagram, X, Facebook, LinkedIn, TikTok, YouTube, Pinterest, Reddit, Bluesky, Threads);</li>
          <li>Tentar acessar áreas ou dados de outros workspaces sem autorização;</li>
          <li>Realizar engenharia reversa, sobrecarregar ou comprometer a segurança da plataforma.</li>
        </ul>
      </Section>

      <Section title="6. Conteúdo do usuário">
        <p>
          Você mantém a titularidade sobre todo o conteúdo (textos, imagens) que publica através do
          Mib Social. Ao usar a plataforma, você nos concede apenas a licença necessária para
          armazenar, processar e publicar esse conteúdo nas redes sociais que você conectou, a seu
          pedido.
        </p>
      </Section>

      <Section title="7. Integrações com redes sociais">
        <p>
          Ao conectar uma conta de rede social, você autoriza o Mib Social a publicar conteúdo e
          ler dados (como comentários e menções) em seu nome, dentro do escopo que você aprovou na
          própria plataforma da rede social. Não controlamos as políticas, disponibilidade ou
          mudanças de API dessas plataformas terceiras, e não somos responsáveis por decisões de
          moderação, suspensão ou remoção de conteúdo tomadas por elas.
        </p>
      </Section>

      <Section title="8. Propriedade intelectual da plataforma">
        <p>
          O software, marca, layout e demais elementos do Mib Social são de propriedade da
          MIBTECNO e protegidos por lei. Estes termos não concedem a você nenhum direito sobre
          essa propriedade além do uso da plataforma conforme aqui descrito.
        </p>
      </Section>

      <Section title="9. Limitação de responsabilidade">
        <p>
          O Mib Social é fornecido &ldquo;como está&rdquo;, sem garantia de disponibilidade
          ininterrupta. Não nos responsabilizamos por perdas decorrentes de indisponibilidade das
          redes sociais conectadas, alterações em suas APIs, ou decisões de moderação tomadas por
          essas plataformas.
        </p>
      </Section>

      <Section title="10. Suspensão e encerramento">
        <p>
          Podemos suspender ou encerrar contas que violem estes termos. Você pode encerrar sua
          conta a qualquer momento entrando em contato conosco.
        </p>
      </Section>

      <Section title="11. Alterações destes termos">
        <p>
          Podemos atualizar estes termos periodicamente. Mudanças relevantes serão comunicadas por
          e-mail ou dentro da própria plataforma.
        </p>
      </Section>

      <Section title="12. Legislação aplicável">
        <p>
          Estes termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de
          Goiânia/GO para dirimir eventuais controvérsias.
        </p>
      </Section>

      <Section title="13. Contato">
        <p>
          Dúvidas sobre estes termos podem ser enviadas para{" "}
          <a href="mailto:contato@mibtecno.com.br" className="text-violet-600 hover:underline">
            contato@mibtecno.com.br
          </a>.
        </p>
      </Section>
    </LegalPage>
  );
}
