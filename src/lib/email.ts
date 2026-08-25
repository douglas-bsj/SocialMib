import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM ?? "Mib Social <noreply@social.mibtecno.com.br>";

export async function sendPasswordResetEmail(email: string, name: string | null, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/reset-password?token=${token}`;

  return resend.emails.send({
    from: FROM,
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

  return resend.emails.send({
    from: FROM,
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

export async function sendWelcomeEmail(email: string, name: string | null) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  return resend.emails.send({
    from: FROM,
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
