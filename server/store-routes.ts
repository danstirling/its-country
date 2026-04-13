/**
 * Music store routes — NOT active.
 *
 * This router is fully implemented but intentionally NOT mounted.
 *
 * To activate:
 *   1. Add STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET to environment secrets.
 *   2. Set STORE_ENABLED=true in environment.
 *   3. In server/routes.ts, add at the top:
 *        import { storeRouter } from "./store-routes";
 *      Then inside registerRoutes(), before createServer():
 *        app.use(storeRouter);
 *
 * Route overview
 * ─────────────────────────────────────────────────────────────────────────────
 * Public (no auth required):
 *   GET  /api/store/listings          — all available songs with prices
 *   GET  /api/store/listings/:songId  — single listing
 *
 * Authenticated buyers (requireApproved):
 *   POST /api/store/checkout          — create Stripe session, returns { url }
 *   GET  /api/store/purchases         — current user's purchase history
 *   GET  /api/store/purchases/:id     — single purchase + items
 *   POST /api/store/webhook           — Stripe webhook (raw body, no session)
 *
 * Admin only (requireContentAdmin):
 *   GET    /api/admin/store/purchases    — all purchases across all users
 *   GET    /api/admin/store/listings     — all listings (incl. unavailable)
 *   POST   /api/admin/store/listings     — create / update a listing
 *   PATCH  /api/admin/store/listings/:id — toggle availability or change price
 *   DELETE /api/admin/store/listings/:id — remove a listing
 */

import { Router } from "express";
import { requireApproved, requireContentAdmin } from "./auth";
import {
  getAllListings,
  getAvailableListings,
  getListingBySongId,
  getListingById,
  upsertListing,
  deleteListing,
  createPurchase,
  getPurchaseById,
  getPurchasesByUser,
  getAllPurchases,
  updatePurchaseBySessionId,
  createPurchaseItems,
  getItemsByPurchaseId,
} from "./store-storage";
import {
  createCheckoutSession,
  constructWebhookEvent,
  type CartItem,
} from "./stripe";

export const storeRouter = Router();

// ── Guard: store must be explicitly enabled ──────────────────────────────────

function storeEnabled(_req: any, res: any, next: any) {
  if (process.env.STORE_ENABLED !== "true") {
    return res.status(503).json({ message: "Store is not currently available." });
  }
  next();
}

// Buyer-facing routes require the store to be explicitly enabled.
// Admin management routes are always accessible to admins.
storeRouter.use("/api/store", storeEnabled);

// ── Public: browse available listings ────────────────────────────────────────

