import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { HomePage } from "@/components/home-page";

// Logado → painel. Visitante → página inicial pública (exigida na revisão de
// apps das redes, ex.: TikTok: o site não pode ser só uma tela de login).
export default async function RootPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");
  return <HomePage />;
}
