import { randomBytes } from "crypto";
import {
  type User, type InsertUser,
  type Artist, type InsertArtist,
  type Song, type InsertSong,
  type UpgradeCode,
  users, artists, songs, upgradeCodes
} from "@shared/schema";
import { db } from "./db";
import { eq, isNull, sql, ilike } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getPendingUsers(): Promise<User[]>;
  updateUserStatus(id: number, status: string): Promise<User | undefined>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;
  approveUserWithRole(id: number, role: string): Promise<User | undefined>;
  updateUserNotes(id: number, notes: string): Promise<User | undefined>;
  updateUserPassword(id: number, hashedPassword: string): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;
  updateUsername(id: number, username: string): Promise<User | undefined>;
  getUserByReviewToken(token: string): Promise<User | undefined>;
  setReviewToken(id: number, token: string): Promise<void>;
  clearReviewToken(id: number): Promise<void>;
  updateUserTypeAndConsent(id: number, userType: string, marketingConsent: boolean): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  setResetToken(id: number, token: string, expires: Date): Promise<void>;
  clearResetToken(id: number): Promise<void>;
  updateUserLoginInfo(id: number, ip: string, region: string): Promise<void>;
  getAllArtists(): Promise<Artist[]>;
  getArtist(id: number): Promise<Artist | undefined>;
  getArtistBySlug(slug: string): Promise<Artist | undefined>;
  getArtistByName(name: string): Promise<Artist | undefined>;
  createArtist(artist: InsertArtist): Promise<Artist>;
  updateArtist(id: number, artist: Partial<InsertArtist>): Promise<Artist | undefined>;
  deleteArtist(id: number): Promise<boolean>;
  getAllSongsWithArtists(): Promise<Array<Song & { artist: Artist }>>;
  getSongsByArtist(artistId: number): Promise<Song[]>;
  getSong(id: number): Promise<Song | undefined>;
  createSong(song: InsertSong): Promise<Song>;
  updateSong(id: number, song: Partial<InsertSong>): Promise<Song | undefined>;
  deleteSong(id: number): Promise<boolean>;
  incrementViewCount(id: number): Promise<void>;
  incrementDownloadCount(id: number): Promise<void>;
  createUpgradeCode(role: string, createdFor?: number): Promise<UpgradeCode>;
  getUpgradeCode(code: string): Promise<UpgradeCode | undefined>;
  redeemUpgradeCode(code: string, userId: number): Promise<UpgradeCode | undefined>;
  getAllUpgradeCodes(): Promise<UpgradeCode[]>;
  deleteUpgradeCode(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(ilike(users.email, email.trim()));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({ ...insertUser, status: "pending" }).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getPendingUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.status, "pending"));
  }

  async updateUserStatus(id: number, status: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ status }).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ role }).where(eq(users.id, id)).returning();
    return user;
  }

  async approveUserWithRole(id: number, role: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ status: "approved", role }).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserNotes(id: number, notes: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ notes }).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserPassword(id: number, hashedPassword: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async updateUsername(id: number, username: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ username }).where(eq(users.id, id)).returning();
    return user;
  }

  async getUserByReviewToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.reviewToken, token));
    return user;
  }

  async setReviewToken(id: number, token: string): Promise<void> {
    await db.update(users).set({ reviewToken: token }).where(eq(users.id, id));
  }

  async clearReviewToken(id: number): Promise<void> {
    await db.update(users).set({ reviewToken: null }).where(eq(users.id, id));
  }

  async updateUserTypeAndConsent(id: number, userType: string, marketingConsent: boolean): Promise<User | undefined> {
    const [user] = await db.update(users).set({ userType, marketingConsent }).where(eq(users.id, id)).returning();
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
    return user;
  }

  async setResetToken(id: number, token: string, expires: Date): Promise<void> {
    await db.update(users).set({ resetToken: token, resetTokenExpires: expires }).where(eq(users.id, id));
  }

  async clearResetToken(id: number): Promise<void> {
    await db.update(users).set({ resetToken: null, resetTokenExpires: null }).where(eq(users.id, id));
  }

  async updateUserLoginInfo(id: number, ip: string, region: string): Promise<void> {
    await db.update(users).set({ lastLoginAt: new Date(), lastLoginIp: ip, lastLoginRegion: region }).where(eq(users.id, id));
  }

  async getAllArtists(): Promise<Artist[]> {
    return db.select().from(artists);
  }

  async getArtist(id: number): Promise<Artist | undefined> {
    const [artist] = await db.select().from(artists).where(eq(artists.id, id));
    return artist;
  }

  async getArtistBySlug(slug: string): Promise<Artist | undefined> {
    const [artist] = await db.select().from(artists).where(eq(artists.slug, slug));
    return artist;
  }

  async getArtistByName(name: string): Promise<Artist | undefined> {
    const [artist] = await db.select().from(artists).where(ilike(artists.name, name.trim()));
    return artist;
  }

  async createArtist(artist: InsertArtist): Promise<Artist> {
    const [created] = await db.insert(artists).values(artist).returning();
    return created;
  }

  async updateArtist(id: number, artist: Partial<InsertArtist>): Promise<Artist | undefined> {
    const [updated] = await db.update(artists).set(artist).where(eq(artists.id, id)).returning();
    return updated;
  }

  async deleteArtist(id: number): Promise<boolean> {
    await db.delete(songs).where(eq(songs.artistId, id));
    const result = await db.delete(artists).where(eq(artists.id, id)).returning();
    return result.length > 0;
  }

  async getAllSongsWithArtists(): Promise<Array<Song & { artist: Artist }>> {
    const rows = await db
      .select()
      .from(songs)
      .innerJoin(artists, eq(songs.artistId, artists.id))
      .orderBy(sql`CASE WHEN ${artists.slug} = 'dan-stirling' THEN 0 ELSE 1 END`, songs.id);
    return rows.map(({ songs: song, artists: artist }) => ({ ...song, artist }));
  }

  async getSongsByArtist(artistId: number): Promise<Song[]> {
    return db.select().from(songs).where(eq(songs.artistId, artistId));
  }

  async getSong(id: number): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(eq(songs.id, id));
    return song;
  }

  async createSong(song: InsertSong): Promise<Song> {
    const [created] = await db.insert(songs).values(song).returning();
    return created;
  }

  async updateSong(id: number, song: Partial<InsertSong>): Promise<Song | undefined> {
    const [updated] = await db.update(songs).set(song).where(eq(songs.id, id)).returning();
    return updated;
  }

  async deleteSong(id: number): Promise<boolean> {
    const result = await db.delete(songs).where(eq(songs.id, id)).returning();
    return result.length > 0;
  }

  async incrementViewCount(id: number): Promise<void> {
    await db.update(songs).set({ viewCount: sql`${songs.viewCount} + 1` }).where(eq(songs.id, id));
  }

  async incrementDownloadCount(id: number): Promise<void> {
    await db.update(songs).set({ downloadCount: sql`${songs.downloadCount} + 1` }).where(eq(songs.id, id));
  }

  async createUpgradeCode(role: string, createdFor?: number): Promise<UpgradeCode> {
    const code = randomBytes(5).toString('hex').toUpperCase();
    const [created] = await db.insert(upgradeCodes).values({ code, role, createdFor: createdFor ?? null }).returning();
    return created;
  }

  async getUpgradeCode(code: string): Promise<UpgradeCode | undefined> {
    const [found] = await db.select().from(upgradeCodes).where(eq(upgradeCodes.code, code));
    return found;
  }

  async redeemUpgradeCode(code: string, userId: number): Promise<UpgradeCode | undefined> {
    const existing = await this.getUpgradeCode(code);
    if (!existing || existing.usedBy !== null) return undefined;
    const [updated] = await db.update(upgradeCodes)
      .set({ usedBy: userId })
      .where(eq(upgradeCodes.code, code))
      .returning();
    return updated;
  }

  async getAllUpgradeCodes(): Promise<UpgradeCode[]> {
    return db.select().from(upgradeCodes);
  }

  async deleteUpgradeCode(id: number): Promise<boolean> {
    const result = await db.delete(upgradeCodes).where(eq(upgradeCodes.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
