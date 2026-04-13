/**
 * Store storage layer — NOT active.
 *
 * Provides database CRUD for song listings, purchases, and purchase items.
 * All methods use the shared Drizzle DB instance.
 *
 * To activate: import and call from store-routes.ts once the store is enabled.
 */

import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import {
  songListings, purchases, purchaseItems, songs, artists,
  type SongListing, type InsertSongListing,
  type Purchase, type InsertPurchase,
  type PurchaseItem, type InsertPurchaseItem,
} from "@shared/schema";
import type { CartItem } from "./stripe";

// ── Song Listings ────────────────────────────────────────────────────────────

export async function getAllListings(): Promise<SongListing[]> {
  return db.select().from(songListings).orderBy(desc(songListings.updatedAt));
}

export async function getAvailableListings() {
  return db
    .select({
      listing: songListings,
      song: {
        id: songs.id,
        title: songs.title,
        thumbnailUrl: songs.thumbnailUrl,
        genre: songs.genre,
        releaseDate: songs.releaseDate,
      },
      artist: {
        id: artists.id,
        name: artists.name,
        slug: artists.slug,
      },
    })
    .from(songListings)
    .innerJoin(songs, eq(songs.id, songListings.songId))
    .innerJoin(artists, eq(artists.id, songs.artistId))
    .where(eq(songListings.isAvailable, true));
}

export async function getListingBySongId(songId: number): Promise<SongListing | undefined> {
  const [row] = await db.select().from(songListings).where(eq(songListings.songId, songId));
  return row;
}

export async function getListingById(id: number): Promise<SongListing | undefined> {
  const [row] = await db.select().from(songListings).where(eq(songListings.id, id));
  return row;
}

export async function upsertListing(songId: number, data: Partial<InsertSongListing>): Promise<SongListing> {
  const existing = await getListingBySongId(songId);
  if (existing) {
    const [updated] = await db
      .update(songListings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(songListings.songId, songId))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(songListings)
    .values({ songId, ...data })
    .returning();
  return created;
}

export async function deleteListing(id: number): Promise<void> {
  await db.delete(songListings).where(eq(songListings.id, id));
}

// ── Purchases ────────────────────────────────────────────────────────────────

export async function createPurchase(data: InsertPurchase): Promise<Purchase> {
  const [purchase] = await db.insert(purchases).values(data).returning();
  return purchase;
}

export async function getPurchaseById(id: number): Promise<Purchase | undefined> {
  const [row] = await db.select().from(purchases).where(eq(purchases.id, id));
  return row;
}

export async function getPurchaseBySessionId(sessionId: string): Promise<Purchase | undefined> {
  const [row] = await db
    .select()
    .from(purchases)
    .where(eq(purchases.stripeSessionId, sessionId));
  return row;
}

export async function getPurchasesByUser(userId: number): Promise<Purchase[]> {
  return db
    .select()
    .from(purchases)
    .where(eq(purchases.userId, userId))
    .orderBy(desc(purchases.createdAt));
}

export async function getAllPurchases(): Promise<Purchase[]> {
  return db.select().from(purchases).orderBy(desc(purchases.createdAt));
}

export async function updatePurchaseStatus(
  id: number,
  status: "pending" | "completed" | "failed" | "refunded",
  extra?: { stripePaymentIntentId?: string; completedAt?: Date }
): Promise<Purchase | undefined> {
  const [updated] = await db
    .update(purchases)
    .set({ status, ...extra })
    .where(eq(purchases.id, id))
    .returning();
  return updated;
}

export async function updatePurchaseBySessionId(
  sessionId: string,
  status: "pending" | "completed" | "failed" | "refunded",
  extra?: { stripePaymentIntentId?: string; completedAt?: Date }
): Promise<Purchase | undefined> {
  const [updated] = await db
    .update(purchases)
    .set({ status, ...extra })
    .where(eq(purchases.stripeSessionId, sessionId))
    .returning();
  return updated;
}

// ── Purchase Items ────────────────────────────────────────────────────────────

export async function createPurchaseItems(
  purchaseId: number,
  items: CartItem[]
): Promise<PurchaseItem[]> {
  const rows: InsertPurchaseItem[] = items.map((item) => ({
    purchaseId,
    songId: item.songId,
    licenseType: item.licenseType,
    priceCents: item.priceCents,
    songTitle: item.songTitle,
    artistName: item.artistName,
  }));
  return db.insert(purchaseItems).values(rows).returning();
}

export async function getItemsByPurchaseId(purchaseId: number): Promise<PurchaseItem[]> {
  return db
    .select()
    .from(purchaseItems)
    .where(eq(purchaseItems.purchaseId, purchaseId));
}

export async function getPurchaseItemsForUser(userId: number) {
  return db
    .select({
      item: purchaseItems,
      purchase: {
        id: purchases.id,
        status: purchases.status,
        createdAt: purchases.createdAt,
      },
    })
    .from(purchaseItems)
    .innerJoin(purchases, eq(purchases.id, purchaseItems.purchaseId))
    .where(and(eq(purchases.userId, userId), eq(purchases.status, "completed")))
    .orderBy(desc(purchases.createdAt));
}

// ── Access verification ───────────────────────────────────────────────────────

/** Returns true if the user has a completed purchase for the given song. */
export async function userHasPurchased(userId: number, songId: number): Promise<boolean> {
  const result = await db
    .select({ id: purchaseItems.id })
    .from(purchaseItems)
    .innerJoin(purchases, eq(purchases.id, purchaseItems.purchaseId))
    .where(
      and(
        eq(purchases.userId, userId),
        eq(purchases.status, "completed"),
        eq(purchaseItems.songId, songId)
      )
    )
    .limit(1);
  return result.length > 0;
}
