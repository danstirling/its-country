import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireApproved, requireAdmin, requireContentAdmin } from "./auth";
import { insertArtistSchema, insertSongSchema } from "@shared/schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { sendAccountApprovedEmail, sendAccountRejectedEmail, sendPasswordResetEmail } from "./email";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { objectStorageClient, ObjectStorageService } from "./replit_integrations/object_storage";
import { storeRouter } from "./store-routes";

const objectStorageService = new ObjectStorageService();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { message: "Too many login attempts. Please try again in 15 minutes." } });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { message: "Too many registration attempts. Please try again later." } });
const forgotPasswordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { message: "Too many requests. Please try again in 15 minutes." } });

const scryptAsync = promisify(scrypt);
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hashed, "hex"), buf);
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (const line of lines) {
    const cols: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur); cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur);
    rows.push(cols);
  }
  return rows;
}

function getSiteUrl(req: any): string {
  if (process.env.REPLIT_DOMAINS) {
    const domain = process.env.REPLIT_DOMAINS.split(",")[0].trim();
    return `https://${domain}`;
  }
  const proto = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("x-forwarded-host") || req.get("host");
  return `${proto}://${host}`;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) cb(null, true);
    else cb(new Error("Only audio files are allowed"));
  },
});

function getStorageBucket() {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
  return objectStorageClient.bucket(bucketId);
}

const mimeToExt: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/ogg": ".ogg",
};

