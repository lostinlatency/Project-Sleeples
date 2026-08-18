# Project Sleepless

> This computer has not been online since 2005. One contact is still online.

Project Sleepless is an 8–12 minute, full-screen browser narrative that behaves like a recovered Windows XP home computer. Its folders, files, taskbar, windows, Start menu, MSN Messenger conversation, typing rhythm, authored branches, and one late webcam event all share the same server-owned story state.

The story contains 24 authored dialogue nodes. Every node offers three responses, while one decisive exchange branches into three complete routes: tell Sleepless the truth, impersonate Daniel, or refuse to answer. A normal playthrough visits 12 nodes. Recovered evidence unlocks stronger optional replies, each route has its own LTX monologue, and every route ends with a final three-way decision.

The default configuration is a complete deterministic demo. It needs no API keys, does not request the visitor's camera or microphone, and exercises the same Director, persistence, files, UI, and API contracts as live mode. The fictional portrait is an original project asset; the recovered beach photograph is a credited public-domain period source. This is a work of fiction.

## Quick start — mock mode

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
npm run secret
```

Copy the generated secret into `SESSION_SECRET` in `.env.local`, leave `SLEEPLESS_LTX_MODE=mock`, then run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then double-click **MSN Messenger 7.0** and **sleepless_17**. The complete story, webcam simulation, truth route, impersonation route, silence route, route-specific declines, and all endings work without credentials.

`SESSION_SECRET` has a development-only fallback in mock mode so a clean install still runs. Set a generated secret for persistent sessions and always set one in live or deployed environments.

## Architecture

```text
Authored player choice
  → pure Director reducer (phases, evidence locks, branches, endings)
  → route-specific Sleepless dialogue
  → MSN typing and fragment choreography
  → encrypted replacement session envelope
