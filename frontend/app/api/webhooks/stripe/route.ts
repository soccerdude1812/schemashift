import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import getStripe, { getPlanFromPriceId } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

// Supabase admin client — uses service role key to bypass RLS
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Get the subscription to find the price ID
    const subscriptionId = session.subscription as string;
    if (!subscriptionId) {
      console.warn("[stripe-webhook] No subscription ID on checkout session");
      return NextResponse.json({ received: true });
    }

    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price?.id;

      if (!priceId) {
        console.warn("[stripe-webhook] No price ID found on subscription");
        return NextResponse.json({ received: true });
      }

      const plan = getPlanFromPriceId(priceId);
      if (!plan) {
        console.warn("[stripe-webhook] Unknown price ID:", priceId);
        return NextResponse.json({ received: true });
      }

      // Get userId from metadata
      const userId = session.metadata?.userId;
      if (!userId) {
        console.warn("[stripe-webhook] No userId in session metadata");
        return NextResponse.json({ received: true });
      }

      // Update the user's plan in Supabase ss_sessions table
      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from("ss_sessions")
        .update({ plan })
        .eq("id", userId);

      if (error) {
        console.error("[stripe-webhook] Failed to update plan in Supabase:", error);
        return NextResponse.json(
          { error: "Failed to update user plan" },
          { status: 500 }
        );
      }

      console.log(
        `[stripe-webhook] Updated user ${userId} to plan: ${plan}`
      );
    } catch (err) {
      console.error("[stripe-webhook] Error processing checkout:", err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
