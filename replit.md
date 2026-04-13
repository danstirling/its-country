# It's Country - Record Label Website

## Overview
A members-only country music streaming platform called "It's Country" with Texas desert theming. Features public pages with blurred teaser walls, admin-approved member access, tiered roles, and persistent cloud file storage.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + wouter routing
- **Backend**: Express.js with passport-local authentication
- **Database**: PostgreSQL with Drizzle ORM
- **Sessions**: connect-pg-simple for PostgreSQL-backed sessions
- **File Storage**: Replit Object Storage (persistent across restarts/deploys)
- **Email**: Resend for transactional emails (registration, approval, rejection, password reset)

## Key Features
- Public pages: Home (hero + features), About (label story)
- Blurred teaser walls for non-members
- Member registration with admin approval required
- Tiered roles: member, industry, artist, radio, admin, superadmin
- Members-only: Artists page, Songs catalog, streaming
- Admin panel: user management, artist/song CRUD, role assignment, password resets
- Email notifications on registration, approval, rejection, password reset
- Rate limiting on login (10/15min), register (5/hr), forgot-password (5/15min)
- Password complexity enforcement (8+ chars, uppercase, lowercase, number, special)

## Data Model
- **users**: id, username, email, password (hashed), role, status, firstName, lastName, userType, notes, marketingConsent, reviewToken, resetToken, resetTokenExpires
- **artists**: id, name, imageUrl, bio, slug
- **songs**: id, title, thumbnailUrl, description, artistId, audioUrl, mp4Url, lyrics, genre, status, releaseDate, ascapLyricWriter, ascapProductionName, songNotes, viewCount, downloadCount
- **upgradeCodes**: id, code, role, createdFor, usedBy, createdAt

## File Storage
- **Existing catalog** (Dan Stirling): Bundled in `client/public/audio/` and `client/public/images/`, served as static files
- **New uploads**: Stored in Replit Object Storage via `/api/upload/image` and `/api/upload/audio`
- **Serving new uploads**: `/storage/images/:filename` (public), `/storage/audio/:filename` (auth-protected)
- Both old (`/audio/xxx.mp3`, `/images/xxx.webp`) and new (`/storage/audio/xxx`, `/storage/images/xxx`) URLs coexist

## Auth
- Local auth with passport-local strategy (login via email)
- Passwords hashed with scrypt
- Session-based auth with PostgreSQL session store (30-day sessions)
- Roles: member (default), industry, artist, radio, admin, superadmin
- Superadmin: admin@itscountry.com (password set by client)
- Admin notification email: ADMIN_NOTIFICATION_EMAIL env var

## Routes
- `/` - Home (public)
- `/about` - About (public)
- `/login` - Sign in
- `/register` - Create account (pending admin approval)
- `/forgot-password` - Password reset request
- `/reset-password/:token` - Password reset form
- `/artists` - Artist roster (approved members only)
- `/artists/:slug/songs` - Song catalog per artist (approved members only)
- `/songs` - Full song catalog (approved members only)
- `/account` - Account settings (authenticated)
- `/admin` - Admin panel (admin/superadmin only)
- `/admin/review/:token` - One-click email review for new accounts

## Environment Variables
- `RESEND_API_KEY` - Resend email API key (delete before project transfer; new owner creates their own)
- `RESEND_FROM_EMAIL` - Sender address for all outgoing emails (default: `noreply@its-country.com`); must match a domain verified in the new owner's Resend account
- `SESSION_SECRET` - Express session secret
- `ADMIN_NOTIFICATION_EMAIL` - Email for new account notifications (fallback: `danstirling23@gmail.com`)
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID` - Replit Object Storage bucket
- `PUBLIC_OBJECT_SEARCH_PATHS` - Object storage public paths
- `PRIVATE_OBJECT_DIR` - Object storage private directory

## Theme
Desert sand palette with warm tones. Playfair Display (serif headings) and Montserrat (sans body). Dark mode supported.

## Seed Data
On startup, seed.ts ensures Dan Stirling artist and his 21-song catalog exist. No placeholder artists are created.
