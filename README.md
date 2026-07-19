# DMS — Digital Marketing Suite

A small suite of self-hosted tools for small businesses, built around a Node.js/Express backend
with a React landing page. The flagship tool sends a single message (with an optional image/PDF
attachment) to a list of phone numbers imported from an Excel file, over a WhatsApp Web QR-paired
session. Three more tools live alongside it on the **Products** page:

| Tool | Route | What it does |
|---|---|---|
| WhatsApp Bulk Sender | `/app.html` | Send one message to a list of numbers from Excel |
| Store Analyzer | `/store-analyzer` | Paste a store/website URL, get an instant SEO/quality audit with a score |
| Campaign Budget Planner | `/campaign-calculator` | Split a marketing budget across channels, see projected clicks/leads/cost |
| Social Content Scheduler | `/content-scheduler` | Draft and schedule social posts (with an image), ready to copy for manual posting |

Built for personal / small-business use — small batches, human-like delays, no external services.

> استخدم هذه الأداة بمسؤولية ووفق سياسات واتساب — لإرسال رسمي بحجم كبير استخدم WhatsApp Business API.
> Use this tool responsibly and in line with WhatsApp's policies — for large-scale official messaging, use the WhatsApp Business API.

## Requirements

- Node.js 22.5+ (Node 24 recommended; the project uses the built-in `node:sqlite`)
- A phone with WhatsApp installed, for the one-time QR scan
- Windows/macOS/Linux — whatsapp-web.js drives a bundled headless Chromium via Puppeteer

## Setup

```bash
npm install
cp .env.example .env   # optional — defaults already work out of the box
npm start
```

Open the printed URL (default `http://localhost:3000`) in your browser — this shows an introductory
landing page describing the tool. Click **"افتح الأداة / Open the Tool"** to go to the actual app
(`/app.html`), or open it directly.

If port 3000 is already used by something else on your machine, set `PORT` in `.env` to a free port.

There is no login screen. DMS is a single-owner toolkit meant to run privately (locally, on your own
VPS, or behind your own access control) — every request is attributed to one auto-provisioned owner
account under the hood, but nothing in the UI ever asks for credentials. Don't expose a deployment's
URL publicly: anyone who can reach it can send WhatsApp messages from your connected number.

## Production deployment

DMS cannot run the WhatsApp client as a Vercel Function. `whatsapp-web.js` needs a long-running
Chromium process plus persistent `sessions`, `data`, and `uploads` storage. Use one of these
supported layouts:

### Recommended: run the complete app as a container

The included `Dockerfile` serves both the React frontend and Express API from one origin:

```bash
docker build -t dms .
docker volume create dms-storage
docker run -d --name dms -p 3000:3000 \
  -v dms-storage:/var/lib/dms dms
```

The included `render.yaml` is ready for a Render Blueprint with a persistent disk. A VPS or another
container platform works too; keep the process running and mount `/var/lib/dms` persistently.

Render persistent disks require an always-on paid service; the free/sleeping service is not suitable
for Chromium, WhatsApp sessions, SQLite, or uploaded media. Review the provider's price before
creating the service.

### Optional: Vercel frontend + persistent backend

1. Deploy the Docker backend first.
2. On the backend, set `FRONTEND_ORIGINS` and `PUBLIC_APP_URL` to the exact Vercel URL.
3. In Vercel, set the build variable `DMS_API_BASE_URL` to the backend HTTPS URL and redeploy.

`vercel.json` now builds the frontend and rewrites all React routes. If `DMS_API_BASE_URL` is not
set, the UI clearly reports that the backend is not connected instead of displaying an empty QR box.

Since there's no login/session cookie, split-origin mode has no browser cross-site cookie caveats to
worry about — it's a plain cross-origin API call. Note the security tradeoff from "Access model"
above still applies: whoever can reach the Vercel URL can reach the backend's write endpoints too.

## First run — connecting WhatsApp

1. Step 1 on the app page (`/app.html`) shows a QR code.
2. On your phone: **WhatsApp → Linked devices → Link a device**, then scan it.
3. Once connected, the badge turns green and shows your WhatsApp number.
4. The session is stored in `/sessions` (via whatsapp-web.js `LocalAuth`), so you only need
   to scan once — restarting the server reuses the saved session.
5. Use **Logout** on the page to clear the session and force a fresh QR scan (e.g. to switch numbers).

## Expected Excel format

