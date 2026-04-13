/**
 * Stripe payment integration — NOT active.
 *
 * This file wires up the Stripe SDK and exposes helper functions for:
 *   - Creating a Checkout Session for song purchases
 *   - Verifying incoming webhook events
 *   - Retrieving session / payment-intent details
 *
 * To activate:
 *   1. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in environment secrets.
 *   2. Set STORE_ENABLED=true in environment.
 *   3. Mount storeRouter inside server/routes.ts (see server/store-routes.ts).
 */

import type { Request } from "express";
import Stripe from "stripe";

// ---------------------------------------------------------------------------
// Lazy-init Stripe so the rest of the app boots fine without the key set.
// ---------------------------------------------------------------------------

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  _stripe = new Stripe(key, { apiVersion: "2024-04-10" });
  return _stripe;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CartItem {
  songId: number;
  songTitle: string;
  artistName: string;
  licenseType: "personal" | "commercial";
  priceCents: number;
}

export interface CreateSessionOptions {
  userId: number;
  buyerEmail: string;
  buyerName?: string;
  items: CartItem[];
  successUrl: string;
  cancelUrl: string;
}

// ---------------------------------------------------------------------------
// Create a Stripe Checkout Session for a set of song purchases.
// ---------------------------------------------------------------------------

export async function createCheckoutSession(opts: CreateSessionOptions) {
  const stripe = getStripe();

  const lineItems = opts.items.map((item) => ({
    price_data: {
      currency: "usd",
      unit_amount: item.priceCents,
      product_data: {
        name: `${item.songTitle} — ${item.licenseType === "commercial" ? "Commercial" : "Personal"} License`,
        description: `Artist: ${item.artistName}`,
        metadata: {
          songId: String(item.songId),
          licenseType: item.licenseType,
        },
      },
    },
    quantity: 1,
  }));

  const totalCents = opts.items.reduce((sum, i) => sum + i.priceCents, 0);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: opts.buyerEmail,
    line_items: lineItems,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: {
      userId: String(opts.userId),
      buyerName: opts.buyerName ?? "",
      totalCents: String(totalCents),
    },
  });

  return session as { id: string; url: string; payment_intent: string | null };
}

// ---------------------------------------------------------------------------
// Construct and verify a Stripe webhook event.
// Requires the raw request body — use express.raw() on the webhook route.
// ---------------------------------------------------------------------------

export function constructWebhookEvent(rawBody: Buffer, signature: string) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

// ---------------------------------------------------------------------------
// Retrieve a completed Checkout Session (to confirm payment details).
// ---------------------------------------------------------------------------

export async function retrieveSession(sessionId: string) {
  const stripe = getStripe();
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items", "payment_intent"],
  });
}

// ---------------------------------------------------------------------------
// Retrieve a PaymentIntent by ID.
// ---------------------------------------------------------------------------

export async function retrievePaymentIntent(intentId: string) {
  const stripe = getStripe();
  return stripe.paymentIntents.retrieve(intentId);
}