storeRouter.get("/api/store/listings", async (_req, res) => {
  try {
    const listings = await getAvailableListings();
    res.json(listings);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

storeRouter.get("/api/store/listings/:songId", async (req, res) => {
  try {
    const songId = parseInt(req.params.songId);
    if (isNaN(songId)) return res.status(400).json({ message: "Invalid song ID" });
    const listing = await getListingBySongId(songId);
    if (!listing || !listing.isAvailable) {
      return res.status(404).json({ message: "Listing not found" });
    }
    res.json(listing);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── Buyer: create Stripe checkout session ────────────────────────────────────

storeRouter.post("/api/store/checkout", requireApproved, async (req: any, res) => {
  try {
    const { items, successPath, cancelPath } = req.body as {
      items: { songId: number; licenseType: "personal" | "commercial" }[];
      successPath?: string;
      cancelPath?: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Validate each item against the current listing prices
    const cartItems: CartItem[] = [];
    for (const item of items) {
      const listing = await getListingBySongId(item.songId);
      if (!listing || !listing.isAvailable) {
        return res.status(400).json({ message: `Song ${item.songId} is not available for purchase` });
      }
      const priceCents =
        item.licenseType === "commercial"
          ? listing.priceCommercialCents
          : listing.pricePersonalCents;
      if (!priceCents) {
        return res.status(400).json({
          message: `${item.licenseType} license is not available for song ${item.songId}`,
        });
      }
      cartItems.push({
        songId: item.songId,
        songTitle: `Song #${item.songId}`,  // store-routes fetches from DB at activation time
        artistName: "It's Country",
        licenseType: item.licenseType,
        priceCents,
      });
    }

    const totalCents = cartItems.reduce((s, i) => s + i.priceCents, 0);
    const user = req.user;

    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.get("host");
    const base = `${proto}://${host}`;
    const successUrl = `${base}${successPath ?? "/store/success"}?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${base}${cancelPath ?? "/store"}`;

    const session = await createCheckoutSession({
      userId: user.id,
      buyerEmail: user.email,
      buyerName: user.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : user.username,
      items: cartItems,
      successUrl,
      cancelUrl,
    });

    // Persist pending purchase so we can reconcile via webhook
    const purchase = await createPurchase({
      userId: user.id,
      stripeSessionId: session.id,
      totalCents,
      currency: "usd",
      status: "pending",
      buyerEmail: user.email,
      buyerName: user.firstName ?? user.username,
    });

    await createPurchaseItems(purchase.id, cartItems);

    res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error("[store] checkout error:", err.message);
    res.status(500).json({ message: "Checkout failed. Please try again." });
  }
});

// ── Stripe webhook — must receive raw body ────────────────────────────────────
// When mounting, add before express.json():
//   app.use("/api/store/webhook", express.raw({ type: "application/json" }));

storeRouter.post("/api/store/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  if (!sig) return res.status(400).json({ message: "Missing stripe-signature header" });

  let event: any;
  try {
    event = constructWebhookEvent(req.body as Buffer, sig);
  } catch (err: any) {
    console.error("[store] webhook signature verification failed:", err.message);
    return res.status(400).json({ message: "Webhook signature invalid" });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        await updatePurchaseBySessionId(session.id, "completed", {
          stripePaymentIntentId: session.payment_intent,
          completedAt: new Date(),
        });
        console.log(`[store] purchase completed — session ${session.id}`);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object;
        await updatePurchaseBySessionId(session.id, "failed");
        break;
      }
      case "charge.refunded": {
        // Map via payment_intent if needed
        console.log("[store] charge.refunded — handle via admin refund flow");
        break;
      }
      default:
        // Unhandled events are silently ignored
        break;
    }
    res.json({ received: true });
  } catch (err: any) {
    console.error("[store] webhook handler error:", err.message);
    res.status(500).json({ message: "Webhook handler failed" });
  }
});

// ── Buyer: purchase history ───────────────────────────────────────────────────

storeRouter.get("/api/store/purchases", requireApproved, async (req: any, res) => {
  try {
    const history = await getPurchasesByUser(req.user.id);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

storeRouter.get("/api/store/purchases/:id", requireApproved, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const purchase = await getPurchaseById(id);
    if (!purchase) return res.status(404).json({ message: "Purchase not found" });
    if (purchase.userId !== req.user.id && !["admin", "superadmin", "subadmin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const items = await getItemsByPurchaseId(id);
    res.json({ ...purchase, items });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── Admin: all purchases ──────────────────────────────────────────────────────

storeRouter.get("/api/admin/store/purchases", requireContentAdmin, async (_req, res) => {
  try {
    const all = await getAllPurchases();
    res.json(all);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── Admin: manage listings ────────────────────────────────────────────────────

storeRouter.get("/api/admin/store/listings", requireContentAdmin, async (_req, res) => {
  try {
    const listings = await getAllListings();
    res.json(listings);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

storeRouter.post("/api/admin/store/listings", requireContentAdmin, async (req, res) => {
  try {
    const { songId, pricePersonalCents, priceCommercialCents, isAvailable, notes } = req.body;
    if (!songId) return res.status(400).json({ message: "songId is required" });
    const listing = await upsertListing(Number(songId), {
      pricePersonalCents: pricePersonalCents ?? null,
      priceCommercialCents: priceCommercialCents ?? null,
      isAvailable: isAvailable ?? false,
      notes: notes ?? null,
    });
    res.status(201).json(listing);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

storeRouter.patch("/api/admin/store/listings/:id", requireContentAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await getListingById(id);
    if (!existing) return res.status(404).json({ message: "Listing not found" });
    const { pricePersonalCents, priceCommercialCents, isAvailable, notes } = req.body;
    const listing = await upsertListing(existing.songId, {
      pricePersonalCents: pricePersonalCents ?? existing.pricePersonalCents,
      priceCommercialCents: priceCommercialCents ?? existing.priceCommercialCents,
      isAvailable: isAvailable ?? existing.isAvailable,
      notes: notes ?? existing.notes,
    });
    res.json(listing);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

storeRouter.delete("/api/admin/store/listings/:id", requireContentAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await deleteListing(id);
    res.json({ message: "Listing removed" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});
