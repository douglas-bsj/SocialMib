import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

/**
 * Cria o usuário administrador inicial (roda no deploy, pelo serviço "seed").
 *
 * IMPORTANTE: se o usuário JÁ EXISTE, a senha dele NÃO é alterada. Antes este
 * script voltava a senha para a senha padrão a cada atualização do servidor, e quem
 * tinha trocado a senha ficava sem conseguir entrar.
 *
 * Variáveis:
 *   ADMIN_EMAIL           e-mail do admin. Se vazia, o script não faz nada.
 *   ADMIN_PASSWORD        senha usada na criação. Se vazia, uma senha aleatória é gerada
 *                         e mostrada UMA vez no log do container "seed".
 *   ADMIN_RESET_PASSWORD  "true" para forçar ADMIN_PASSWORD no usuário que já existe
 *                         (use uma vez para recuperar o acesso e depois apague)
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  // Nenhum dado pessoal fixo no código: o e-mail vem do Portainer.
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!email) {
    console.log("ℹ ADMIN_EMAIL não definido — nenhum admin criado/alterado.");
    return;
  }
  // Nada de senha fixa no código: o repositório é público.
  const plainPassword = process.env.ADMIN_PASSWORD?.trim() || crypto.randomBytes(12).toString("base64url");
  const generated = !process.env.ADMIN_PASSWORD?.trim();
  const forceReset = process.env.ADMIN_RESET_PASSWORD === "true";

  const existing = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (existing) {
    if (existing.email !== email) {
      // Corrige e-mails salvos com letras maiúsculas.
      await db.user.update({ where: { id: existing.id }, data: { email } });
    }
    if (forceReset && generated) {
      console.log("✗ ADMIN_RESET_PASSWORD=true exige definir ADMIN_PASSWORD. Nada foi alterado.");
    } else if (forceReset) {
      await db.user.update({
        where: { id: existing.id },
        data: { password: bcrypt.hashSync(plainPassword, 12) },
      });
      console.log(`✓ Senha de ${email} redefinida (ADMIN_RESET_PASSWORD=true). Remova essa variável agora.`);
    } else {
      console.log(`✓ Usuário ${email} já existe — senha mantida.`);
    }
    return;
  }

  const user = await db.user.create({
    data: {
      email,
      name: email.split("@")[0],
      password: bcrypt.hashSync(plainPassword, 12),
      plan: "AGENCY",
    },
  });
  await db.workspace.create({
    data: {
      name: "Meu Workspace",
      slug: `workspace-${user.id.slice(-6)}`,
      ownerId: user.id,
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  console.log(`✓ Usuário ${email} e workspace criados.`);
  if (generated) console.log(`  Senha inicial gerada: ${plainPassword}  (troque em Configurações → Perfil)`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