The first sheet of the uploaded file is used. The phone column is auto-detected (case-insensitive,
Arabic or English header), so no fixed template is required:

| Accepted phone headers | Accepted name headers (optional) |
|---|---|
| `Phone`, `رقم`, `Mobile`, `Number`, `Tel`, `هاتف`, `جوال`, `رقم الجوال`, `رقم الهاتف` | `Name`, `اسم`, `الاسم` |

Example (see `templates/sample-template.xlsx` for a ready-to-copy file):

| Name           | Phone         |
|----------------|---------------|
| أحمد علي        | 0501234567    |
| Sara Ahmed     | 966512345678  |
| محمد سالم       | 0555555555    |

Number normalization rules:
- Spaces, dashes, parentheses and a leading `+` are stripped.
- A number starting with `0` is treated as a local number and the leading `0` is replaced with
  the default country code (`DEFAULT_COUNTRY_CODE`, default `966` for Saudi Arabia — configurable
  per upload from the UI, or via `.env`).
- The final number must be digits only, 10–15 digits long, otherwise the row is reported as invalid
  with a reason (e.g. "Row 12: invalid length").
- Duplicate numbers (after normalization) are automatically de-duplicated so the same person is
  never messaged twice in one run.

The optional `Name` column is used to personalize the message via a `{name}` placeholder
(falls back to an empty string if there's no name for a row, or no name column at all).

## Sending a message

1. **Step 2** — upload the Excel file, review the valid/invalid/duplicate counts and the list of
   rejected rows. Click **"Save as List"** to save the current recipient list under a name for reuse
   later without re-uploading — saved lists show above the upload area; click a name to load it, `✕`
   to delete it. Stored in `data/contact-lists.json`.
2. **Step 3** — write the message (use `{name}` anywhere you want the recipient's name inserted),
   optionally attach one image or PDF. A live preview is shown. Click **"Save as Template"** to save
   the current message (and attachment, if any) under a name for reuse later — saved templates show
   as a list above the message box; click a template's name to load it, or the `✕` to delete it.
   Templates are stored in `data/message-templates.json` and are available to the signed-in DMS
   owner.
3. **Step 4** — click Send. Sending happens in the background:
   - A random delay (`MIN_DELAY_MS`–`MAX_DELAY_MS`, default 3–8s) between messages.
   - A longer pause (`BATCH_PAUSE_MS`, default 45s) after every `BATCH_SIZE` messages (default 20).
   - Each number is checked with WhatsApp before sending; numbers not on WhatsApp are skipped and
     logged as `not_on_whatsapp` instead of failing the run.
   - Any per-message error is caught and logged — one failure never stops the batch.
   - You can hit **Cancel** at any time; the current message finishes, then sending stops.
4. When done, download the results as an Excel file (number, name, status, error, timestamp) with
   **Download Results**.

### Campaign history

Every past send appears in the **Send History** section at the bottom of the page — total
recipients, sent/failed/not-on-WhatsApp counts, and per-batch actions:
- **Download** — same results Excel as above, for that specific past batch.
- **Retry Failed** — only shown when a batch has failures; loads just the numbers that genuinely
  failed (not the ones skipped as `not_on_whatsapp`, which retrying won't fix) straight into Step 3,
  skipping re-upload entirely.

This is computed on the fly from `data/logs.json` — no separate storage.

Every send attempt is also appended to `data/logs.json` for audit purposes, independent of what's
shown on screen.

## Safety limits (not configurable away)

- Hard cap of **500 valid numbers** per upload/send — this tool is for small-batch sending, not
  mass messaging.
- Minimum delay between messages is floored at **2 seconds** even if `MIN_DELAY_MS` is misconfigured.

### On WhatsApp bans — there's no officially "safe" number

This tool automates WhatsApp Web, which WhatsApp's Terms of Service don't permit for bulk/automated
messaging regardless of volume — there's no published safe threshold because it isn't an approved
use case at all. From community experience with this kind of automation:

- **Recipient complaints/blocks are the dominant risk factor, not raw volume.** Messaging people who
  already expect to hear from you is far safer than a cold/purchased list, even at the same size.
- New or lightly-used numbers: stay well under 50–100 messages/day for the first few weeks.
- Established numbers with real usage history and WhatsApp Business: some report ~200–300/day as
  lower-risk, but this isn't guaranteed — WhatsApp's detection logic isn't public and changes.
- The delays, batching, and 500-number cap here are conservative defaults, not a guarantee.

None of this is a substitute for the WhatsApp Business API for anything beyond small-batch personal
or small-business use, which is exactly what the disclaimer in the UI footer says.

## Configuration (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | HTTP port for the app |
| `DEFAULT_COUNTRY_CODE` | `966` | Country code prefix used for numbers starting with `0` |
| `MIN_DELAY_MS` | `3000` | Minimum delay between messages (floored at 2000ms) |
| `MAX_DELAY_MS` | `8000` | Maximum delay between messages |
| `BATCH_SIZE` | `20` | Messages sent before a longer pause |
| `BATCH_PAUSE_MS` | `45000` | Pause duration between batches |
| `STORAGE_DIR` | project directory | Persistent root for `data`, `sessions`, and `uploads` |
| `FRONTEND_ORIGINS` | *(empty)* | Comma-separated frontend origins allowed to call a separate backend |
| `PUBLIC_APP_URL` | first frontend origin | Browser URL used after Meta OAuth redirects |
| `TRUST_PROXY` | `false` | Trust one reverse proxy for client IP/HTTPS detection; Render sets this automatically |
| `DMS_DISABLE_WHATSAPP` | `false` | Disable Chromium/WhatsApp only for tests or diagnostics |
| `META_APP_ID` / `META_APP_SECRET` | *(empty)* | Your own Meta app credentials — see Social Content Scheduler below |
| `META_REDIRECT_URI` | *(empty)* | Must match a Valid OAuth Redirect URI on your Meta app |
| `META_GRAPH_VERSION` | `v25.0` | Meta Graph API version used for OAuth and publishing |
| `META_PUBLIC_BASE_URL` | *(empty)* | Public HTTPS URL for this server; required for Instagram publishing only |
| `MEDIA_SIGNING_SECRET` | `META_APP_SECRET` | HMAC secret for short-lived Instagram image links |
| `DMS_API_BASE_URL` | *(same origin)* | Build-time backend URL when the Vercel frontend is separate |

## Store Analyzer

Paste a store or website URL (`/store-analyzer`). The server fetches the page itself (no API keys
needed) and runs a heuristic audit, returning a 0–100 score broken down into four categories
(**SEO, Technical, Trust, Social**) plus a severity-ranked list of recommendations:

- `noindex` meta tag (flagged prominently — it means the page can't be found on Google at all),
  canonical tag, structured data (Schema.org/JSON-LD), `robots.txt` presence, external script count
- HTTPS usage, page title/meta description quality, mobile viewport tag, Open Graph tags, favicon
- H1 heading count, image alt-text coverage, word count
- Detected social media links and visible contact info (email/phone)
- Detected e-commerce/CMS platform (Salla, Zid, Shopify, WooCommerce, WordPress, Wix)
- Page size and response time

Every analysis is saved to a per-site **history** (`data/store-analyses.json`); re-analyzing the
same host shows the score delta since the last run (e.g. "+7 points since last analysis"), and the
history list is exportable as Excel.

Internal/private addresses (localhost, 127.0.0.1, private IP ranges) are rejected to avoid the
server being used to probe your own network.

**Real Google PageSpeed Insights scoring (optional):** set `GOOGLE_PAGESPEED_API_KEY` in `.env` and
every analysis additionally calls Google's own PageSpeed Insights API (`server/pageSpeed.js`) —
the same Lighthouse run and Core Web Vitals thresholds as pagespeed.web.dev, not an approximation:
Performance/SEO/Accessibility/Best Practices scores (0–100, mobile by default with a Desktop toggle
that fetches on demand via `POST /api/store-analysis/pagespeed`), LCP/CLS/TBT/FCP/Speed
Index/TTFB each rated good/needs-improvement/poor against Google's published thresholds, a ranked
**Opportunities** list (the specific fixes with the biggest estimated time savings — unused
JS/CSS, unminified assets, next-gen image formats, etc.), a pass/fail **Core Web Vitals
Assessment** banner when Google has real Chrome-user (CrUX) field data for that origin, and the
field data itself when available. Both PSI routes are rate-limited (20 requests / 15 min / IP) —
this site has no login, and a configured key has a metered daily quota (free tier: 25,000
requests/day) an anonymous visitor could otherwise burn through. Get a free key at
console.cloud.google.com (enable "PageSpeed Insights API" → Credentials → Create API Key). Leave
it unset and Store Analyzer works exactly as before — the PSI card just doesn't render. A PSI
call routinely takes 20–45s (mobile runs a simulated throttled connection, so it's slower than
desktop) and runs independently of the heuristic scan above, so a slow or failed PSI request
never blocks or breaks the rest of the report.

API: `POST /api/store-analysis/analyze` with `{ "url": "..." }`, `POST /api/store-analysis/pagespeed`
with `{ "url": "...", "strategy": "mobile" | "desktop" }` (PSI-only re-fetch for the Desktop toggle),
`GET /api/store-analysis/history`, `GET /api/store-analysis/history.xlsx`.

## Campaign Budget Planner

A budgeting/planning tool (`/campaign-calculator`) — enter a total budget, campaign duration, and
average order value (AOV), then split the budget across channels with **per-channel** CPC and
conversion-rate assumptions (defaults differ per channel — Google Ads costs more per click than
TikTok, for example, which a single global assumption can't represent). It projects, per channel
and overall: clicks, leads, cost-per-lead, **projected revenue and ROAS**, plus a **weekly budget
pacing table** for the campaign's duration.

Plans can be **named and saved** (`data/campaign-plans.json`) for later comparison, reloaded back
into the form, or exported as an Excel breakdown per plan.

API: `GET/POST /api/campaign-plans`, `DELETE /api/campaign-plans/:id`, `GET /api/campaign-plans/:id/export.xlsx`.

## Landing page (`/`)

The home page (`landing-src/src/pages/Home.tsx`) has a language toggle (`EN`/`عربي` button in the
nav) that switches the whole landing page + Products page between Arabic and English, sets
`dir="rtl"`/`"ltr"` on `<html>`, and remembers the choice in `localStorage`. It's implemented via
`LanguageContext` (`landing-src/src/context/LanguageContext.tsx`) — the four tool pages themselves
(WhatsApp Sender, Store Analyzer, Campaign Calculator, Content Scheduler) still show Arabic and
English together inline everywhere rather than toggling, that's a separate, larger job.

Below the hero, each of the four tools gets its own card with a plain-language explanation and a
button straight into it. Below that is a contact form (name, phone/WhatsApp, optional email/message)
that posts to `POST /api/leads`, rate-limited to 10 submissions per IP per 15 minutes. Submissions
are appended to `data/leads.json` — there is no API route to read them back (leads can include
personal contact info, and per the access model above nothing on this server requires a login), so
view them by reading that file directly on the server (SSH/Docker exec/Render shell).

Each new lead is also emailed to `LEAD_NOTIFY_EMAIL` (`info@dms1t.com` by default) via `server/mailer.js`,
**once you configure SMTP** — set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in `.env` (see
`.env.example`). Until `SMTP_HOST` is set, email sending stays inert and leads only save to
`data/leads.json`, same as before. Email failures never block the form — the lead is already saved
by the time the email is attempted, and a send failure is only logged server-side.

A floating WhatsApp button (bottom-right, every page) opens a chat with `+966509095816` via
`wa.me` — the number lives in `landing-src/src/components/WhatsAppFloatButton.tsx`.

## Access model

There is no login screen — DMS has no accounts to register or sign into. Every request is attributed
to one auto-provisioned owner row in `data/app.db` (SQLite via Node's built-in `node:sqlite`), created
automatically the first time the server handles a request. WhatsApp sessions, recipient lists, send
history, uploaded media, store reports, campaign plans, and the Content Scheduler's posts and Meta
connection are all scoped to that one owner internally, but nothing in the app ever asks who you are.

Because of this, **DMS is meant to run somewhere only you can reach it** — locally, on a private VPS,
or behind your own network/reverse-proxy access control. Do not put a public URL in front of it:
anyone who can load the page can send WhatsApp messages from your connected number, read your saved
lists/history, and use your connected Facebook/Instagram account.

## Social Content Scheduler

Draft and schedule social media posts (`/content-scheduler`) for Instagram, Facebook, X/Twitter,
TikTok, LinkedIn, or Snapchat — caption (with a live, platform-aware character-limit counter),
optional image, and a scheduled date/time — private to your account (see Accounts above).

- **Multi-platform compose**: select several platforms at once to create one post per platform from
  a single caption/schedule/image.
- **Edit** an existing post (caption, platform, schedule, or replace its image), not just its status.
- **List or calendar view** — the calendar shows a month grid with each day's posts as colored chips;
  clicking one opens it for editing.
- Posts past their scheduled time and still marked "scheduled" are flagged **Overdue**; a stats bar
  shows scheduled/due-soon/overdue counts at a glance.
- Export the whole schedule as Excel.
- One-click **copy caption** for any post, for pasting into a platform manually.

API: `GET/POST /api/content/posts`, `PATCH/DELETE /api/content/posts/:id`,
`GET /api/content/posts/export.xlsx`. Images are uploaded via the same `/api/media/upload` endpoint
used by the WhatsApp tool and previewed from `/uploads/...`.

### Real publishing to Facebook & Instagram

For **Facebook Pages and Instagram Business accounts**, the scheduler can actually publish — no
copy/paste needed — once you connect your own account via Facebook Login. This is a real OAuth
integration against Meta's Graph API, not a mock.

**What works today:** publishing a normal feed post (text and/or one image) to a connected Facebook
Page, and to a connected Instagram Business account if the post has an image (Instagram's API has no
text-only post type).

**What's not built yet:** Stories, Reels, TikTok, LinkedIn, X/Twitter, and Snapchat direct
publishing. Each of those is effectively a separate integration with its own API, its own review
process, and — for TikTok and Snapchat especially — access that's largely restricted to approved
partner apps. Feed publishing on Meta was the deliberate starting point; the others remain
copy/paste-to-publish for now.

**Setup — you need your own Meta app; nobody can hand you one:**

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App**
   → choose "Business" as the type.
2. In the app dashboard, add the **Facebook Login for Business** and **Instagram Graph API**
   products.
3. Under **Facebook Login → Settings**, add a **Valid OAuth Redirect URI** matching exactly what
   you'll put in `META_REDIRECT_URI` below (e.g. `http://localhost:3000/api/meta/callback`).
4. Copy the **App ID** and **App Secret** from **Settings → Basic** into `.env`:
   ```
   META_APP_ID=...
   META_APP_SECRET=...
   META_REDIRECT_URI=http://localhost:3000/api/meta/callback
   ```
5. Make sure your Facebook account is added as an **Admin/Developer/Tester** under **App Roles** —
   while the app is in Development Mode, its own admins/developers/testers can use the requested
   permissions on their own Pages/Instagram accounts without needing Meta's full App Review. App
   Review is only required to let *other* people use the app — for a personal/single-business tool
   like this, you likely don't need it at all.
6. Your Instagram account must be a **Business or Creator account linked to a Facebook Page** — a
   personal Instagram account can't be published to via this API, that's a Meta platform rule, not
   a limitation of this tool.
7. Restart the server, open the Content Scheduler, and click **"Login with Facebook"** under
   Connected Accounts.

**The Instagram catch:** Instagram's publishing API doesn't accept an uploaded file directly — it
fetches the image itself from a URL you give it. `http://localhost:...` isn't reachable from Meta's
servers, so Instagram publishing needs `META_PUBLIC_BASE_URL` set to a real public HTTPS address
(a quick way to get one for testing: `ngrok http 3000`, or deploy the app for real). Without it,
Instagram publish attempts fail with a clear error telling you exactly that. **Facebook Page posts
don't have this problem** — the image is uploaded directly, so Facebook publishing works from
localhost with no public URL required.

DMS does not expose the private uploads folder to Meta. It creates a ten-minute HMAC-signed image
URL for each Instagram publish request; set `MEDIA_SIGNING_SECRET` explicitly or let it reuse
`META_APP_SECRET`.

API: `GET /api/meta/status`, `GET /api/meta/auth` (starts login), `GET /api/meta/callback` (OAuth
redirect target), `POST /api/meta/disconnect`, `POST /api/content/posts/:id/publish`.

**Important — what "Connect" actually requires:** it only works for accounts you've added as an
Admin/Developer/Tester on your own Meta app (step 5 above). It does **not** let a random stranger
connect *their* Facebook Page. Meta only allows that once your app has been granted
**Advanced Access** through **App Review** for `pages_manage_posts` and `instagram_content_publish` —
which requires:
- The app deployed at a real public HTTPS URL (not `localhost`)
- A published Privacy Policy URL and Data Deletion Instructions URL, set in the app's Meta settings
- A screencast showing each requested permission in actual use
- Submitting for review and waiting — commonly days to a few weeks, and not guaranteed to be approved
  on the first attempt

None of that can be done on your behalf — it needs your own Meta account, your own hosted app, and
Meta's manual review. Until it's approved, "Connect" will work only for accounts added as a Tester
on the Meta app, and fail with a permissions error for anyone else.

## Project structure

```
server/
  index.js                  Express app — routes, static files, SPA fallback for React Router
  config.js                 Env-based configuration (delays, batch size, country code, hard caps)
  whatsapp.js                whatsapp-web.js client (QR, status, logout)
  excel.js                   Excel parsing, phone normalization, column auto-detection
  sendEngine.js               Background bulk-send queue (delays, batching, cancel, results export)
  templateStore.js             WhatsApp message templates: CRUD over data/message-templates.json
  contactListStore.js           WhatsApp saved contact lists: CRUD over data/contact-lists.json
  leadStore.js                   Landing page contact form submissions: data/leads.json
  mailer.js                      Emails new leads via SMTP (inert until SMTP_HOST is set)
  sendHistory.js                  WhatsApp campaign history: aggregates data/logs.json by batch
  storeAnalyzer.js             Store Analyzer: fetch + parse + category-scored audit of a URL
  pageSpeed.js                   Store Analyzer: real Google PageSpeed Insights scoring (optional)
  storeAnalysisHistory.js       Store Analyzer: per-host analysis history + score delta
  campaignPlanStore.js           Campaign Budget Planner: CRUD over data/campaign-plans.json + Excel export
  database.js                     SQLite setup (data/app.db) — users, meta_connections, content_posts
  auth.js                          Auto-provisions the single owner row (no login/passwords)
  contentStore.js                    Social Content Scheduler: per-user CRUD over SQLite
  metaAuth.js                         Meta OAuth login, token exchange, Pages/IG lookup — per-user connection storage
  metaPublish.js                       Facebook Page + Instagram Graph API publish calls
  jsonStore.js                          Generic JSON-array file store used by db.js and the other *Store modules
  db.js                                  WhatsApp send audit log (data/logs.json)
public/       Served as-is by Express — this is what actually runs
              index.html + assets/ = built landing page (see landing-src/ below)
              app.html, app.js, style.css = the WhatsApp Bulk Sender tool (plain JS, RTL Arabic + English)
landing-src/  Source for the landing page (React + TypeScript + Tailwind + Vite + React Router) —
              not served directly; its build output is copied into public/
  src/pages/    Home, Products, StoreAnalyzer, CampaignCalculator, ContentScheduler
  src/components/  Shared Nav, Logo, PageShell, BackLink, WhatsAppFloatButton
  src/context/     LanguageContext (AR/EN toggle, persisted, sets html dir/lang)
uploads/      Temporary Excel files and message/post attachments (gitignored)
sessions/     whatsapp-web.js LocalAuth session data (gitignored)
data/         app.db (SQLite — owner row, meta connections, content posts), logs.json,
              store-analyses.json, campaign-plans.json, message-templates.json, contact-lists.json,
              leads.json — all gitignored (app.db holds live Meta access tokens)
templates/    Sample Excel template
```

### Editing the landing page

The landing page (`public/index.html` + `public/assets/`) is a compiled React/Vite app; its
source lives in `landing-src/` and isn't served directly. To change it:

```bash
cd landing-src
npm install      # first time only
npm run build    # builds and copies the output into ../public
```

The build script only replaces `public/index.html` and fully replaces `public/assets/` — it never
touches `app.html`, `app.js`, or `style.css`, which belong to the WhatsApp tool itself. For
live-editing with hot reload, run `npm run dev` inside `landing-src` (serves on its own Vite dev
port; the "Open Tool" link there points to the main app's `/app.html`, and API calls from
Store Analyzer/Campaign Calculator/Content Scheduler hit relative `/api/...` paths, so run the main
Express server too if you want those to work while developing).

It's a client-side routed (React Router) app with one shared JS bundle for `/`, `/products`,
`/store-analyzer`, `/campaign-calculator`, and `/content-scheduler` — Express serves `index.html`
for any of these paths that isn't a real static file or `/api/...` route, and the router takes over
from there.

## Troubleshooting

- **QR code doesn't appear / status stuck on "Disconnected"**: check the server console for
  Puppeteer/Chromium errors; whatsapp-web.js needs to launch a local Chromium instance.
- **"Port already in use"**: another process is using the configured port — change `PORT` in `.env`.
- **Numbers marked `not_on_whatsapp`**: the number is valid but has no WhatsApp account registered.
- **Attachment not sending**: only one image or PDF per send is supported, up to 16MB.
- **Store Analyzer fails on a URL**: the target site may block bot-like requests, be down, or take
  longer than 8 seconds to respond; internal/private addresses are rejected on purpose.
