# Fitwish — Premium Gym Management & Member Experience

Fitwish is a production-quality gym platform with three roles — **Member**, **Trainer**, **Admin** — built as a fast, premium, mobile-first web application (Next.js 16, TypeScript strict, PostgreSQL via Drizzle ORM, Tailwind CSS v4, Framer Motion, SWR, Zustand, Recharts) that is Android-packaging ready through Capacitor.

The backend architecture mirrors Firebase conventions (Auth / Firestore collections / UID-scoped Storage / security rules) so the data model and service layer map 1:1 to a Firebase port if ever needed:

| Firebase concept | Fitwish equivalent |
| --- | --- |
| Firebase Auth | Server-side session auth (`src/lib/auth.ts`), scrypt password hashing, httpOnly cookies |
| Cloud Firestore collections | PostgreSQL tables in `src/db/schema.ts` (users, trainers, memberships, workoutPlans, workoutSessions, attendance, trainerRequests, progress, progressPhotos, calculations, notifications, reports, gymHolidays, payments, adminAuditLogs) |
| Firebase Storage UID paths | `./uploads/users/{uid}/...` with server-side authorization on every read |
| Firestore security rules | Enforced server-side in every API route via `requireApiUser` / `requireAdmin` |
| Cloud Functions | Service-layer mutations with notifications & audit logging |

## Getting started

See **[setup.txt](setup.txt)** for a very basic step-by-step guide.

```bash
npm install
cp .env.example .env      # set DATABASE_URL
npx drizzle-kit push      # create tables
npx tsx scripts/create-admin.ts "you@gym.com" "StrongPass@123" "Your Name"
npm run dev               # http://localhost:3000
```

Sign in with the admin account you created above; members and trainers self-register and wait for admin approval.

## Core product flows

- **Entry** — the app opens on the login page; "Create account" offers Member or Trainer. **Member registration creates an admin approval request; the member can only enter the app after approval** (same for trainers). Admin is never a public role.
- **User** — Home (membership card with renewal date + payment due, trainer card, today's session, notifications), real **workout execution** (start → confirmation → guided sets → precise rest timer → finish → persisted session), progress (weight/BMI charts, measurements, UID-scoped progress photos with client-side compression), attendance (summary %, history, upcoming gym holidays), calculators (BMI/BMR/calories with persisted history), trainer directory & requests, profile & settings (theme Light/Dark/System that actually applies, account edits, password change, report a problem).
- **Trainer** — dashboard (clients, today's sessions, active clients, pending tasks), My Clients (only assigned clients, enforced server-side), per-client: session time (trainer-controlled, user can't edit), workout plan builder (ordering, sets/reps/weight/rest/instructions), client progress & photos, attendance marking (idempotent per user+date) with a separate history screen, accept/reject client requests (transaction-guarded, idempotent).
- **Admin** — dashboard with aggregate stats (no client-side mega-queries), member list (search/filter/sort/pagination), member detail (membership & payments editor with auto-calculated due, trainer assignment from approved-active trainers only), trainer approvals (approve/reject/deactivate/reactivate), gym holidays CRUD, reports (open/resolve with member notifications), requests hub (member approvals, trainer applications, payment confirmations), announcements, full audit log.

## Canonical sources of truth

- Trainer assignment: `users.assignedTrainerUid` drives User → Your Trainer AND Trainer → My Clients AND admin assignment.
- Membership: one row per user; expiry/due computed server-side; user display is read-only.
- Attendance: deterministic id `{userUid}_{date}` — no duplicates, overwrite-safe.
- Sessions: `users.sessionTime`, written only by trainer or admin.
- Workout plans: one plan per user (`plan_{userUid}`), trainer-written, user-read.

## Security model

- All authorization happens server-side (`src/lib/auth.ts`); client guards are UX only.
- Members cannot self-approve, edit their due amount, change role, set their own session time, or read other users' data.
- Trainers can only touch assigned clients; approval fields are never writable by trainers.
- Progress photos are UID-scoped on disk and every read passes `canReadFile` (owner / assigned trainer / admin).
- Sensitive admin mutations write `adminAuditLogs` and trigger recipient-scoped notifications.

## Performance

- Route-based code splitting; charts are lazy-loaded (`next/dynamic`, ssr:false).
- SWR with dedupe + targeted refetch intervals for notifications/dashboards; Home renders progressively with skeletons.
- Admin lists use server-side pagination + search; aggregates are SQL counts, not full downloads.
- Images are compressed (canvas) before upload with generated thumbnails; lists render thumbnails.
- Active workout state persists to localStorage (survives refresh/backgrounding) with a timestamp-based rest timer.

## Android (Capacitor)

```bash
npm run build
npx cap add android      # first time
npx cap sync android
npx cap open android     # build APK/AAB in Android Studio
```

Safe-area insets, mobile bottom navigation, and thumb-friendly workout controls are already in place. See `capacitor.config.ts`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npx drizzle-kit push` | Apply schema |
| `npx tsx scripts/create-admin.ts` | Create the first admin account |
| `npx next typegen` / `npm exec tsc -- --noEmit` | Type validation |
