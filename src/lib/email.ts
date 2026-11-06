import { Resend } from "resend";
import nodemailer from "nodemailer";

/**
 * Envio de e-mails.
 *
 * Prioridade:
 *  1. SMTP (e-mail da empresa: Microsoft 365, Gmail, etc.) — se SMTP_HOST estiver definido.
 *  2. Resend — se RESEND_API_KEY for uma chave real.
 * Sem nenhum dos dois, o envio falha com um erro claro (antes falhava em silêncio).
 */

function isRealResendKey(key?: string) {
  return !!key && key.startsWith("re_") && !/dummy|placeholder|build/i.test(key);
}

export function isEmailConfigured(): boolean {
  return !!process.env.SMTP_HOST || isRealResendKey(process.env.RESEND_API_KEY);
}

function getFrom(): string {
  const from = process.env.EMAIL_FROM?.trim();
  if (from) return from;
  if (process.env.SMTP_USER) return `Mib Social <${process.env.SMTP_USER}>`;
  return "Mib Social <noreply@social.mibtecno.com.br>";
}

let _transport: nodemailer.Transporter | null = null;
function getSmtpTransport() {
  if (!_transport) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    _transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // 465 = SSL direto; 587 = STARTTLS. SMTP_SECURE força o valor se precisar.
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
        : undefined,
    });
  }
  return _transport;
}

let _resend: Resend | null = null;

async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const from = getFrom();

  if (process.env.SMTP_HOST) {
    await getSmtpTransport().sendMail({ from, to, subject, html });
    return;
  }

  if (isRealResendKey(process.env.RESEND_API_KEY)) {
    _resend ??= new Resend(process.env.RESEND_API_KEY);
    const { error } = await _resend.emails.send({ from, to, subject, html });
    // O Resend devolve o erro em vez de lançar — antes isso era ignorado.
    if (error) throw new Error(`Resend: ${error.message}`);
    return;
  }

  throw new Error(
    "Envio de e-mail não configurado. Defina SMTP_HOST/SMTP_USER/SMTP_PASS (ou RESEND_API_KEY) no servidor."
  );
}

export async function sendPasswordResetEmail(email: string, name: string | null, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/reset-password?token=${token}`;

  return sendMail({
    to: email,
    subject: "Redefinir sua senha — Mib Social",
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;border:1px solid #e5e7eb;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px;">
      <div style="width:32px;height:32px;background:#7c3aed;border-radius:8px;display:flex;align-items:center;justify-content:center;">
        <span style="color:#fff;font-size:14px;font-weight:700;">M</span>
      </div>
      <span style="font-size:18px;font-weight:700;color:#111827;">Mib Social</span>
    </div>
    <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 8px;">Redefinir senha</h1>
    <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Olá${name ? `, ${name}` : ""}! Recebemos um pedido para redefinir a senha da sua conta.
    </p>
    <a href="${link}" style="display:inline-block;background:#7c3aed;color:#fff;font-weight:600;font-size:15px;padding:12px 28px;border-radius:10px;text-decoration:none;margin-bottom:24px;">
      Redefinir senha
    </a>
    <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">
      Este link expira em <strong>1 hora</strong>. Se você não solicitou a redefinição, pode ignorar este e-mail com segurança.
    </p>
  </div>
</body>
</html>`,
  });
}

export async function sendWorkspaceInviteEmail(
  email: string,
  inviterName: string | null,
  workspaceName: string,
) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/register`;

  return sendMail({
    to: email,
    subject: `${inviterName ?? "Alguém"} te convidou para o ${workspaceName} no Mib Social`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;border:1px solid #e5e7eb;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px;">
      <div style="width:32px;height:32px;background:#7c3aed;border-radius:8px;display:flex;align-items:center;justify-content:center;">
        <span style="color:#fff;font-size:14px;font-weight:700;">M</span>
      </div>
      <span style="font-size:18px;font-weight:700;color:#111827;">Mib Social</span>
    </div>
    <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 8px;">Você foi convidado!</h1>
    <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
      <strong>${inviterName ?? "Alguém"}</strong> te convidou para colaborar no workspace <strong>${workspaceName}</strong> no Mib Social.
    </p>
    <a href="${link}" style="display:inline-block;background:#7c3aed;color:#fff;font-weight:600;font-size:15px;padding:12px 28px;border-radius:10px;text-decoration:none;margin-bottom:24px;">
      Aceitar convite
    </a>
    <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">
      Se você não tem uma conta, será necessário criar uma primeiro.
    </p>
  </div>
</body>
</html>`,
  });
}

export async function sendNewMemberAccountEmail(
  email: string,
  name: string,
  inviterName: string | null,
  workspaceName: string,
) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  return sendMail({
    to: email,
    subject: `Sua conta no Mib Social foi criada — workspace ${workspaceName}`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;border:1px solid #e5e7eb;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px;">
      <div style="width:32px;height:32px;background:#7c3aed;border-radius:8px;display:flex;align-items:center;justify-content:center;">
        <span style="color:#fff;font-size:14px;font-weight:700;">M</span>
      </div>
      <span style="font-size:18px;font-weight:700;color:#111827;">Mib Social</span>
    </div>
    <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 8px;">Olá, ${name.split(" ")[0]}!</h1>
    <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
      <strong>${inviterName ?? "Alguém"}</strong> criou uma conta para você no Mib Social e te
      adicionou ao workspace <strong>${workspaceName}</strong>. Peça a senha de acesso a quem te
      cadastrou para fazer seu primeiro login — depois você pode trocá-la em Configurações.
    </p>
    <a href="${baseUrl}/login" style="display:inline-block;background:#7c3aed;color:#fff;font-weight:600;font-size:15px;padding:12px 28px;border-radius:10px;text-decoration:none;margin-bottom:24px;">
      Fazer login
    </a>
    <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">
      Seu e-mail de acesso é <strong>${email}</strong>.
    </p>
  </div>
</body>
</html>`,
  });
}

export async function sendWelcomeEmail(email: string, name: string | null) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  return sendMail({
    to: email,
    subject: "Bem-vindo ao Mib Social! 🎉",
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;border:1px solid #e5e7eb;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px;">
      <div style="width:32px;height:32px;background:#7c3aed;border-radius:8px;display:flex;align-items:center;justify-content:center;">
        <span style="color:#fff;font-size:14px;font-weight:700;">M</span>
      </div>
      <span style="font-size:18px;font-weight:700;color:#111827;">Mib Social</span>
    </div>
    <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 8px;">Bem-vindo${name ? `, ${name.split(" ")[0]}` : ""}!</h1>
    <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Sua conta foi criada com sucesso. Conecte suas redes sociais e comece a agendar posts agora.
    </p>
    <a href="${baseUrl}/accounts" style="display:inline-block;background:#7c3aed;color:#fff;font-weight:600;font-size:15px;padding:12px 28px;border-radius:10px;text-decoration:none;margin-bottom:24px;">
      Conectar minhas contas
    </a>
    <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">
      Você está no plano Grátis. Sem cartão de crédito necessário.
    </p>
  </div>
</body>
</html>`,
  });
}
