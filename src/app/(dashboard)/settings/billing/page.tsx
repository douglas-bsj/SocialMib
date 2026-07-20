"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS, type PlanKey } from "@/lib/plans";
import { BillingClient } from "./billing-client";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      plan: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      ownedWorkspaces: {
        select: {
          id: true,
          _count: { select: { socialAccounts: true } },
          posts: {
            where: { createdAt: { gte: startOfMonth() } },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!user) redirect("/login");

  const plan = user.plan as PlanKey;
  const planConfig = PLANS[plan];

  // Aggregate usage across all owned workspaces
  const totalAccounts = user.ownedWorkspaces.reduce(
    (sum, ws) => sum + ws._count.socialAccounts,
    0
  );
  const totalPostsThisMonth = user.ownedWorkspaces.reduce(
    (sum, ws) => sum + ws.posts.length,
    0
  );
  const totalWorkspaces = user.ownedWorkspaces.length;

  return (
    <BillingClient
      currentPlan={plan}
      planConfig={planConfig}
      hasSubscription={!!user.stripeCustomerId}
      usage={{
        accounts: totalAccounts,
        postsThisMonth: totalPostsThisMonth,
        workspaces: totalWorkspaces,
      }}
    />
  );
}
