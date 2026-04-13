import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("pending"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  userType: text("user_type"),
  notes: text("notes"),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  reviewToken: text("review_token"),
  resetToken: text("reset_token"),
  resetTokenExpires: timestamp("reset_token_expires"),
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: text("last_login_ip"),
  lastLoginRegion: text("last_login_region"),
});

export const artists = pgTable("artists", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  bio: text("bio").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull().default("lyrics"),
});

export const songs = pgTable("songs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  audioUrl: text("audio_url"),
  mp4Url: text("mp4_url"),
  lyrics: text("lyrics"),
  genre: text("genre"),
  status: text("status").notNull().default("active"),
  thumbnailUrl: text("thumbnail_url").notNull().default(""),
  artistId: integer("artist_id").notNull(),
  releaseDate: text("release_date"),
  ascapLyricWriter: text("ascap_lyric_writer"),
  ascapProductionName: text("ascap_production_name"),
  songNotes: text("song_notes"),
  viewCount: integer("view_count").notNull().default(0),
  downloadCount: integer("download_count").notNull().default(0),
  description: text("description"),
});

// ── Store: per-song listing config ──────────────────────────────────────────
export const songListings = pgTable("song_listings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  songId: integer("song_id").notNull().unique(),
  pricePersonalCents: integer("price_personal_cents"),    // null = not offered
  priceCommercialCents: integer("price_commercial_cents"), // null = not offered
  isAvailable: boolean("is_available").notNull().default(false),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Store: a completed (or pending) order ────────────────────────────────────
export const purchases = pgTable("purchases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  stripeSessionId: text("stripe_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  totalCents: integer("total_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  // status: pending | completed | failed | refunded
  status: text("status").notNull().default("pending"),
  buyerEmail: text("buyer_email").notNull(),
  buyerName: text("buyer_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// ── Store: individual song line-items within a purchase ──────────────────────
export const purchaseItems = pgTable("purchase_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  purchaseId: integer("purchase_id").notNull(),
  songId: integer("song_id").notNull(),
  // licenseType: personal | commercial
  licenseType: text("license_type").notNull(),
  priceCents: integer("price_cents").notNull(), // price captured at time of sale
  songTitle: text("song_title").notNull(),
  artistName: text("artist_name").notNull(),
});

export const upgradeCodes = pgTable("upgrade_codes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: text("code").notNull().unique(),
  role: text("role").notNull(),
  createdFor: integer("created_for"),
  usedBy: integer("used_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  firstName: true,
  lastName: true,
  email: true,
  password: true,
  userType: true,
  marketingConsent: true,
  role: true,
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const insertArtistSchema = createInsertSchema(artists).pick({
  name: true,
  imageUrl: true,
  bio: true,
  slug: true,
  category: true,
});

export const insertSongSchema = createInsertSchema(songs).pick({
  title: true,
  thumbnailUrl: true,
  description: true,
  artistId: true,
  audioUrl: true,
  mp4Url: true,
  lyrics: true,
  genre: true,
  status: true,
  releaseDate: true,
  ascapLyricWriter: true,
  ascapProductionName: true,
  songNotes: true,
  viewCount: true,
  downloadCount: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertArtist = z.infer<typeof insertArtistSchema>;
export type Artist = typeof artists.$inferSelect;
export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songs.$inferSelect;
export type UpgradeCode = typeof upgradeCodes.$inferSelect;

// ── Store types ──────────────────────────────────────────────────────────────
export const insertSongListingSchema = createInsertSchema(songListings).pick({
  songId: true,
  pricePersonalCents: true,
  priceCommercialCents: true,
  isAvailable: true,
  notes: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).pick({
  userId: true,
  stripeSessionId: true,
  stripePaymentIntentId: true,
  totalCents: true,
  currency: true,
  status: true,
  buyerEmail: true,
  buyerName: true,
});

export const insertPurchaseItemSchema = createInsertSchema(purchaseItems).pick({
  purchaseId: true,
  songId: true,
  licenseType: true,
  priceCents: true,
  songTitle: true,
  artistName: true,
});

export type SongListing = typeof songListings.$inferSelect;
export type InsertSongListing = z.infer<typeof insertSongListingSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type InsertPurchaseItem = z.infer<typeof insertPurchaseItemSchema>;