function getExtFromMime(mimetype: string): string | null {
  return mimeToExt[mimetype] || null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use("/api/auth/login", loginLimiter);
  app.use("/api/auth/register", registerLimiter);
  app.use("/api/auth/forgot-password", forgotPasswordLimiter);

  setupAuth(app);

  app.use("/audio", (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || req.user?.status !== "approved") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email is required" });
    }
    const user = await storage.getUserByEmail(email.trim());
    if (!user) {
      return res.json({ message: "If that email is registered, you'll receive a reset link shortly." });
    }
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await storage.setResetToken(user.id, token, expires);
    const resetUrl = `${getSiteUrl(req)}/reset-password/${token}`;
    try {
      await sendPasswordResetEmail({ toEmail: user.email, username: user.username, resetUrl });
    } catch (err: any) {
    }
    res.json({ message: "If that email is registered, you'll receive a reset link shortly." });
  });

  app.get("/api/auth/validate-reset-token/:token", async (req, res) => {
    const { token } = req.params;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ valid: false });
    }
    const user = await storage.getUserByResetToken(token);
    if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      return res.status(400).json({ valid: false });
    }
    return res.json({ valid: true });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password || typeof token !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Token and password are required" });
    }
    const pwValid = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
    if (!pwValid) {
      return res.status(400).json({ message: "Password does not meet the required complexity rules." });
    }
    const user = await storage.getUserByResetToken(token);
    if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      return res.status(400).json({ message: "This reset link is invalid or has expired." });
    }
    const hashed = await hashPassword(password);
    await storage.updateUserPassword(user.id, hashed);
    await storage.clearResetToken(user.id);
    res.json({ message: "Password updated successfully." });
  });

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new password are required" });
    }
    const pwValid = newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword);
    if (!pwValid) {
      return res.status(400).json({ message: "New password must be at least 8 characters with uppercase, lowercase, number, and special character." });
    }
    const fullUser = await storage.getUser((req.user as any).id);
    if (!fullUser) return res.status(404).json({ message: "User not found" });
    const isMatch = await comparePasswords(currentPassword, fullUser.password);
    if (!isMatch) return res.status(401).json({ message: "Current password is incorrect" });
    const hashed = await hashPassword(newPassword);
    await storage.updateUserPassword(fullUser.id, hashed);
    res.json({ message: "Password updated successfully" });
  });

  app.post("/api/upload/image", requireContentAdmin, upload.single("image"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const ext = getExtFromMime(req.file.mimetype);
    if (!ext) return res.status(400).json({ message: `Unsupported image type: ${req.file.mimetype}` });
    try {
      const bucket = getStorageBucket();
      const filename = `images/song-upload-${Date.now()}${ext}`;
      const file = bucket.file(filename);
      await file.save(req.file.buffer, { contentType: req.file.mimetype });
      const [exists] = await file.exists();
      if (!exists) throw new Error("File save succeeded but verification failed");
      res.json({ url: `/storage/${filename}` });
    } catch (err) {
      console.error("Image upload to storage failed:", err);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  app.post("/api/upload/audio", requireContentAdmin, uploadAudio.single("audio"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const ext = getExtFromMime(req.file.mimetype);
    if (!ext) return res.status(400).json({ message: `Unsupported audio type: ${req.file.mimetype}` });
    try {
      const bucket = getStorageBucket();
      const filename = `audio/song-audio-${Date.now()}${ext}`;
      const file = bucket.file(filename);
      await file.save(req.file.buffer, { contentType: req.file.mimetype });
      const [exists] = await file.exists();
      if (!exists) throw new Error("File save succeeded but verification failed");
      res.json({ url: `/storage/${filename}` });
    } catch (err) {
      console.error("Audio upload to storage failed:", err);
      res.status(500).json({ message: "Failed to upload audio" });
    }
  });

  app.post("/api/upload/audio-presign", requireContentAdmin, async (req, res) => {
    const { mimeType } = req.body;
    if (!mimeType || typeof mimeType !== "string") {
      return res.status(400).json({ message: "mimeType is required" });
    }
    const ext = getExtFromMime(mimeType);
    if (!ext) return res.status(400).json({ message: `Unsupported audio type: ${mimeType}` });
    try {
      const { uploadUrl, finalPath } = await objectStorageService.signAudioUploadURL(mimeType, ext);
      res.json({ uploadUrl, finalPath });
    } catch (err) {
      console.error("Audio presign failed:", err);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });

  app.get("/storage/images/:filename", async (req, res) => {
    try {
      const bucket = getStorageBucket();
      const requested = `images/${req.params.filename}`;

      // Try the requested path first, then fall back to alternate image extensions
      // in case a filename/mimetype mismatch occurred during upload.
      const base = requested.replace(/\.[^.]+$/, "");
      const candidates = [requested, ...Object.values(mimeToExt)
        .filter(ext => !requested.endsWith(ext))
        .filter(ext => [".jpg",".jpeg",".png",".webp",".gif"].includes(ext))
        .map(ext => `${base}${ext}`)
        .filter((v, i, a) => a.indexOf(v) === i)
      ];

      let resolvedFile = null;
      for (const candidate of candidates) {
        const f = bucket.file(candidate);
        const [ex] = await f.exists();
        if (ex) { resolvedFile = f; break; }
      }

      if (!resolvedFile) {
        console.error(`Storage image not found: ${requested} (tried ${candidates.length} extensions)`);
        return res.status(404).json({ message: "File not found" });
      }

      const [metadata] = await resolvedFile.getMetadata();
      res.set({ "Content-Type": metadata.contentType || "application/octet-stream", "Cache-Control": "public, max-age=86400" });
      const stream = resolvedFile.createReadStream();
      stream.on("error", (err) => {
        console.error(`Stream error for ${requested}:`, err);
        if (!res.headersSent) res.status(500).json({ message: "Failed to serve image" });
      });
      stream.pipe(res);
    } catch (err) {
      console.error("Storage image serve error:", err);
      if (!res.headersSent) res.status(500).json({ message: "Failed to serve image" });
    }
  });

  app.get("/storage/audio/:filename", (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || req.user?.status !== "approved") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  }, async (req, res) => {
    try {
      const bucket = getStorageBucket();
      const objectPath = `audio/${req.params.filename}`;
      const file = bucket.file(objectPath);
      const [exists] = await file.exists();
      if (!exists) {
        console.error(`Storage audio not found: ${objectPath}`);
        return res.status(404).json({ message: "File not found" });
      }
      const [metadata] = await file.getMetadata();
      res.set({ "Content-Type": metadata.contentType || "audio/mpeg", "Cache-Control": "private, max-age=3600" });
      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error(`Stream error for ${objectPath}:`, err);
        if (!res.headersSent) res.status(500).json({ message: "Failed to serve audio" });
      });
      stream.pipe(res);
    } catch (err) {
      console.error("Storage audio serve error:", err);
      if (!res.headersSent) res.status(500).json({ message: "Failed to serve audio" });
    }
  });

  app.get("/api/admin/users", requireContentAdmin, async (req, res) => {
    const allUsers = await storage.getAllUsers();
    const isSuperAdmin = (req.user as any)?.role === "superadmin";
    // Regular admins must not see superadmin accounts
    const filtered = isSuperAdmin ? allUsers : allUsers.filter((u) => u.role !== "superadmin");
    const safe = filtered.map(({ password: _, ...u }) => u);
    res.json(safe);
  });

  app.patch("/api/admin/users/:id/status", requireContentAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const updated = await storage.updateUserStatus(id, status);
    if (!updated) return res.status(404).json({ message: "User not found" });
    if (status === "approved") {
      const loginUrl = `${getSiteUrl(req)}/login`;
      sendAccountApprovedEmail({
        toEmail: updated.email,
        username: updated.username,
        userType: updated.userType ?? updated.role,
        loginUrl,
      }).catch(err => console.error("Approval email failed:", err));
    } else if (status === "rejected") {
      sendAccountRejectedEmail({
        toEmail: updated.email,
        username: updated.username,
      }).catch(err => console.error("Rejection email failed:", err));
    }
    const { password: _, ...safe } = updated;
    res.json(safe);
  });

  app.patch("/api/admin/users/:id/approve", requireContentAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { role } = req.body;
    const allowedRoles = ["member", "industry", "radio", "artist", "admin", "subadmin", "listener"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const updated = await storage.approveUserWithRole(id, role);
    if (!updated) return res.status(404).json({ message: "User not found" });
    const loginUrl = `${getSiteUrl(req)}/login`;
    sendAccountApprovedEmail({
      toEmail: updated.email,
      username: updated.username,
      userType: updated.userType ?? updated.role,
      loginUrl,
    }).catch(err => console.error("Approval email failed:", err));
    const { password: _, ...safe } = updated;
    res.json(safe);
  });

  app.delete("/api/admin/users/:id", requireContentAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const requestingUser = req.user as any;
    const target = await storage.getUser(id);
    if (!target) return res.status(404).json({ message: "User not found" });
    // Cannot delete yourself
    if (target.id === requestingUser.id) return res.status(400).json({ message: "You cannot delete your own account" });
    // Cannot delete superadmin accounts
    if (target.role === "superadmin") return res.status(403).json({ message: "Cannot delete a superadmin account" });
    // Regular admins cannot delete other admins
    if (requestingUser.role !== "superadmin" && target.role === "admin") {
      return res.status(403).json({ message: "Admins cannot delete other admin accounts" });
    }
    await storage.deleteUser(id);
    res.json({ message: "User deleted" });
  });

  app.patch("/api/admin/users/:id/notes", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { notes } = req.body;
    const updated = await storage.updateUserNotes(id, notes ?? "");
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safe } = updated;
    res.json(safe);
  });

  app.patch("/api/admin/users/:id/username", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { username } = req.body;
    if (!username || typeof username !== "string" || username.trim().length < 2) {
      return res.status(400).json({ message: "Username must be at least 2 characters" });
    }
    const existing = await storage.getUserByUsername(username.trim());
    if (existing && existing.id !== id) {
      return res.status(409).json({ message: "That username is already taken" });
    }
    const updated = await storage.updateUsername(id, username.trim());
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safe } = updated;
    res.json(safe);
  });

  app.patch("/api/admin/users/:id/password", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { password } = req.body;
    if (!password || typeof password !== "string") {
      return res.status(400).json({ message: "Password is required" });
    }
    const pwValid = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
    if (!pwValid) {
      return res.status(400).json({ message: "Password must be at least 8 characters with uppercase, lowercase, number, and special character." });
    }
    const hashed = await hashPassword(password);
    const updated = await storage.updateUserPassword(id, hashed);
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safe } = updated;
    res.json(safe);
  });

  app.post("/api/admin/users/:id/apply-code", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Code is required" });
    const upgradeCode = await storage.getUpgradeCode(code.trim().toUpperCase());
    if (!upgradeCode) return res.status(404).json({ message: "Code not found" });
    if (upgradeCode.usedBy !== null) return res.status(400).json({ message: "Code has already been redeemed" });
    const redeemed = await storage.redeemUpgradeCode(code.trim().toUpperCase(), id);
    if (!redeemed) return res.status(400).json({ message: "Could not apply code" });
    await storage.updateUserRole(id, redeemed.role);
    const updated = await storage.getUser(id);
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safe } = updated;
    res.json(safe);
  });

  app.patch("/api/admin/users/:id/role", requireContentAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { role } = req.body;
    if (!["member", "industry", "radio", "artist", "admin", "superadmin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    if (role === "superadmin" && (req.user as any)?.role !== "superadmin") {
      return res.status(403).json({ message: "Only a superadmin can assign the superadmin role" });
    }
    const updated = await storage.updateUserRole(id, role);
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safe } = updated;
    res.json(safe);
  });

  app.get("/api/admin/upgrade-codes", requireAdmin, async (_req, res) => {
    const codes = await storage.getAllUpgradeCodes();
    res.json(codes);
  });

  app.post("/api/admin/upgrade-codes", requireAdmin, async (req, res) => {
    const { role, createdFor } = req.body;
    if (!["radio", "artist"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const code = await storage.createUpgradeCode(role, createdFor ?? undefined);
    res.status(201).json(code);
  });

  app.delete("/api/admin/upgrade-codes/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteUpgradeCode(id);
    if (!deleted) return res.status(404).json({ message: "Code not found" });
    res.json({ message: "Deleted" });
  });

  app.post("/api/auth/redeem-code", requireApproved, async (req, res) => {
    const { code } = req.body;
    const normalizedCode = typeof code === "string" ? code.trim().toUpperCase() : "";
    const user = req.user!;
    const upgradeCode = await storage.getUpgradeCode(normalizedCode);
    if (!upgradeCode) return res.status(404).json({ message: "Invalid code" });
    if (upgradeCode.usedBy !== null) return res.status(400).json({ message: "Code already used" });
    const redeemed = await storage.redeemUpgradeCode(normalizedCode, user.id);
    if (!redeemed) return res.status(400).json({ message: "Could not redeem code" });
    await storage.updateUserRole(user.id, redeemed.role);
    const updated = await storage.getUser(user.id);
    if (updated) {
      const { password: _, ...safe } = updated;
      return res.json(safe);
    }
    res.json({ message: "Code redeemed" });
  });

  app.get("/api/artists", requireApproved, async (_req, res) => {
    const allArtists = await storage.getAllArtists();
    res.json(allArtists);
  });

  app.get("/api/artists/:slug", requireApproved, async (req, res) => {
    const artist = await storage.getArtistBySlug(req.params.slug);
    if (!artist) return res.status(404).json({ message: "Artist not found" });
    res.json(artist);
  });

  app.post("/api/artists", requireContentAdmin, async (req, res) => {
    const parsed = insertArtistSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data" });
    const artist = await storage.createArtist(parsed.data);
    res.status(201).json(artist);
  });

  app.patch("/api/artists/:id", requireContentAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const parsed = insertArtistSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data" });
    const updated = await storage.updateArtist(id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Artist not found" });
    res.json(updated);
  });

  app.delete("/api/artists/:id", requireContentAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteArtist(id);
    if (!deleted) return res.status(404).json({ message: "Artist not found" });
    res.json({ message: "Deleted" });
  });

  app.get("/api/artists/:artistId/songs", requireApproved, async (req, res) => {
    const artistId = parseInt(req.params.artistId);
    const artistSongs = await storage.getSongsByArtist(artistId);
    res.json(artistSongs);
  });

  app.get("/api/artists/slug/:slug/with-songs", requireApproved, async (req, res) => {
    const artist = await storage.getArtistBySlug(req.params.slug);
    if (!artist) return res.status(404).json({ message: "Artist not found" });
    const songs = await storage.getSongsByArtist(artist.id);
    res.json({ artist, songs });
  });

  app.get("/api/songs", requireApproved, async (_req, res) => {
    const all = await storage.getAllSongsWithArtists();
    res.json(all);
  });

  app.post("/api/songs", requireContentAdmin, async (req, res) => {
    const parsed = insertSongSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data" });
    const song = await storage.createSong(parsed.data);
    res.status(201).json(song);
  });

  app.patch("/api/songs/:id", requireContentAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const parsed = insertSongSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data" });
    const updated = await storage.updateSong(id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Song not found" });
    res.json(updated);
  });

  app.delete("/api/songs/:id", requireContentAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteSong(id);
    if (!deleted) return res.status(404).json({ message: "Song not found" });
    res.json({ message: "Deleted" });
  });

  app.post("/api/songs/:id/view", requireApproved, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.incrementViewCount(id);
    res.json({ ok: true });
  });

  app.post("/api/songs/:id/download", requireApproved, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.incrementDownloadCount(id);
    res.json({ ok: true });
  });

  app.post("/api/songs/import", requireContentAdmin, upload.single("csv"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No CSV file uploaded" });
    try {
      const text = req.file.buffer.toString("utf-8");
      const rows = parseCSV(text);
      if (rows.length < 2) return res.status(400).json({ message: "CSV must have a header row and at least one data row" });

      const results: { row: number; title: string; status: "created" | "error"; message?: string }[] = [];

      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i];
        if (cols.every(c => !c.trim())) continue;

        const [
          songName, audioUrl, mp4Url, lyrics, genre, status,
          thumbnailUrl, artistName, releaseDate, ascapLyricWriter,
          ascapProductionName, songNotes, viewCountRaw, downloadCountRaw
        ] = cols.map(c => c.trim());

        if (!songName) { results.push({ row: i + 1, title: "(empty)", status: "error", message: "Song Name is required" }); continue; }
        if (!artistName) { results.push({ row: i + 1, title: songName, status: "error", message: "Artist Name is required" }); continue; }

        const artist = await storage.getArtistByName(artistName);
        if (!artist) { results.push({ row: i + 1, title: songName, status: "error", message: `Artist "${artistName}" not found — add them first` }); continue; }

        try {
          await storage.createSong({
            title: songName,
            audioUrl: audioUrl || null,
            mp4Url: mp4Url || null,
            lyrics: lyrics || null,
            genre: genre || null,
            status: (status?.toLowerCase() === "demo" ? "demo" : "active"),
            thumbnailUrl: thumbnailUrl || "",
            artistId: artist.id,
            releaseDate: releaseDate || null,
            ascapLyricWriter: ascapLyricWriter || null,
            ascapProductionName: ascapProductionName || null,
            songNotes: songNotes || null,
            viewCount: parseInt(viewCountRaw) || 0,
            downloadCount: parseInt(downloadCountRaw) || 0,
            description: null,
          });
          results.push({ row: i + 1, title: songName, status: "created" });
        } catch (e: any) {
          results.push({ row: i + 1, title: songName, status: "error", message: e.message });
        }
      }
      res.json({ imported: results.filter(r => r.status === "created").length, errors: results.filter(r => r.status === "error").length, results });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to process CSV: " + e.message });
    }
  });

  app.get("/api/admin/review/:token", async (req, res) => {
    const user = await storage.getUserByReviewToken(req.params.token);
    if (!user) return res.status(404).json({ message: "This link is invalid or has already been used." });
    const { password: _, reviewToken: __, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post("/api/admin/review/:token/approve", async (req, res) => {
    const user = await storage.getUserByReviewToken(req.params.token);
    if (!user) return res.status(404).json({ message: "This link is invalid or has already been used." });
    await storage.updateUserStatus(user.id, "approved");
    await storage.clearReviewToken(user.id);
    const loginUrl = `${getSiteUrl(req)}/login`;
    sendAccountApprovedEmail({
      toEmail: user.email,
      username: user.username,
      userType: user.userType ?? user.role,
      loginUrl,
    }).catch(err => console.error("Approval email failed:", err));
    res.json({ message: "approved" });
  });

  app.post("/api/admin/review/:token/reject", async (req, res) => {
    const user = await storage.getUserByReviewToken(req.params.token);
    if (!user) return res.status(404).json({ message: "This link is invalid or has already been used." });
    await storage.updateUserStatus(user.id, "rejected");
    await storage.clearReviewToken(user.id);
    sendAccountRejectedEmail({
      toEmail: user.email,
      username: user.username,
    }).catch(err => console.error("Rejection email failed:", err));
    res.json({ message: "rejected" });
  });

  // ── Store routes (admin management always active; buyer routes need STORE_ENABLED=true) ──
  app.use(storeRouter);

  return httpServer;
}
