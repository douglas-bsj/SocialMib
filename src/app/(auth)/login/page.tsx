import { Suspense } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { isPublicRegistrationOpen } from "@/lib/registration";
import { LoginForm } from "./login-form";

// Lê a variável de ambiente a cada requisição (não em tempo de build).
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const registrationOpen = isPublicRegistrationOpen();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 mb-3">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Mib Social</h1>
          <p className="mt-1 text-sm text-gray-500">Entre na sua conta</p>
        </div>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-gray-100" />}>
          <LoginForm />
        </Suspense>
        {registrationOpen && (
          <p className="mt-6 text-center text-sm text-gray-500">
            Não tem conta?{" "}
            <Link href="/register" className="text-violet-600 font-medium hover:underline">Cadastre-se grátis</Link>
          </p>
        )}
      </div>
    </div>
  );
}
