# Dashboard

Personal productivity dashboard — kanban board, habit trackers, expense tracking, and household inventory. Built with Next.js 16 + Firebase, deployed on Vercel.

**Live:** https://kanniklausban.vercel.app/

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.4.6, React 19, TypeScript |
| Auth | Firebase Auth (Google sign-in via popup) |
| Database | Cloud Firestore (per-user documents) |
| Hosting | Vercel (serverless) |
| Styling | Vanilla CSS with custom properties, dark/light theme |

## Features

### Board (Kanban)
- Custom columns (add, rename, delete)
- Cards with priority levels (low / medium / high)
- Nested subtasks with progress bar
- Move cards between columns with arrow buttons
- Summary view with SVG bar chart and pie chart

### Trackers
- Custom counters for daily habits (cigarettes, energy drinks, etc.)
- Icon picker with emoji selection
- 7-day sparkline mini chart per tracker
- Daily count with +/- buttons

### Expenses
- Monthly expense tracking with Polish category names
- Categories match a personal budget spreadsheet (see `DEFAULT_EXPENSE_CATEGORIES` in `lib/firestore.ts`)
- Month navigation with Polish month labels
- Summary view with category breakdown bars
- CSV export (semicolons, UTF-8 BOM) for direct import into Polish Excel spreadsheets

### Inventory
- Household supplies tracker (trash bags, toilet paper, etc.)
- Quantity counter with +/- buttons
- Low-stock alerts when quantity drops to threshold
- Icon picker, custom units (szt, rolek, worków, etc.)

### Cross-cutting
- **Guest mode:** full functionality without sign-in, all data in localStorage
- **Firestore error toast:** on-screen error display with clickable "Create Index" links (no DevTools needed on mobile)
- **Dark/light theme:** automatic via `prefers-color-scheme`
- **Mobile responsive:** all views work on phone screens

## Project Structure

```
kanban/
├── app/
│   ├── layout.tsx              # Root layout, wraps in AuthProvider
│   ├── page.tsx                # Main page — login screen or 4-tab dashboard
│   ├── globals.css             # Full design system (CSS custom properties)
│   └── components/
│       ├── kanban-board.tsx     # Kanban board with columns, cards, subtasks
│       ├── summary.tsx         # SVG charts — bar (cards/column) + pie (priority)
│       ├── tracker-view.tsx    # Daily counters with 7-day mini charts
│       ├── expenses-view.tsx   # Monthly expenses, summary, CSV export
│       ├── inventory-view.tsx  # Household inventory with low-stock alerts
│       ├── firestore-error-toast.tsx  # On-screen Firestore error display
│       ├── header.tsx          # Top bar with branding + sign out
│       ├── login-button.tsx    # Google sign-in button
│       └── guest-button.tsx    # "Continue as Guest" button
├── lib/
│   ├── firebase.ts             # Firebase lazy init (avoids SSR issues)
│   ├── auth-context.tsx        # Auth context — Google + guest mode
│   ├── firestore.ts            # All types, interfaces, Firestore CRUD
│   └── local-storage.ts        # localStorage mirror for guest mode
├── firestore.rules             # Firestore security rules
├── firestore.indexes.json      # Composite indexes
├── firebase.json               # Firebase project config
├── next.config.ts              # cacheComponents + partialPrefetching enabled
└── .env.local                  # Firebase config keys (gitignored)
```

## Architecture Patterns

### Auth & Guest Mode
`lib/auth-context.tsx` exposes `useAuth()` returning `{ user, loading, isGuest, signInWithGoogle, signInAsGuest, logout }`.

- `AppUser` = Firebase `User` (real) | `GuestUser` (fake user object in localStorage)
- 5-second timeout: if Firebase doesn't respond, falls back to guest
- Guest data lives entirely in localStorage under `kanban-*` keys

### Store Switching
Every view follows the same pattern:

```typescript
const store = isGuest
  ? { get: getItemsLocal, add: addItemLocal, ... }
  : { get: getItems, add: addItem, ... };
```

`lib/firestore.ts` has all Firestore functions. `lib/local-storage.ts` mirrors them for localStorage. The component doesn't know which backend it's using.

### Firebase Lazy Init
`lib/firebase.ts` exports `getFirebaseAuth()` and `getFirebaseDb()` — these lazy-initialize on first call to avoid SSR/prerender crashes.

### Error Reporting
`firestore-error-toast.tsx` exports `reportFirestoreError(err)` — a pub/sub listener pattern. Any component's catch block calls it, and the toast renders at the bottom of the screen. If the error contains a Firebase Console URL (index creation), it's shown as a clickable link.

## Firestore Collections

| Collection | Key Fields | Indexed By |
|-----------|------------|------------|
| `cards` | userId, title, column, priority, order, subtasks[] | userId + order |
| `columns` | userId, label, order | userId + order |
| `trackers` | userId, label, icon, order | userId + order |
| `tracker_entries` | userId, trackerId, date, count | userId + date; userId + trackerId + date |
| `expenses` | userId, amount, category, subcategory, date | — |
| `inventory` | userId, name, quantity, unit, icon, lowThreshold | — |

Security rules: authenticated users can only read/write their own documents (`request.auth.uid == resource.data.userId`).

## Development

```bash
npm install
npm run dev
```

Requires `.env.local` with Firebase config (see Firebase console for keys).

## Expense Categories (Polish)

The categories in `DEFAULT_EXPENSE_CATEGORIES` match a personal budget spreadsheet. Main categories: Jedzenie, Kobiety Dragi Lasery, Transport, Rozrywka i Edukacja, Zdrowie i Higiena, Ubranie, Edukacja, Rozrywka, Inne wydatki, Spłata długów, Budowanie oszczędności. Each has Polish subcategories. The CSV export uses semicolons as delimiters (European format) with daily columns for spreadsheet compatibility.
