import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Política de Privacidade",
};

export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade" updatedAt="25 de agosto de 2026">
      <Section title="1. Quem somos">
        <p>
          O Mib Social é um produto operado por <strong>MIBTECNO</strong> (JACKSON G. DOS SANTOS),
          CNPJ 20.122.481/0001-15, com sede na Av. Marechal Rondon, Quadra 5, Lote 6, S/N — Sobre
          loja 04, Setor Centro Oeste, CEP 74.560-540, Goiânia/GO. A MIBTECNO é a controladora dos
          dados pessoais tratados nesta plataforma, nos termos da Lei Geral de Proteção de Dados
          (Lei nº 13.709/2018 — LGPD).
        </p>
      </Section>

      <Section title="2. Quais dados coletamos">
        <p>Coletamos os seguintes tipos de dados, conforme o uso que você faz da plataforma:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Dados de cadastro:</strong> nome, e-mail e senha (armazenada com hash, nunca em texto puro), ou dados básicos de perfil quando você entra com sua conta Google.</li>
          <li><strong>Dados de workspace:</strong> nome e slug do workspace, papel de cada membro (proprietário, admin, membro).</li>
          <li><strong>Contas de redes sociais conectadas:</strong> quando você conecta uma conta (Instagram, X, Facebook, LinkedIn, TikTok, YouTube, Pinterest, Reddit, Bluesky ou Threads), armazenamos o token de acesso, nome de usuário, foto de perfil e metadados necessários para publicar em seu nome.</li>
          <li><strong>Conteúdo de posts:</strong> texto, imagens e agendamento dos posts que você cria e publica através da plataforma.</li>
          <li><strong>Dados de cobrança:</strong> se você assina um plano pago, o processamento do pagamento é feito pela Stripe — não armazenamos números de cartão.</li>
          <li><strong>Dados técnicos:</strong> endereço IP (usado apenas para limitar tentativas abusivas de acesso) e registros de uso da aplicação.</li>
        </ul>
      </Section>

      <Section title="3. Para que usamos seus dados">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Autenticar seu acesso e manter sua conta segura;</li>
          <li>Publicar, agendar e gerenciar posts nas redes sociais que você conectou, conforme sua instrução;</li>
          <li>Enviar e-mails transacionais (boas-vindas, redefinição de senha, convites de workspace);</li>
          <li>Processar pagamentos e gerenciar sua assinatura;</li>
          <li>Prevenir fraude, abuso e uso indevido da plataforma;</li>
          <li>Cumprir obrigações legais e regulatórias.</li>
        </ul>
      </Section>

      <Section title="4. Base legal">
        <p>
          Tratamos seus dados com base na <strong>execução de contrato</strong> (para prestar o
          serviço que você contratou), no <strong>consentimento</strong> (ao conectar uma conta de
          rede social ou ao aceitar cookies), no <strong>cumprimento de obrigação legal</strong>
          (dados fiscais de cobrança) e no <strong>legítimo interesse</strong> (segurança e
          prevenção a fraude), conforme os incisos do Art. 7º da LGPD.
        </p>
      </Section>

      <Section title="5. Com quem compartilhamos seus dados">
        <p>Compartilhamos dados apenas com os prestadores necessários para operar o serviço:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>As <strong>plataformas de redes sociais</strong> que você conecta, exclusivamente para publicar o conteúdo que você autorizou;</li>
          <li><strong>Stripe</strong>, para processamento de pagamentos;</li>
          <li><strong>Resend</strong>, para envio de e-mails transacionais;</li>
          <li><strong>OpenAI</strong>, quando você usa o recurso de geração de conteúdo por IA (apenas o texto necessário para gerar a sugestão é enviado);</li>
          <li>Provedores de infraestrutura e hospedagem que executam a aplicação.</li>
        </ul>
        <p>Não vendemos seus dados pessoais a terceiros.</p>
      </Section>

      <Section title="6. Retenção e exclusão">
        <p>
          Mantemos seus dados enquanto sua conta estiver ativa. Ao solicitar o encerramento da
          conta ou a exclusão dos seus dados, removemos as informações associadas, exceto quando a
          retenção for exigida por obrigação legal (por exemplo, dados fiscais de cobrança).
        </p>
      </Section>

      <Section title="7. Segurança">
        <p>
          Senhas são armazenadas com hash (bcrypt), as conexões com a plataforma são criptografadas
          via HTTPS, e o acesso aos dados de cada workspace é restrito aos seus membros.
        </p>
      </Section>

      <Section title="8. Cookies">
        <p>
          Usamos apenas um cookie essencial de sessão para manter você autenticado. Não utilizamos
          cookies de rastreamento ou publicidade de terceiros.
        </p>
      </Section>

      <Section title="9. Seus direitos como titular (Art. 18 da LGPD)">
        <p>Você pode, a qualquer momento, solicitar:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Confirmação da existência de tratamento de dados;</li>
          <li>Acesso aos seus dados;</li>
          <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
          <li>Portabilidade dos dados a outro fornecedor;</li>
          <li>Eliminação dos dados tratados com base no seu consentimento;</li>
          <li>Informação sobre com quem compartilhamos seus dados;</li>
          <li>Revogação do consentimento, quando aplicável (por exemplo, desconectando uma rede social).</li>
        </ul>
      </Section>

      <Section title="10. Menores de idade">
        <p>O Mib Social não é destinado a menores de 18 anos.</p>
      </Section>

      <Section title="11. Alterações desta política">
        <p>
          Podemos atualizar esta política periodicamente. A data da última atualização está sempre
          indicada no topo desta página.
        </p>
      </Section>

      <Section title="12. Contato — Encarregado de Dados">
        <p>
          Para exercer seus direitos ou tirar dúvidas sobre o tratamento dos seus dados, entre em
          contato pelo e-mail{" "}
          <a href="mailto:privacidade@mibtecno.com.br" className="text-violet-600 hover:underline">
            privacidade@mibtecno.com.br
          </a>.
        </p>
      </Section>
    </LegalPage>
  );
}
