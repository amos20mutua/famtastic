# Famtastic

Famtastic is a premium, mobile-first family coordination web app designed to feel calm, warm, structured, and dependable. This MVP is optimized for one family workspace first, while keeping the architecture clean enough to grow into a broader family product later.

## What is included

- Family-first onboarding, login, signup, and family join/create flow
- Today dashboard with devotion, duties, meal responsibility, reminder stack, and upcoming responsibilities
- Duty scheduling with completion tracking and rotation generation
- Devotion planner with leader rotation, reading, topic, and notes
- Meal planning with cook assignment and ingredient visibility
- Shared shopping list with urgency and fast capture
- Reminder center with upcoming, due-soon, and overdue states
- Family members and admin settings screens
- Structured governance model with parent admin control, optional co-admin support, member change requests, and audit history
- Offline-friendly local persistence and queued sync behavior
- Installable Chrome-first PWA with a custom service worker
- Device-panel notifications with deep links into the exact duty, meal, or devotion
- Local reminder evaluation from device-stored assignments for installed-PWA use
- Push subscription storage plus Supabase Edge Function scaffolding for server-triggered reminders
- Supabase-ready schema, RLS policies, and SQL seed data

## Stack

- React 19
- Vite 7
- TypeScript
- Tailwind CSS
- Supabase client scaffolding
- IndexedDB via `idb-keyval`
- `vite-plugin-pwa` for installability and offline assets
- Notifications API + service worker runtime

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

4. Optional Supabase setup:

- Copy `.env.example` to `.env`
- Add your `VITE_SUPABASE_URL`
- Add your `VITE_SUPABASE_ANON_KEY`
- Apply the schema in [`supabase/migrations/0001_famtastic_schema.sql`](/c:/Users/Admin/Desktop/Norms/supabase/migrations/0001_famtastic_schema.sql)
- Apply [`supabase/migrations/0002_push_subscriptions.sql`](/c:/Users/Admin/Desktop/Norms/supabase/migrations/0002_push_subscriptions.sql) for device push subscription storage
- Apply [`supabase/migrations/0003_governance_model.sql`](/c:/Users/Admin/Desktop/Norms/supabase/migrations/0003_governance_model.sql) for co-admin support, change requests, and audit logs
- Apply [`supabase/migrations/0004_permissions_enforcement.sql`](/c:/Users/Admin/Desktop/Norms/supabase/migrations/0004_permissions_enforcement.sql) for co-admin-aware RLS, guarded member updates, and trigger-based audit enforcement
- Apply [`supabase/migrations/0005_rotational_duties.sql`](/c:/Users/Admin/Desktop/Norms/supabase/migrations/0005_rotational_duties.sql) for fixed assignments, per-duty participant queues, and persisted rotation cursors
- Apply [`supabase/migrations/0006_family_flexibility.sql`](/c:/Users/Admin/Desktop/Norms/supabase/migrations/0006_family_flexibility.sql) for duty skip rules and assignment source tracking
- Apply [`supabase/migrations/0007_devotion_rest_days.sql`](/c:/Users/Admin/Desktop/Norms/supabase/migrations/0007_devotion_rest_days.sql) for devotion skip-weekday controls
- Apply [`supabase/migrations/0008_workspace_bootstrap.sql`](/c:/Users/Admin/Desktop/Norms/supabase/migrations/0008_workspace_bootstrap.sql) for authenticated family create/join RPC bootstrap functions
- Seed the workspace with [`supabase/seed.sql`](/c:/Users/Admin/Desktop/Norms/supabase/seed.sql)
- Optional for Push API support:
  - Add `VITE_VAPID_PUBLIC_KEY`
  - Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `PUSH_DELIVERY_SECRET` for [`supabase/functions/send-push-reminders/index.ts`](/c:/Users/Admin/Desktop/Norms/supabase/functions/send-push-reminders/index.ts)

Without Supabase credentials, the app runs in a polished local demo mode backed by IndexedDB and realistic seeded family data.

## Install on devices

When running the production build, Famtastic is installable as a PWA on Android, iPhone/iPad, Windows, and macOS.

