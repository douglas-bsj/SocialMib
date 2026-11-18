/**
 * Cadastro público (/register e POST /api/auth/register).
 * Desligado por padrão: só `ALLOW_PUBLIC_REGISTER=true` abre. Sem ele, quem cria contas
 * é o dono/admin do workspace, em Configurações → Membros.
 */
export function isPublicRegistrationOpen(): boolean {
  return process.env.ALLOW_PUBLIC_REGISTER === "true";
}
