"use client";

import { CheckCircle2, ExternalLink, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { PlanConfig } from "@/lib/plans";

interface Props {
  planConfig: PlanConfig;
  hasSubscription: boolean;
  usage: {
    accounts: number;
    postsThisMonth: number;
    workspaces: number;
  };
}

function UsageStat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

export function BillingClient({ planConfig, hasSubscription, usage }: Props) {
  const [loadingPortal, setLoadingPortal] = useState(false);

  async function handlePortal() {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Erro ao abrir portal.");
      }
    } finally {
      setLoadingPortal(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700">Plano e uso</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Todos os recursos do sistema estão liberados para todos os usuários — sem limites.
        </p>
      </div>

      {/* Full access card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
              <Crown className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Acesso</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl font-bold text-gray-900">Completo — todos os recursos liberados</span>
              </div>
            </div>
          </div>

          {hasSubscription && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePortal}
              disabled={loadingPortal}
            >
              {loadingPortal ? "Aguarde..." : (
                <>Gerenciar assinatura <ExternalLink className="ml-1.5 h-3 w-3" /></>
              )}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6 pt-4 border-t border-gray-100">
          <UsageStat value={usage.accounts} label="Contas sociais conectadas" />
          <UsageStat value={usage.postsThisMonth} label="Posts criados no mês" />
          <UsageStat value={usage.workspaces} label="Workspaces" />
        </div>
      </div>

      {/* Features */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recursos disponíveis</h2>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {planConfig.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {hasSubscription && (
        <p className="text-xs text-gray-400 text-center mt-6">
          Você tem uma assinatura ativa no Stripe. Como todos os recursos já estão liberados para
          todos os usuários, você pode cancelá-la a qualquer momento em &ldquo;Gerenciar assinatura&rdquo;.
        </p>
      )}
    </div>
  );
}
