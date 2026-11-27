# CLAUDE.md — Project Context for AI Assistants

## What This Is

A personal productivity dashboard with 4 tabs: Kanban board, Trackers, Expenses, Inventory. Single-user app, deployed on Vercel, backed by Firebase. All UI is in one Next.js app — no API routes, no server components, everything is `"use client"`.

## Tech Stack (exact versions matter)

- **Next.js 16.4.6** with `cacheComponents: true` and `partialPrefetching: true` in `next.config.ts`
  - `export const dynamic = "force-dynamic"` is NOT compatible with this config — never add it
- **React 19.3.0** — uses modern React (no legacy patterns)
- **Firebase 13.2.0** — Auth + Firestore only (no Storage, no Functions, no Hosting)
- **TypeScript** — strict, all types in `lib/firestore.ts`
- **CSS** — vanilla CSS in `app/globals.css`, no Tailwind, no CSS modules. Uses CSS custom properties for theming.

## File Map

### Entry Points
- `app/layout.tsx` — wraps everything in `<AuthProvider>`
- `app/page.tsx` — renders login screen OR 4-tab dashboard (Board | Trackers | Expenses | Inventory)

### Data Layer (`lib/`)
- `lib/firebase.ts` — lazy Firebase init via `getFirebaseAuth()` / `getFirebaseDb()`. MUST be lazy to avoid SSR crashes.
- `lib/auth-context.tsx` — React context for auth. Exports `useAuth()` → `{ user, loading, isGuest, signInWithGoogle, signInAsGuest, logout }`. Type `AppUser` is either a real Firebase `User` or a `GuestUser` (fake, in localStorage).
- `lib/firestore.ts` — ALL TypeScript interfaces and ALL Firestore CRUD functions live here. This is the single source of truth for data types: `KanbanCard`, `KanbanColumn`, `Priority`, `Subtask`, `Tracker`, `TrackerEntry`, `Expense`, `InventoryItem`, `ExpenseCategory`. Also contains `DEFAULT_COLUMNS` and `DEFAULT_EXPENSE_CATEGORIES`.
- `lib/local-storage.ts` — mirrors every function from `firestore.ts` but reads/writes localStorage. Keys: `kanban-cards`, `kanban-columns`, `kanban-trackers`, `kanban-tracker-entries`, `kanban-expenses`, `kanban-inventory`.

### Components (`app/components/`)
- `kanban-board.tsx` — Board tab. Custom columns, priority cards, nested subtasks, summary toggle.
- `summary.tsx` — SVG bar chart (cards per column) + pie chart (priority distribution). Rendered inside kanban-board.
- `tracker-view.tsx` — Trackers tab. Daily counters with +/- buttons and 7-day SVG sparkline per tracker.
- `expenses-view.tsx` — Expenses tab. Monthly view, add form, category summary with bars, CSV export.
- `inventory-view.tsx` — Inventory tab. Supplies grid, quantity +/- buttons, low-stock alert banner.
- `firestore-error-toast.tsx` — Pub/sub error reporter. Exports `reportFirestoreError(err)`. Shows clickable index-creation URLs.
- `header.tsx` — Top bar: "Dashboard" branding, user avatar, sign out button.
- `login-button.tsx` — Google sign-in button with inline SVG logo.
- `guest-button.tsx` — "Continue as Guest" button.

### Firebase Config (root)
- `firestore.rules` — per-user read/write rules (`request.auth.uid == resource.data.userId`)
- `firestore.indexes.json` — composite indexes for queries that filter by userId + order/date
- `firebase.json` — Firebase project config
- `.env.local` — Firebase API keys (gitignored, never commit)

## Key Patterns

### 1. Store Switching (Guest vs Firebase)
Every view does this at the top:
```typescript
const store = isGuest
  ? { get: localFn, add: localFn, ... }
  : { get: firestoreFn, add: firestoreFn, ... };
```
Then uses `store.get(user.uid)` etc. The view never calls Firebase or localStorage directly.

**When adding a new feature with data persistence:**
1. Add the interface and Firestore functions to `lib/firestore.ts`
2. Add matching localStorage functions to `lib/local-storage.ts`
3. Use the store switching pattern in the component
4. Add Firestore security rules in `firestore.rules`
5. Add composite indexes in `firestore.indexes.json` if the query uses `where` + `orderBy`

### 2. Error Handling
Every async data load wraps in try/catch and calls `reportFirestoreError(err)` in the catch block. This shows errors on-screen (critical for mobile where there's no DevTools console).

### 3. Firestore Security Rules Gotcha
List queries on empty collections have `resource == null`. The production rules at the Firebase Console may have `resource == null ||` prepended to read rules — the local `firestore.rules` file may not reflect this if it was pulled before that fix. Always ensure read rules handle null resource.

### 4. Firebase Lazy Initialization
`lib/firebase.ts` does NOT initialize Firebase at import time. It uses a closure pattern — the app/db instances are created on first function call. This prevents crashes during Next.js SSR/prerendering.

## Firestore Collections

```
cards          → { userId, title, description, column, priority, order, subtasks[], createdAt, updatedAt }
columns        → { userId, label, order }
trackers       → { userId, label, icon, order, createdAt }
tracker_entries → { userId, trackerId, count, date: "YYYY-MM-DD" }
expenses       → { userId, amount, category, subcategory, description, date: "YYYY-MM-DD", createdAt }
inventory      → { userId, name, quantity, unit, icon, lowThreshold, updatedAt }
```

All documents are scoped to a single user via `userId`. There are no cross-user queries or shared data.

## CSS Architecture

`app/globals.css` contains the entire design system:
- CSS custom properties on `:root` for colors, shadows, radius
- Dark mode via `@media (prefers-color-scheme: dark)`
- Accent color: indigo (`#6366f1` light, `#818cf8` dark)
- All component styles are in this one file — no CSS modules, no component-scoped styles
- Mobile responsive with media queries

## Expense Categories

`DEFAULT_EXPENSE_CATEGORIES` in `lib/firestore.ts` contains Polish category/subcategory pairs matching a personal budget spreadsheet. The CSV export (`exportCSV` in `expenses-view.tsx`) generates semicolon-delimited files with UTF-8 BOM for Polish Excel compatibility. Daily columns (1–31) per subcategory row.

## Things NOT to Do

- Don't add `export const dynamic = "force-dynamic"` — breaks cacheComponents
- Don't initialize Firebase at module scope — must be lazy
- Don't use Firestore `resource.data.userId` in read rules without handling `resource == null`
- Don't use CSS modules or Tailwind — this project uses vanilla CSS in globals.css
- Don't add API routes — this is a fully client-side app, Firestore is called directly from the browser
- Don't change collection names — they must match between `firestore.ts`, `local-storage.ts`, `firestore.rules`, and `firestore.indexes.json`

## Deployment

- **Vercel** — auto-deploys from `master` branch
- **Firestore rules** — deployed via Firebase Console or `firebase deploy --only firestore:rules`
- **Indexes** — auto-created by Firestore or deployed via `firebase deploy --only firestore:indexes`
