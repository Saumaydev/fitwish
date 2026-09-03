<div align="center">

# Fitwish

### Premium Gym Management & Member Experience

A modern, mobile-first gym management platform built for **Members, Trainers, and Admins** — with workout execution, memberships, attendance, progress tracking, trainer workflows, reporting, and an Android-ready experience.

<p>
  <a href="https://fitwish.vercel.app"><strong>Live App</strong></a> ·
  <a href="https://github.com/Saumaydev/fitwish/issues">Issues</a> ·
  <a href="https://github.com/Saumaydev/fitwish">Repository</a>
</p>

<p>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111827" alt="React" />
  <img src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
</p>
<p>
  <img src="https://img.shields.io/badge/Drizzle%20ORM-0.45-C5F74F?style=for-the-badge&logo=drizzle&logoColor=111827" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-4.1-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Capacitor-8.5-119EFF?style=for-the-badge&logo=capacitor&logoColor=white" alt="Capacitor" />
  <img src="https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

</div>

---

## ✨ Overview

**Fitwish** is a full-featured gym platform designed around the real workflows of a modern fitness center. It combines member self-service, trainer operations, and administrative control in one responsive application.

The experience is built to feel fast and polished across desktop and mobile, while the backend keeps authorization and data access enforced on the server.

The project is also **Android-ready through Capacitor**, allowing the same application to be packaged as a native Android app.

---

## 🎯 What Fitwish Does

| Role | Key capabilities |
| --- | --- |
| 🧑‍💻 **Member** | Dashboard, membership, workout execution, progress, attendance, calculators, trainer requests, notifications, profile & settings |
| 🏋️ **Trainer** | Dashboard, assigned clients, workout-plan builder, session scheduling, client progress, attendance, requests |
| 🛡️ **Admin** | Dashboard, member & trainer management, approvals, memberships, payments, holidays, reports, announcements, notifications, audit activity |

### Core product flows

**Member experience**

- Membership overview with renewal date and outstanding payment information
- Real workout execution: start → confirmation → guided sets → rest timer → finish
- Workout sessions persisted so active workouts can survive refresh/backgrounding
- Progress dashboard with weight, BMI, measurements, charts, and progress photos
- Attendance history, attendance percentage, and upcoming gym holidays
- BMI, BMR, and calorie calculators with persisted calculation history
- Trainer directory and trainer request flow
- Profile, settings, password change, theme controls, and problem reporting

**Trainer experience**

- Trainer dashboard with clients, sessions, active clients, and pending tasks
- Server-enforced access limited to assigned clients
- Workout-plan builder with ordering, sets, reps, weight, rest, and instructions
- Trainer-controlled session times
- Client progress and progress-photo viewing
- Idempotent attendance marking and attendance history
- Transaction-guarded client request approval/rejection

**Admin experience**

- Aggregate dashboard statistics without downloading entire datasets to the client
- Member search, filtering, sorting, and pagination
- Member detail with membership, payment, and trainer assignment management
- Trainer approval, rejection, deactivation, and reactivation
- Gym holiday CRUD
- Reports with open/resolve workflows and member notifications
- Request hub for member approvals, trainer applications, and payment confirmations
- Announcements, notifications, and full administrative audit activity

---

## 🧱 Architecture

Fitwish follows a layered architecture with server-side authorization at the API boundary and a service-oriented backend.

```text
┌─────────────────────────────────────────────────────────┐
│                     Fitwish UI                          │
│          Next.js + React + Tailwind CSS                 │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    API / Auth Layer                      │
│       Session auth • Role checks • Zod validation       │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Service Layer                          │
│   Users • Memberships • Workouts • Attendance • Reports │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                 PostgreSQL + Drizzle                    │
└─────────────────────────────────────────────────────────┘
```

### Canonical sources of truth

- **Trainer assignment:** `users.assignedTrainerUid` drives both sides of the trainer/client relationship.
- **Membership:** one membership row per user; expiry and due information are computed server-side.
- **Attendance:** deterministic `userUid + date` identity prevents duplicate records and supports overwrite-safe marking.
- **Sessions:** `users.sessionTime` is written only through authorized trainer/admin workflows.
- **Workout plans:** one trainer-authored plan per user, exposed read-only to the member.

---

## 🔐 Security Model

