import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { Express } from "express";
import type { User } from "@shared/schema";
import connectPgSimple from "connect-pg-simple";
import { sendNewAccountRequestEmail, sendRequestReceivedEmail } from "./email";

const scryptAsync = promisify(scrypt);

export function getRoleFromCode(code: string | number): { role: string; label: string } | null {
  const n = typeof code === "string" ? parseInt(code, 10) : code;
  if (isNaN(n)) return null;
  if (n >= 0 && n <= 99) return { role: "admin", label: "Administrator" };
  if (n >= 100 && n <= 199) return { role: "subadmin", label: "Sub-Admin" };
  if (n >= 200 && n <= 499) return { role: "artist", label: "Artist" };
  if (n >= 500 && n <= 799) return { role: "radio", label: "Radio & Advertising" };
  if (n >= 1000 && n <= 1399) return { role: "listener", label: "Listener" };
  return null;
}

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

declare global {
  namespace Express {
    interface User extends import("@shared/schema").User {}
  }
}

export function setupAuth(app: Express) {
  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) return done(null, false, { message: "Invalid credentials" });
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) return done(null, false, { message: "Invalid credentials" });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || undefined);
    } catch (err) {
      done(null, undefined);
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { firstName, lastName, email, password, accessCode, marketingConsent } = req.body;
      if (!firstName || !lastName || !email || !password || !accessCode) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const codeResult = getRoleFromCode(accessCode);
      if (!codeResult) {
        return res.status(400).json({ message: "Invalid access code. Please check your code and try again." });
      }
      const { role, label: userType } = codeResult;

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail && existingEmail.status !== "rejected") {
        return res.status(400).json({ message: "An account with that email already exists" });
      }

      let user: Awaited<ReturnType<typeof storage.createUser>>;
      let username: string;

      if (existingEmail && existingEmail.status === "rejected") {
        const hashedPassword = await hashPassword(password);
        username = existingEmail.username;
        await storage.updateUserPassword(existingEmail.id, hashedPassword);
        await storage.updateUserTypeAndConsent(existingEmail.id, userType, !!marketingConsent);
        await storage.updateUserRole(existingEmail.id, role);
        user = (await storage.updateUserStatus(existingEmail.id, "pending"))!;
      } else {
        const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
        username = baseUsername;
        let attempt = 0;
        while (await storage.getUserByUsername(username)) {
          attempt++;
          username = `${baseUsername}${attempt}`;
        }
        const hashedPassword = await hashPassword(password);
        user = await storage.createUser({ username, firstName, lastName, email, password: hashedPassword, userType, marketingConsent: !!marketingConsent, role });
      }

      const { password: _, ...safeUser } = user;

      const reviewToken = randomBytes(32).toString("hex");
      await storage.setReviewToken(user.id, reviewToken);
      const replitDomain = process.env.REPLIT_DOMAINS ? process.env.REPLIT_DOMAINS.split(",")[0].trim() : null;
      const siteUrl = replitDomain ? `https://${replitDomain}` : `${req.get("x-forwarded-proto") || req.protocol}://${req.get("x-forwarded-host") || req.get("host")}`;
      const reviewUrl = `${siteUrl}/admin/review/${reviewToken}`;

      sendNewAccountRequestEmail({
        toEmail: process.env.ADMIN_NOTIFICATION_EMAIL ?? "Info@Its-Country.com",
        username,
        email,
        userType,
        reviewUrl,
      }).catch(err => console.error("Email notification failed:", err));

      sendRequestReceivedEmail({
        toEmail: email,
        username,
        userType,
      }).catch(err => console.error("Confirmation email failed:", err));

      return res.status(201).json(safeUser);
    } catch (err: any) {
      if (err.code === "23505") {
        return res.status(400).json({ message: "Username or email already exists" });
      }
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      req.login(user, async (err) => {
        if (err) return next(err);

        const rawIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
        const ip = rawIp.replace(/^::ffff:/, "");

        let region = "Unknown";
        if (ip && ip !== "unknown" && ip !== "127.0.0.1" && ip !== "::1") {
          try {
            const geo = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country`);
            if (geo.ok) {
              const data = await geo.json() as any;
              if (data.status === "success") {
                const parts = [data.city, data.regionName, data.country].filter(Boolean);
                region = parts.join(", ") || "Unknown";
              }
            }
          } catch {
            // geo lookup failure is non-fatal
          }
        } else {
          region = "Local / Dev";
        }

        storage.updateUserLoginInfo(user.id, ip, region).catch(() => {});

        const { password: _, ...safeUser } = user;
        return res.json(safeUser);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const { password: _, ...safeUser } = req.user!;
    res.json(safeUser);
  });
}

export function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Authentication required" });
  next();
}

export function requireApproved(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Authentication required" });
  if (req.user.status !== "approved") return res.status(403).json({ message: "Account pending approval" });
  next();
}

export function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Authentication required" });
  if (req.user.role !== "superadmin") return res.status(403).json({ message: "Superadmin access required" });
  next();
}

export function requireContentAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Authentication required" });
  if (req.user.role !== "admin" && req.user.role !== "superadmin" && req.user.role !== "subadmin") return res.status(403).json({ message: "Admin access required" });
  next();
}