1. Open Famtastic in the browser and use the small `Install` button in the app header.
2. Android (Chrome/Edge): tap `Install` when the browser prompt appears.
3. Windows/macOS (Chrome/Edge): click `Install`, then confirm in the browser install prompt.
4. iPhone/iPad (Safari): tap `Install`, then use `Share` -> `Add to Home Screen`.

## Demo accounts

In local demo mode, any password works for the seeded family emails:

- `grace@famtastic.app`
- `daniel@famtastic.app`
- `leah@famtastic.app`
- `micah@famtastic.app`

## Folder structure

```text
src/
  app/                App providers and routing
  components/         Shared UI, shell, and presentation primitives
  data/               Domain types, seeds, and repository mode helpers
  features/           Route-level product screens by feature
  hooks/              Small route and interaction hooks
  lib/                Utilities, reminders, Supabase client, persistence
  state/              App state provider and mutations
  styles/             Global design system styles
public/               Icons and static assets
supabase/             SQL migration and seed data
```

## Product architecture

### 1. Local-first runtime

The UI is driven by a single workspace state provider in [`src/state/app-state.tsx`](/c:/Users/Admin/Desktop/Norms/src/state/app-state.tsx). That provider:

- hydrates the workspace from IndexedDB
- falls back to seeded family data on first load
- computes visible reminders
- queues mutations while offline
- simulates safe sync when the network returns
- triggers install and notification affordances

### 2. Repository split

- Local demo mode is available immediately
- Supabase client and auth helpers live in [`src/lib/supabase.ts`](/c:/Users/Admin/Desktop/Norms/src/lib/supabase.ts) and [`src/data/repositories/supabase-repository.ts`](/c:/Users/Admin/Desktop/Norms/src/data/repositories/supabase-repository.ts)
- Repository mode detection lives in [`src/data/repositories/index.ts`](/c:/Users/Admin/Desktop/Norms/src/data/repositories/index.ts)

This keeps the MVP usable today while leaving a clear seam for a real backend.

### 3. Reminder architecture

Reminder behavior is intentionally strong and multi-layered:

- Generated reminder feed based on duties, meals, and devotions
- Severity states: `upcoming`, `due-soon`, `overdue`
- Sticky overdue cards on the dashboard
- Custom service worker for device-panel delivery
- Exact deep links into the relevant screen and card
- User-specific local reminder schedules stored on-device
- Push subscription support for server-triggered delivery when online
- App badge updates when supported
- Reminder visibility tuned through admin settings

The reminder engine lives in [`src/lib/reminders.ts`](/c:/Users/Admin/Desktop/Norms/src/lib/reminders.ts), [`src/lib/notification-runtime.ts`](/c:/Users/Admin/Desktop/Norms/src/lib/notification-runtime.ts), [`src/lib/notification-client.ts`](/c:/Users/Admin/Desktop/Norms/src/lib/notification-client.ts), and [`src/sw.ts`](/c:/Users/Admin/Desktop/Norms/src/sw.ts).

### 4. Governance model

- Parent admin controls household structure, reminder rules, member roles, and corrections
- Members have full visibility plus controlled contribution paths such as completion, shopping, and change requests
- Optional co-admin role is modeled for future trusted helpers
- Important actions create audit records with actor, action, old value, new value, and timestamp
- Change requests are stored separately from direct schedule edits so approvals stay deliberate

The local governance logic lives in [`src/state/app-state.tsx`](/c:/Users/Admin/Desktop/Norms/src/state/app-state.tsx), while the database foundation lives in [`supabase/migrations/0003_governance_model.sql`](/c:/Users/Admin/Desktop/Norms/supabase/migrations/0003_governance_model.sql).

Database enforcement goes further in [`supabase/migrations/0004_permissions_enforcement.sql`](/c:/Users/Admin/Desktop/Norms/supabase/migrations/0004_permissions_enforcement.sql):

- co-admin aware RLS for schedules and planning entities
- parent-only protection for family membership and reminder-rule governance
- member-only completion updates on assigned duties
- member-only shopping checklist toggles without structural edits
- self-only request submission and self-only completion history inserts for non-governors
- trigger-based audit capture for schedule, role, request, and settings changes

### 5. PWA and offline behavior