Security decisions are made on the server; client-side guards are treated as UX only.

- Role and ownership checks are enforced in API routes through authorization helpers.
- Members cannot self-approve, change their role, edit payment due amounts, or assign their own trainer/session time.
- Trainers can access only their assigned clients, and approval fields are protected from trainer writes.
- Sensitive admin mutations are recorded in `adminAuditLogs` and can generate scoped notifications.
- Progress files are protected by ownership / assigned-trainer / admin authorization checks.
- Session authentication uses secure server-side cookies with password hashing.

---

## ⚡ Performance & UX

Fitwish is designed around responsive, progressive loading and low-friction mobile interactions.

- Route-based code splitting
- Lazy-loaded charts with `next/dynamic`
- SWR caching, deduplication, and targeted refresh intervals
- Skeleton loading for dashboard and list experiences
- Server-side pagination and search for admin lists
- SQL aggregates instead of client-side mega-queries
- Client-side image compression and generated thumbnails
- Local storage persistence for active workout state
- Mobile safe-area handling and thumb-friendly controls

---

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | **Next.js 16** |
| Language | **TypeScript** |
| UI | **React 19** |
| Styling | **Tailwind CSS v4** |
| Database | **PostgreSQL** |
| ORM | **Drizzle ORM** |
| Validation | **Zod** |
| Forms | **React Hook Form** |
| Data fetching | **SWR** |
| Client state | **Zustand** |
| Charts | **Recharts** |
| Animation | **Framer Motion** |
| Icons | **Lucide React** |
| Mobile packaging | **Capacitor 8** |
| Deployment | **Vercel** |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have:

- Node.js installed
- npm installed
- A PostgreSQL database
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Saumaydev/fitwish.git
cd fitwish
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create your local environment file:

```bash
cp .env.example .env
```

Then set the required database and application values in `.env`.

> Never commit `.env` files, passwords, tokens, or other secrets to GitHub.

### 4. Create / update the database

```bash
npx drizzle-kit push
```

### 5. Create the first admin account

```bash
npx tsx scripts/create-admin.ts "you@gym.com" "StrongPass@123" "Your Name"
```

### 6. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Members and trainers can self-register and remain pending until approved by an admin.

---

## 📱 Android

Fitwish can be packaged for Android with Capacitor.

```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Build the APK or AAB from Android Studio after syncing the web application.

The project already accounts for mobile safe areas, bottom navigation, and touch-friendly workout controls.

---

## 📜 Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |
| `npm run create-admin` | Create the first admin account |
| `npx drizzle-kit push` | Apply the database schema |

---

## 📁 Project Structure

```text
fitwish/
├── android/              # Capacitor Android project
├── public/               # Public assets
├── scripts/              # Utility / setup scripts
├── src/
│   ├── app/              # Next.js routes and role-based app screens
│   ├── components/       # Reusable UI and navigation components
│   ├── db/               # Database schema and database access
│   └── lib/              # Auth, services, types, formatting, utilities
├── .env.example          # Environment variable template
├── capacitor.config.ts   # Capacitor configuration
├── drizzle.config.ts     # Drizzle configuration
├── package.json
└── README.md
```

---

## 🔄 Firebase-Style Data Concepts

The original backend conventions are intentionally close to common Firebase patterns, making the domain model easy to reason about and portable if a future migration is ever required.

| Concept | Fitwish implementation |
| --- | --- |
| Authentication | Server-side session authentication |
| Collections | PostgreSQL tables defined in `src/db/schema.ts` |
| UID-scoped storage | `./uploads/users/{uid}/...` |
| Security rules | Server-side authorization in API routes |
| Cloud-function style work | Service-layer mutations, notifications, and audit logging |

---

## 🧪 Quality Checks

Before opening a pull request or deploying a significant change, run:

```bash
npm run lint
npm run typecheck
npm run build
```

---

## 🤝 Contributing

Contributions, fixes, and ideas are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run the lint, typecheck, and build commands.
5. Open a pull request with a clear description of the change.

For bugs and feature requests, use the GitHub issue tracker.

---

## 🌐 Links

- **Live application:** https://fitwish.vercel.app
- **GitHub:** https://github.com/Saumaydev/fitwish

---

<div align="center">

### Built with ❤️ for better gym management

**Fitwish** — Train smarter. Manage better. Progress together.

</div>
