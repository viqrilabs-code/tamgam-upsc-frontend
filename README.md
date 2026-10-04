# TamGam UPSC — frontend

Next.js 16 (static export, LLD D8) · React 19 · Tailwind CSS 4 · lucide icons.

## Run

```bash
npm install
cp .env.example .env.local      # points at the backend on http://localhost:8000
npm run dev                     # http://localhost:3000
```

Start the backend first (`uvicorn tamgam.app_local:app --port 8000` in `tamgam-upsc/backend`).

`npm run build` writes the static site to `out/`. In production, Firebase Hosting serves it and rewrites
`/api/**` to the `tamgam-api` Cloud Run service (`firebase.json`), so `NEXT_PUBLIC_API_BASE` stays empty and
the app runs on a single origin.

## Pages

| Route | What it does |
|---|---|
| `/` | Landing page |
| `/login` | Dev sign-in, with DPDP consent (Firebase Auth in production) |
| `/dashboard` | Streak, daily goal ring, score trend, quick starts, today's CA, chance meter, recent attempts |
| `/practice` | GS I–IV and PSIR · Prelims or Mains · sectional, topic, adaptive and timed modes · optional "generate from my own source" (topic-checked) · full Prelims (100 Qs) and Mains (250 marks) mocks |
| `/attempt?scope=&test=` | Test runner: timer, palette, confidence tags, flags, autosave (every 30 s or 10 answers), Mains writing and photo upload |
| `/result?scope=&attempt=` | Score, topic and format breakdown, filterable explanations, report button, Mains rubric feedback |
| `/current-affairs` | Daily cards by date and GS paper, plus the daily quiz |
| `/pyq` | Browse PYQs (reveal answers), topic heat map, option strategy with hold-out hit rates |
| `/notes` | Personalised Cornell topic notes; uploads of any size → detected chapters → pick one → 1–4 page note with cropped maps and diagrams → downloadable lite PDF |
| `/analytics` | Verdict narrative, gated chance band with disclaimer, weight × mastery grid, mastery, Mains readiness |
| `/help` | Raise complaints and follow the support thread |
| `/history` · `/plans` · `/profile` | Attempts, plans and checkout, profile with phone (OTP) verification and data export/delete |
| `/admin` | Overview, users (block, roles, plan grants), payments and refunds, complaints and question reports, library sources for GS and optional, newspaper uploads and story editing, review queue, jobs |

**Sign-in.** Name + avatar starts a *guest* session: every page shows what it offers, but using anything opens the
phone sign-in modal. Signing in with an Indian mobile number (OTP) replaces the guest session with the member
account tied to that number, so history follows the number across devices. "Login as Admin" on the sign-in page
asks for the registered admin email and password as well. Plan limits answer 402 and open an upgrade modal;
`/plans` runs Razorpay Checkout (loaded from checkout.razorpay.com) and verifies payments on the server.

## Design

The design mixes Gen Z energy with UPSC seriousness. The base is a calm "exam paper" cream (deep ink in dark
mode) with chunky "sticker" cards, a tricolour hairline and a 24-spoke chakra mark that doubles as the loading
spinner. Accents are chakra violet, saffron, India green and a lime highlight. Type is Bricolage Grotesque for
display, Inter for body and JetBrains Mono for numbers. Light and dark themes are both supported, and the
layout works on phones (bottom tab bar) and desktop (sidebar).
