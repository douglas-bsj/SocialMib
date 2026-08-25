export type PlanKey = "FREE" | "PRO" | "AGENCY";

export interface PlanConfig {
  name: string;
  price: number;
  socialAccountLimit: number;
  monthlyPostLimit: number;
  workspaceLimit: number;
  stripePriceId?: string;
  features: string[];
  highlighted?: boolean;
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  FREE: {
    name: "Grátis",
    price: 0,
    socialAccountLimit: 3,
    monthlyPostLimit: 30,
    workspaceLimit: 1,
    features: ["3 contas sociais", "30 posts/mês", "1 workspace", "Analytics básico"],
  },
  PRO: {
    name: "Pro",
    price: 49,
    socialAccountLimit: 10,
    monthlyPostLimit: Infinity,
    workspaceLimit: 5,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    highlighted: true,
    features: [
      "10 contas sociais",
      "Posts ilimitados",
      "5 workspaces",
      "Analytics avançado",
      "IA integrada",
    ],
  },
  AGENCY: {
    name: "Agency",
    price: 149,
    socialAccountLimit: Infinity,
    monthlyPostLimit: Infinity,
    workspaceLimit: Infinity,
    stripePriceId: process.env.STRIPE_AGENCY_PRICE_ID,
    features: [
      "Contas ilimitadas",
      "Posts ilimitados",
      "Workspaces ilimitados",
      "Membros da equipe",
      "API access",
      "Suporte prioritário",
    ],
  },
};

// Todas as restrições de plano foram removidas: todo usuário tem acesso aos
// recursos do plano mais alto (Agency), independente do valor salvo em
// User.plan. Este campo permanece no schema só como histórico/informativo.
export function getPlanConfig(_plan?: PlanKey): PlanConfig {
  return PLANS.AGENCY;
}

export function getPlanFromPriceId(priceId: string): PlanKey | null {
  for (const [key, config] of Object.entries(PLANS) as [PlanKey, PlanConfig][]) {
    if (config.stripePriceId === priceId) return key;
  }
  return null;
}