```

- `src/components` contains the client-only XP desktop, window manager, applications, MSN UI, audio, persistence, and webcam presentation.
- `src/stores/desktop-store.ts` uses Zustand for presentation state only. It cannot change narrative phases or unlock story files.
- `src/lib/director` contains the deterministic narrative state and reducer.
- `src/content/server` is server-only. Important file contents, character canon, and the 2005 world pack are never imported into client components.
- `src/lib/narrative/session-envelope.ts` encrypts and authenticates the server narrative state as an opaque JWE. IndexedDB stores the envelope; localStorage is only a fallback.
- `src/lib/ai` validates the three authored webcam performances before they reach Reactor.
- Route handlers parse typed Zod inputs, cap body size, return typed failures, and never expose prompts, provider output, or service keys.
- `src/lib/reactor` implements the installed `@reactor-models/ltx2@3.0.3` lifecycle with typed hooks and browser WebRTC tracks.

The browser can inspect the sanitized public view, but it cannot forge narrative state without invalidating the encrypted envelope. High-cost webcam events and turns carry idempotency keys; Reactor token issuance is limited per local session and scoped to one `reactor/ltx2` session.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `SESSION_SECRET` | Strong random secret used to derive the JWE encryption key. Generate with `npm run secret`. |
| `SLEEPLESS_LTX_MODE` | `mock` for the in-world local webcam simulation; `live` for Reactor WebRTC. |
| `REACTOR_API_KEY` | Server-only Reactor account API key used solely to mint scoped short-lived JWTs. |

Never prefix these values with `NEXT_PUBLIC_`. `.env.local` is gitignored.

## Live Reactor LTX webcam

Create a Reactor account and API key, then set:

```dotenv
SLEEPLESS_LTX_MODE=live
REACTOR_API_KEY=your_server_only_key
```

The app does not connect on page load or when MSN opens. Near the end of identity suspicion it writes the monologue first, asks the server for a JWT limited to `reactor/ltx2` with `max_sessions: 1`, and mounts `Ltx2Provider` only then. This follows Reactor's current [session-scoped token guidance](https://docs.reactor.inc/authentication). After Reactor reports ready, the browser uploads the fictional portrait with the documented [Blob → FileRef flow](https://docs.reactor.inc/concepts/file-uploads), applies the fixed performance prompt, script, seed, WPM, and script-derived duration, and only then tells the Director it may reveal the invitation.

Accept starts exactly one take. `main_video` and `main_audio` tracks are rendered in the 4:3 MSN panel. Completion, failure, decline, reset, navigation, and unmount tear down the session. The real visitor's webcam and microphone are never requested.

Reactor sessions can incur cost while alive. Late connection, one-token-per-playthrough control, one take, click locks, idempotent completion, and immediate disconnect are intentional cost controls.

### Replacing the fictional portrait

Replace `public/assets/avatars/sleepless_17.webp` with an original raster image at the same path. Use one clearly visible fictional adult, head and shoulders, stable 4:3 room/background, direct or near-direct monitor gaze, ordinary clothing, and neutral light. Avoid text, celebrity resemblance, face obstruction, dramatic motion, and horror styling. The included portrait is original and mock/live compatible.

## Commands

```bash
npm run dev        # local development
npm run build      # production-equivalent Next.js build
npm run start      # serve the production build
npm run lint       # ESLint
npm run typecheck  # strict TypeScript
npm run test       # Vitest unit + route-contract tests
npm run test:e2e   # Playwright user journeys
npm run secret     # generate SESSION_SECRET
```

Playwright covers desktop evidence, MSN group controls, reload restoration, corrupt-session recovery, all three complete routes, route-specific LTX completion, and webcam decline. Unit/integration tests enforce exactly 24 nodes, exactly three choices per node, valid graph links, unique choice IDs, 12-node playthroughs, three schema-valid LTX scripts, evidence locks, Director transitions, encryption/tamper rejection, route authorization, and idempotency.

## Deploying to Vercel

1. Push the repository to a private or public Git provider.
2. Import it in Vercel as a Next.js project.
3. Add a newly generated `SESSION_SECRET` to Production, Preview, and Development.
4. Keep `SLEEPLESS_LTX_MODE=mock` for a no-cost deploy, or add the Reactor credential and change it to `live`.
5. Deploy. No database, WebSocket server, persistent backend, or asset CDN is required.

The narrative envelope is stateless, so normal serverless horizontal scaling works. Local token mint rate control is deliberately best-effort without external infrastructure; Reactor's scoped one-session token is the durable cost boundary.

## Troubleshooting

- **No sound:** browsers gate audio until a gesture. Click the desktop or MSN, then use the tray speaker. If audio remains blocked, the story continues silently.
- **Reactor waits before invitation:** this is expected while its session, upload, and conditions become ready. The invitation is intentionally impossible to show before readiness.
- **Webcam generation fails:** the UI says the conversation could not be started, disconnects Reactor, records failure, and continues the authored text-only branch. It never claims video played when it did not.
- **Recovered session cannot be read:** a changed `SESSION_SECRET`, expired/tampered envelope, or version mismatch invalidates it. Use **Start → Reset recovered computer**.
- **Mobile is cramped:** rotate to landscape or use a larger screen. The desktop fills the available viewport.

External APIs, prices, limits, and authentication shapes can change. The lockfile and installed SDK TypeScript declarations are authoritative; verify them before upgrading Reactor or the AI SDK.

## Asset note

The interface does not ship a copied Microsoft or MSN asset pack. Application icons use local SVG assets from the period-compatible, open-licensed [Nuvola](https://commons.wikimedia.org/wiki/Nuvola) and [Tango Desktop](https://commons.wikimedia.org/wiki/Tango_icons) families; their individual source files retain embedded metadata where provided. Windows/MSN-era geometry and sounds are recreated with original CSS and Web Audio synthesis. Product names are used only to establish the fictional period interface.

`beach_2005.jpg` is a real public-domain photograph of Daytona Beach uploaded in June 2005 by MrMiscellanious; its [Wikimedia Commons source and public-domain declaration](https://commons.wikimedia.org/wiki/File:Daytona-Beach-FL-1.JPG) are preserved here for provenance. It is stored locally rather than hotlinked.
