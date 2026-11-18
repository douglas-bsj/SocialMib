import { redirect } from "next/navigation";
import { isPublicRegistrationOpen } from "@/lib/registration";
import { RegisterForm } from "./register-form";

// Lê a variável de ambiente a cada requisição (não em tempo de build).
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  // Cadastro público desligado (padrão): /register não existe para o visitante.
  if (!isPublicRegistrationOpen()) redirect("/login");
  return <RegisterForm />;
}
