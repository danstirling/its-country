# It's Country — Project Reference

**Live site:** itscountry.kizmetdemo.com
**Replit project:** its-country-kizmet.replit.app
**Last updated:** March 2026

---

## What This Is

A members-only music licensing platform for It's Country Record Label (West Texas). The public sees a homepage and about page. Approved members get access to the songwriter and song catalog pages. The admin controls all access manually.

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TailwindCSS + shadcn/ui |
| Routing | Wouter (client-side) |
| Backend | Express.js (Node) |
| Database | PostgreSQL (Replit built-in) |
| ORM | Drizzle ORM |
| Sessions | connect-pg-simple (sessions stored in PostgreSQL) |
| Auth | Passport.js with passport-local strategy |
| Email | Resend (via Replit integration) |
| Fonts | Playfair Display (serif), Montserrat (sans-serif) |
| Hosting | Replit Autoscale deployment |

The frontend and backend run on the same Express server. Vite serves the React app in dev; in production the built frontend is served as static files by Express.

---

## Environment Variables & Secrets

| Variable | Where Stored | What It Does |
|---|---|---|
| `DATABASE_URL` | Replit Secrets (auto-set) | PostgreSQL connection string |
| `SESSION_SECRET` | Replit Secrets (manual) | Signs session cookies — keep private |
| Resend API Key | Replit Integration (Resend connector) | Pulled at runtime, not a raw env var |

**How to view/edit secrets:** In Replit, go to the lock icon (Secrets) in the left sidebar.

**Resend integration:** Connected via Replit's Resend connector under the account tied to `thestorycraftcorner@gmail.com`. The from address is `noreply@itscountry.kizmetdemo.com` (domain verified in the Kizmet Impact Resend account). Notification emails currently route to `danstirling23@gmail.com`.

---

## How Authentication Works

1. User registers at `/register` — account is created with status `pending`
2. A notification email is sent to the admin (danstirling23@gmail.com) with an approve/reject link
3. Admin manually approves or rejects at `/admin`
4. Approved users can log in and access members-only pages
5. Sessions are stored in PostgreSQL and survive server restarts

**Password hashing:** scrypt with a random 16-byte salt. Format stored: `hash.salt`

**Roles:**
- `member` — general access to songwriters + song catalog (preview only)
- `industry` — industry professional tier
- `radio` — can download songs for broadcast (requires access code)
- `artist` — can download songs to record (requires access code)
- `admin` — full access + admin dashboard

**Access codes:** Admin generates role upgrade codes tied to a specific user profile. User enters the code in their account page to unlock radio/artist download access.

**Default admin credentials:**
- Username: `admin`
- Password: `admin123`
- Email: `admin@itscountry.com`

---

## How Files Are Stored

**Current setup (as of March 2026):** All files are stored directly in the project as static files.

| File type | Location | Served at |
|---|---|---|
| Artist images | `client/public/images/` | `/images/filename.webp` |
| Song artwork | `client/public/images/` | `/images/filename.webp` |
| Song audio | `client/public/audio/` | `/audio/filename.mp3` |

All images are `.webp` format. Audio is `.mp3`.

**Upload flow:** Admin can upload images and audio through the admin dashboard. Files are saved to the folders above via multer (server-side file handling). Image uploads are capped at 10MB, audio at 100MB.

**Planned change:** Move to object storage (e.g., S3-compatible) in a future phase. When this happens, the file paths will change from local `/images/` and `/audio/` to CDN URLs, and the upload routes will be updated to write to the bucket instead of disk.

---

## APIs Used

| Service | Purpose | Account |
|---|---|---|
| Resend | Transactional email (new account request notifications) | Kizmet Impact Resend account (domain: itscountry.kizmetdemo.com) |

No other external APIs are currently in use. The database, sessions, and file storage are all self-contained within the Replit environment.

---

## Key Pages

| Route | Access | Description |
|---|---|---|
| `/` | Public | Homepage with hero, features, teaser |
| `/about` | Public | Label story |
| `/login` | Public | Sign in |
| `/register` | Public | Create account (triggers admin notification) |
| `/artists` | Approved members | Songwriter roster |
| `/songs` | Approved members | Full song catalog |
| `/account` | Approved members | Account info, redeem access code |
| `/admin` | Admin only | User management, access codes |
| `/admin/review/:token` | One-time link (emailed) | Approve/reject a specific account request |

---

## Admin Capabilities

- View all pending, approved, and rejected accounts
- Approve or reject account requests
- Change any user's role
- Reset any user's password
- Generate access codes (radio or artist tier) linked to a specific member
- Apply an access code manually to a member's profile
- Write private notes on any member profile
- Add, edit, or delete artists and songs

---

## Data Model

**users**
- `id`, `username`, `email`, `password` (hashed), `role`, `status` (pending/approved/rejected), `userType` (self-reported on registration), `notes` (admin-only), `marketingConsent`, `reviewToken`

**artists**
- `id`, `name`, `imageUrl`, `bio`, `slug`

**songs**
- `id`, `title`, `thumbnailUrl`, `description`, `audioUrl`, `artistId`

**upgrade_codes**
- `id`, `code` (8-char alphanumeric), `role` (radio/artist), `createdFor` (userId), `usedBy` (userId), `createdAt`

---

## Seed Script

Runs automatically on every server startup (`server/seed.ts`). It:
- Resets the admin password to `admin123` (unconditional — remove this line once admin password is confirmed working in production)
- Seeds artists and songs if the database is empty
- Runs image URL migrations (png → webp)

---

## Deployment

- **Platform:** Replit Autoscale
- **Dev command:** `npm run dev` (Express + Vite together on port 5000)
- **Production:** Replit builds and hosts automatically on publish
- **Two environments:** Dev database (dev Replit) and Production database (deployed app) are separate. Schema changes need to be deployed to take effect in production.
- **Custom domain:** `itscountry.kizmetdemo.com` points to the Replit deployment

---

## Things to Do in Phase 2

- Move file storage to object storage (S3-compatible) — update upload routes and all file path references
- Bring in a developer for migration if/when the platform outgrows Replit
- Verify the Resend domain and potentially move to a dedicated `@itscountry.com` sending domain
- Remove the unconditional admin password reset from the seed script once production credentials are stable