- Service worker registration happens in [`src/main.tsx`](/c:/Users/Admin/Desktop/Norms/src/main.tsx)
- The custom injected PWA worker is defined in [`src/sw.ts`](/c:/Users/Admin/Desktop/Norms/src/sw.ts)
- Vite PWA config lives in [`vite.config.ts`](/c:/Users/Admin/Desktop/Norms/vite.config.ts)
- Workspace state persists to IndexedDB through [`src/lib/storage.ts`](/c:/Users/Admin/Desktop/Norms/src/lib/storage.ts)
- Reminder schedules and delivery records persist locally through [`src/lib/notification-storage.ts`](/c:/Users/Admin/Desktop/Norms/src/lib/notification-storage.ts)

This means core family schedules remain visible even when connectivity is unstable.

### 6. Notification delivery model

- Best experience: installed Chrome PWA on Android
- Local reminders: the current member's assigned duties, meals, and devotions are synced into the service worker and evaluated from device storage
- Overdue reminders repeat based on escalation settings until the item is completed
- Push reminders: when VAPID keys and the Supabase Edge Function are configured, the same device can receive server-triggered reminders while online
- Notification taps open the exact relevant screen using `?focus=` deep links

Important platform note: on the web, exact-timed closed-app notifications are not guaranteed purely from local device data. The app uses the strongest practical Chrome PWA approach for MVP:

- local evaluation while the installed app is active or background-capable
- best-effort background sync and periodic checks where supported
- Push API delivery for reliable closed-app notifications when internet is available

## Design system direction

The interface is intentionally not a generic dashboard. The design language uses:

- warm sand and pine tones
- soft gradients and subtle atmosphere
- Fraunces for display typography
- Manrope for body clarity
- rounded premium surfaces with light elevation
- mobile-first spacing and card rhythm

Core global styling lives in [`src/styles/index.css`](/c:/Users/Admin/Desktop/Norms/src/styles/index.css) and [`tailwind.config.ts`](/c:/Users/Admin/Desktop/Norms/tailwind.config.ts).

## Security notes

The Supabase schema is built with production-minded safeguards:

- family-scoped row-level security
- family parent/admin write controls
- authenticated membership checks before data access
- separate family membership model from profile records
- nullable `user_id` on profiles to support invited members before full account linking
- safe client-side environment variable handling

## Key files

- App state: [`src/state/app-state.tsx`](/c:/Users/Admin/Desktop/Norms/src/state/app-state.tsx)
- Router: [`src/app/router.tsx`](/c:/Users/Admin/Desktop/Norms/src/app/router.tsx)
- Today dashboard: [`src/features/dashboard/today-page.tsx`](/c:/Users/Admin/Desktop/Norms/src/features/dashboard/today-page.tsx)
- Duty experience: [`src/features/duties/duties-page.tsx`](/c:/Users/Admin/Desktop/Norms/src/features/duties/duties-page.tsx)
- Devotion planner: [`src/features/devotions/devotions-page.tsx`](/c:/Users/Admin/Desktop/Norms/src/features/devotions/devotions-page.tsx)
- Meals: [`src/features/meals/meals-page.tsx`](/c:/Users/Admin/Desktop/Norms/src/features/meals/meals-page.tsx)
- Shopping list: [`src/features/shopping/shopping-page.tsx`](/c:/Users/Admin/Desktop/Norms/src/features/shopping/shopping-page.tsx)
- Reminder center: [`src/features/notifications/notifications-page.tsx`](/c:/Users/Admin/Desktop/Norms/src/features/notifications/notifications-page.tsx)
- Service worker: [`src/sw.ts`](/c:/Users/Admin/Desktop/Norms/src/sw.ts)
- Notification client bridge: [`src/lib/notification-client.ts`](/c:/Users/Admin/Desktop/Norms/src/lib/notification-client.ts)
- Push function: [`supabase/functions/send-push-reminders/index.ts`](/c:/Users/Admin/Desktop/Norms/supabase/functions/send-push-reminders/index.ts)
- Family workspace: [`src/features/family/members-page.tsx`](/c:/Users/Admin/Desktop/Norms/src/features/family/members-page.tsx)
- Admin controls: [`src/features/admin/admin-settings-page.tsx`](/c:/Users/Admin/Desktop/Norms/src/features/admin/admin-settings-page.tsx)
