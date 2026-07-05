# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.
It is the single source of truth for how to work on this project. Follow it exactly.

**Context:** This app is built and maintained by a non-developer ("vibecoding").
Claude is the only engineer. That means: be extra careful, explain what you do in
simple terms, never assume the user can debug things manually, and never leave the
app in a broken state.

---

## What This App Is

A mobile-first social web app for a group trip to Murcia in 2026
(feed, photos, guestbook, challenges, registrations, weather, push notifications).
Real people use it in production at **<https://murcia2026.vercel.app>**.
Treat production data as precious — real photos and messages live in Firebase.

---

## Commands

```bash
npm run dev       # Start dev server (Vite, http://localhost:5173)
npm run build     # Production build (must pass before any commit)
npm run preview   # Preview the production build locally
```

**Deploy = `git push` to GitHub.** Vercel deploys automatically from the GitHub repo.
There is no manual deploy command — never use one.

Package manager is **npm**. Never use bun, yarn, or pnpm.

---

## Architecture

- **`index.html`** — SPA entry point (Vite)
- **`src/`**
  - `main.jsx` / `App.jsx` — app entry and routing (page switching lives here)
  - `pages/` — one JSX file per screen (FeedPage, HubPage, ChallengePage, …)
  - `components/` — shared UI pieces (Header, BottomNav, PhotoUpload, …)
  - `context/AppContext.jsx` — global state (current user, shared data)
  - `hooks/usePushNotifications.js` — FCM push notification logic
  - `firebase.js` — Firebase init + ALL Firestore/Storage helpers
  - `utils/helpers.js` — small shared utilities
  - `styles.css` — the ONLY stylesheet. All CSS lives here.
- **`api/`** — Vercel serverless functions (Node.js): push notifications, proxy, counters
- **`public/`** — static assets + `firebase-messaging-sw.js` (service worker for push)
- **`firestore.rules` / `storage.rules`** — Firebase security rules
- **`vercel.json`** — hosting config (SPA rewrites, cache headers, api routes)
- **`deploy.sh`** — LEGACY manual deploy script. Do not use: deploys go through GitHub.

---

## STRICT RULES

These rules are **mandatory**. Never break them.

### Always Pull First

At the start of every session, before doing anything else, run `git pull`.
Never start coding on a stale branch.

### Tech Stack Is Locked

- **JavaScript only.** No TypeScript. Never rename `.jsx` files to `.tsx` or add type annotations.
- **Vite + React 18 SPA.** Never migrate to Next.js or add a router library — page
  switching works via state in `App.jsx`. Keep it that way.
- **Plain CSS in `src/styles.css`.** No Tailwind, no shadcn/ui, no CSS-in-JS, no CSS
  modules, no UI component libraries. Before writing new CSS, search `styles.css`
  for an existing class that already does what you need and reuse it.

### No Wild Dependencies

The app has exactly 3 runtime dependencies: `react`, `react-dom`, `firebase`.
Do not install ANY new package without asking the user first and explaining
in one simple sentence why it's needed. When in doubt: write the code by hand
instead of adding a dependency.

### Firebase

- All Firebase access goes through the helpers in `src/firebase.js` — never call
  Firestore/Storage directly from a page or component with a new import.
- The Firebase client config in `firebase.js` (apiKey etc.) is public by design —
  that is normal for Firebase web apps. Do NOT "fix" it by moving it to env vars.
- **Real secrets** live only in Vercel environment variables, used by `api/` functions:
  - `FIREBASE_SERVICE_ACCOUNT` — Firebase service account JSON (server-only)
  - `NOTIFY_SECRET` — protects the notification endpoints
  Never print, log, commit, or move these into client code (`src/`).
- **Never modify `firestore.rules` or `storage.rules` without explicit user approval.**
  The rules are currently open on purpose (the app has no Firebase Auth). Tightening
  them without care will break the whole app for everyone.
- **Never delete or bulk-modify production data** (Firestore documents, Storage files)
  unless the user explicitly asks for that exact operation. There are no backups.

### Deploys Are Sacred

- **The ONLY way to deploy is `git push` to GitHub.** Vercel watches the repo and
  deploys automatically. Pushing to `main` = deploying to production for real users.
- Therefore: push ONLY when the work is finished, `npm run build` passes, and the
  user has approved. Never push half-done work to `main`.
- Never run `npm run deploy`, `deploy.sh`, `vercel`, `vercel --prod`, or
  `firebase deploy`. These bypass the GitHub flow and are forbidden.
  (`deploy.sh` is a legacy script — do not use or "fix" it.)

### Don't Break Existing Patterns

- New screens follow the existing pattern: one file in `src/pages/`, wired up in `App.jsx`.
- Shared state goes through `AppContext.jsx` — no new state management.
- Serverless endpoints follow the existing style in `api/` (plain Node, no frameworks).
- Do not create new top-level files or folders without asking.
- Do not add auth, databases, or external services without asking.

### When Stuck

If something doesn't work after 2 attempts, STOP.
Do not try random fixes, install new packages, or rewrite large chunks of code.
Explain in simple, non-technical language: what failed, what you tried, and what
the options are. Then ask the user.

### Post-Change Validation

After every code change, always run:

```bash
npm run build
```

If it fails, fix the errors before moving on. Never skip this step, and never
commit code that doesn't build. For UI changes, also verify the affected page
loads in the dev server when possible.

### Explain Like I'm Not a Developer

The user cannot read code. After completing work, summarize in 2-3 plain sentences:
what changed, where to see it in the app, and anything to watch out for.
Never answer with raw code or jargon as the explanation.

---

## Code Style

- Match the existing code: plain JSX, French for user-facing text and comments.
- Keep components small; extract to `src/components/` when something is reused twice.
- Mobile-first: the app is used on phones. Every UI change must work on a small
  screen (test at ~390px width). Respect the BottomNav layout — nothing should
  render underneath it.

## Design Rules

- The app already has a design system: the colors, spacing, and classes in
  `src/styles.css`. Reuse them. Never introduce a second visual style.
- New UI must look like it was always part of the app — same buttons, same cards,
  same fonts. No redesigns unless the user explicitly asks.
- Motion: subtle CSS transitions only, consistent with existing ones.

---

## Git Commits

Always create atomic commits — one commit per logical change.

### Flow

1. `git status` + `git diff` to review all changes.
2. Split into the smallest logical units — each commit does ONE thing.
3. `git add <files>` → `git diff --staged` → `git commit -m "type(scope): description"`.
4. Repeat until the working tree is clean.
5. `git push` — **remember: pushing deploys to production.** Push only when the
   build passes and the user has approved the work.

### Format

```text
type(scope): description
```

Prefixes: `feat`, `fix`, `refactor`, `docs`, `perf`, `chore`, `style`.

### Rules

- Max 60 characters for the entire message.
- Present tense ("add", not "added").
- Never add "Co-Authored-By" or mention Claude/AI in commits.

---

## Keep CLAUDE.md Up to Date

After every structural change, update this file. This is mandatory:

- New page in `src/pages/` → update Architecture.
- New component or hook → update Architecture.
- New serverless function in `api/` → update Architecture.
- New Vercel environment variable → update the Firebase section.
- New package installed (after approval) → update No Wild Dependencies.
