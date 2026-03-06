import { NextRequest, NextResponse } from "next/server";
import getStripe from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { priceId, userId } = body as {
      priceId: string;
      userId?: string;
    };

    if (!priceId) {
      return NextResponse.json(
        { error: "priceId is required" },
        { status: 400 }
      );
    }

    // Validate priceId against known prices
    const validPrices = [
      process.env.STRIPE_PRICE_PRO_MONTHLY?.trim(),
      process.env.STRIPE_PRICE_TEAM_MONTHLY?.trim(),
    ];

    if (!validPrices.includes(priceId)) {
      return NextResponse.json(
        { error: "Invalid price ID" },
        { status: 400 }
      );
    }

    const origin = req.headers.get("origin") || "https://schemashift.vercel.app";
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      metadata: {
        userId: userId || "",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[checkout] Error creating session:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
