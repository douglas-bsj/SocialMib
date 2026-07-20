"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

const PLATFORMS = [
  { id: "INSTAGRAM", label: "Instagram", icon: "📸", color: "bg-pink-50 border-pink-200 text-pink-700" },
  { id: "TWITTER", label: "Twitter / X", icon: "𝕏", color: "bg-sky-50 border-sky-200 text-sky-700" },
  { id: "LINKEDIN", label: "LinkedIn", icon: "in", color: "bg-blue-50 border-blue-200 text-blue-800" },
  { id: "FACEBOOK", label: "Facebook", icon: "f", color: "bg-blue-50 border-blue-200 text-blue-600" },
  { id: "TIKTOK", label: "TikTok", icon: "♪", color: "bg-rose-50 border-rose-200 text-rose-700" },
  { id: "YOUTUBE", label: "YouTube", icon: "▶", color: "bg-red-50 border-red-200 text-red-600" },
];

type Step = "workspace" | "platforms" | "done";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("workspace");
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createWorkspace() {
    if (!workspaceName.trim()) {
      setError("Digite o nome do seu workspace.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspaceName.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Erro ao criar workspace.");
        return;
      }
      setStep("platforms");
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Tudo pronto!</h2>
          <p className="mt-1 text-sm text-gray-500">Redirecionando para o dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left panel */}
      <div className="hidden w-[420px] flex-col justify-between bg-violet-600 p-12 lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">SocialPost</span>
        </div>

        <div>
          <h1 className="text-3xl font-bold leading-tight text-white">
            Bem-vindo ao<br />SocialPost
          </h1>
          <p className="mt-4 text-violet-200 leading-relaxed">
            Configure seu workspace em minutos e comece a gerenciar todas as suas redes sociais em um único lugar.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { n: "1", label: "Crie seu workspace" },
              { n: "2", label: "Escolha suas plataformas" },
              { n: "3", label: "Publique seu primeiro post" },
            ].map(({ n, label }) => (
              <div key={n} className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white">
                  {n}
                </div>
                <span className="text-sm text-violet-100">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-violet-300">© 2026 SocialPost</p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">

          {step === "workspace" && (
            <>
              {/* Step indicator */}
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Passo 1 de 2</span>
              </div>

              <h2 className="text-2xl font-bold text-gray-900">Crie seu workspace</h2>
              <p className="mt-1 text-sm text-gray-500">
                Um workspace é onde você gerencia suas redes sociais.
              </p>

              <div className="mt-8 space-y-4">
                <div>
                  <Label htmlFor="workspace-name" className="mb-1.5 block">
                    Nome do workspace
                  </Label>
                  <Input
                    id="workspace-name"
                    placeholder="Ex: Minha Empresa, Marca Pessoal..."
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createWorkspace()}
                    autoFocus
                    className="h-11"
                  />
                  {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
                </div>

                <Button
                  className="w-full h-11 gap-2"
                  onClick={createWorkspace}
                  disabled={loading || !workspaceName.trim()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {step === "platforms" && (
            <>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Passo 2 de 2</span>
              </div>

              <h2 className="text-2xl font-bold text-gray-900">Quais redes você usa?</h2>
              <p className="mt-1 text-sm text-gray-500">
                Selecione as plataformas que você quer gerenciar. Você pode adicionar mais depois.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3">
                {PLATFORMS.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-default ${p.color}`}
                  >
                    <span className="text-xl">{p.icon}</span>
                    <span className="text-sm font-medium">{p.label}</span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs text-gray-400 text-center">
                Conecte suas contas em{" "}
                <span className="font-medium text-gray-600">Configurações → Contas</span>{" "}
                após o setup.
              </p>

              <Button
                className="mt-8 w-full h-11 gap-2"
                onClick={() => {
                  setStep("done");
                  setTimeout(() => router.push("/dashboard"), 1200);
                }}
              >
                Ir para o Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>

              <button
                className="mt-3 w-full text-center text-sm text-gray-400 hover:text-gray-600"
                onClick={() => router.push("/accounts")}
              >
                Conectar contas agora
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
