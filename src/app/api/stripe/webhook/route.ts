import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { getPlanFromPriceId } from "@/lib/plans";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Sem assinatura Stripe." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("Webhook signature error:", msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;

        if (!userId || !plan) {
          console.warn("checkout.session.completed: missing userId or plan in metadata");
          break;
        }

        await db.user.update({
          where: { id: userId },
          data: {
            plan: plan as any,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
          },
        });
        console.log(`✓ Plano ${plan} ativado para usuário ${userId}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = priceId ? getPlanFromPriceId(priceId) : null;

        const user = await db.user.findFirst({
          where: { stripeCustomerId: subscription.customer as string },
        });

        if (!user) {
          console.warn("subscription.updated: customer not found", subscription.customer);
          break;
        }

        if (plan) {
          await db.user.update({
            where: { id: user.id },
            data: { plan: plan as any, stripeSubscriptionId: subscription.id },
          });
          console.log(`✓ Plano atualizado para ${plan} — usuário ${user.id}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const user = await db.user.findFirst({
          where: { stripeCustomerId: subscription.customer as string },
        });

        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: { plan: "FREE", stripeSubscriptionId: null },
          });
          console.log(`✓ Assinatura cancelada — usuário ${user.id} rebaixado para FREE`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(
          `Pagamento falhou para customer ${invoice.customer} — invoice ${invoice.id}`
        );
        // Optional: send email notification to user
        break;
      }

      default:
        console.log(`Evento Stripe ignorado: ${event.type}`);
    }
  } catch (err) {
    console.error("Erro ao processar webhook:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
