import Stripe from "stripe";

function createStripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-06-24.dahlia",
    typescript: true,
  });
}

const globalForStripe = globalThis as unknown as { stripe: Stripe | undefined };
export const stripe = globalForStripe.stripe ?? createStripeClient();
if (process.env.NODE_ENV !== "production") globalForStripe.stripe = stripe;
