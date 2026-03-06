import Stripe from "stripe";

let _stripe: Stripe | null = null;

export default function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(key, {
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return _stripe;
}

export function getPlanFromPriceId(priceId: string): "pro" | "team" | null {
  const proPrice = process.env.STRIPE_PRICE_PRO_MONTHLY?.trim();
  const teamPrice = process.env.STRIPE_PRICE_TEAM_MONTHLY?.trim();

  if (priceId === proPrice) return "pro";
  if (priceId === teamPrice) return "team";
  return null;
}
