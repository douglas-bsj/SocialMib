"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Zap, AlertCircle, ExternalLink, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS, type PlanKey, type PlanConfig } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { Suspense } from "react";

interface Props {
  currentPlan: PlanKey;
  planConfig: PlanConfig;
  hasSubscription: boolean;
  usage: {
    accounts: number;
    postsThisMonth: number;
    workspaces: number;
  };
}

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const isUnlimited = !isFinite(limit);
  const pct = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = pct >= 80;
  const isAtLimit = pct >= 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-gray-600">{label}</span>
        <span className={cn("text-sm font-medium", isAtLimit ? "text-red-600" : isNearLimit ? "text-amber-600" : "text-gray-900")}>
          {used}{isUnlimited ? "" : ` / ${limit}`}
          {isUnlimited && <span className="text-gray-400 font-normal ml-1">ilimitado</span>}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isAtLimit ? "bg-red-500" : isNearLimit ? "bg-amber-400" : "bg-violet-500"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const params = useSearchParams();
  if (params.get("success")) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 mb-6">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Plano atualizado com sucesso!
      </div>
    );
  }
  if (params.get("cancelled")) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 mb-6">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Checkout cancelado. Seu plano não foi alterado.
      </div>
    );
  }
  return null;
}

const PLAN_ORDER: PlanKey[] = ["FREE", "PRO", "AGENCY"];

function isPlanUpgrade(current: PlanKey, target: PlanKey) {
  return PLAN_ORDER.indexOf(target) > PLAN_ORDER.indexOf(current);
}

export function BillingClient({ currentPlan, planConfig, hasSubscription, usage }: Props) {
  const [loading, setLoading] = useState<PlanKey | "portal" | null>(null);

  async function handleUpgrade(plan: PlanKey) {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Erro ao iniciar checkout.");
      }
    } finally {
      setLoading(null);
    }
  }

  async function handlePortal() {
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Erro ao abrir portal.");
      }
    } finally {
      setLoading(null);
    }
  }

  const planColors: Record<PlanKey, string> = {
    FREE: "bg-gray-100 text-gray-700",
    PRO: "bg-violet-100 text-violet-700",
    AGENCY: "bg-amber-100 text-amber-700",
  };

  return (
    <div>
      <Suspense><Notifications /></Suspense>

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700">Plano atual e uso</h2>
        <p className="text-xs text-gray-400 mt-0.5">Gerencie sua assinatura e acompanhe o uso.</p>
      </div>

      {/* Current plan card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
              <Crown className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Plano atual</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl font-bold text-gray-900">{planConfig.name}</span>
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", planColors[currentPlan])}>
                  {currentPlan}
                </span>
              </div>
            </div>
          </div>

          {hasSubscription && currentPlan !== "FREE" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePortal}
              disabled={loading === "portal"}
            >
              {loading === "portal" ? "Aguarde..." : (
                <>Gerenciar assinatura <ExternalLink className="ml-1.5 h-3 w-3" /></>
              )}
            </Button>
          )}
        </div>

        {/* Usage */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700">Uso este mês</p>
          <UsageBar
            used={usage.accounts}
            limit={planConfig.socialAccountLimit}
            label="Contas sociais conectadas"
          />
          <UsageBar
            used={usage.postsThisMonth}
            limit={planConfig.monthlyPostLimit}
            label="Posts criados no mês"
          />
          <UsageBar
            used={usage.workspaces}
            limit={planConfig.workspaceLimit}
            label="Workspaces"
          />
        </div>
      </div>

      {/* Plan comparison */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Planos disponíveis</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(Object.entries(PLANS) as [PlanKey, PlanConfig][]).map(([key, config]) => {
          const isCurrent = key === currentPlan;
          const isUpgrade = isPlanUpgrade(currentPlan, key);
          const isDowngrade = !isCurrent && !isUpgrade;

          return (
            <div
              key={key}
              className={cn(
                "relative rounded-xl border p-5 transition-shadow",
                isCurrent
                  ? "border-violet-300 bg-violet-50 shadow-sm"
                  : config.highlighted
                  ? "border-violet-200 bg-white shadow-md"
                  : "border-gray-200 bg-white"
              )}
            >
              {isCurrent && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-violet-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  Plano atual
                </span>
              )}
              {config.highlighted && !isCurrent && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-violet-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  Recomendado
                </span>
              )}

              <div className="mb-4">
                <p className="font-semibold text-gray-900">{config.name}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold text-gray-900">
                    {config.price === 0 ? "Grátis" : `R$ ${config.price}`}
                  </span>
                  {config.price > 0 && (
                    <span className="text-sm text-gray-400">/mês</span>
                  )}
                </div>
              </div>

              <ul className="space-y-2 mb-5">
                {config.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <Button variant="outline" className="w-full" disabled>
                  Plano atual
                </Button>
              ) : key === "FREE" ? (
                <Button variant="outline" className="w-full text-gray-500" disabled>
                  {isDowngrade ? "Cancelar plano" : "Padrão"}
                </Button>
              ) : (
                <Button
                  className={cn("w-full", config.highlighted && !isCurrent ? "bg-violet-600 hover:bg-violet-700" : "")}
                  variant={isDowngrade ? "outline" : "default"}
                  onClick={() => handleUpgrade(key)}
                  disabled={loading === key}
                >
                  {loading === key ? "Aguarde..." : (
                    <>
                      {isUpgrade ? <><Zap className="mr-1.5 h-3.5 w-3.5" />Fazer upgrade</> : "Ver plano"}
                    </>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Stripe note */}
      <p className="text-xs text-gray-400 text-center mt-6">
        Pagamentos processados com segurança via Stripe · Cancele a qualquer momento
      </p>
    </div>
  );
}
