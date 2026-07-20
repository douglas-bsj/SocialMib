import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const db = new PrismaClient({ adapter });

async function main() {
  const email = "felipe.ferreira@autobembrasil.coop.br";
  const password = bcrypt.hashSync("admin123", 12);

  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    await db.user.update({ where: { email }, data: { password, plan: "AGENCY" } });
    console.log("✓ Senha atualizada para o usuário existente.");
  } else {
    const user = await db.user.create({
      data: { email, name: "Felipe Ferreira", password, plan: "AGENCY" },
    });
    await db.workspace.create({
      data: {
        name: "AutoBem Brasil",
        slug: "autobem-brasil",
        ownerId: user.id,
      },
    });
    console.log("✓ Usuário e workspace criados com sucesso.");
  }

  const u = await db.user.findUnique({ where: { email }, include: { ownedWorkspaces: true } });
  console.log("  E-mail :", u!.email);
  console.log("  Plano  :", u!.plan);
  console.log("  Senha  : admin123");
  console.log("  Workspace:", u!.ownedWorkspaces[0]?.name ?? "(nenhum)");
}

main()
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => db.$disconnect());
