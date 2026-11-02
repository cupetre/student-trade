# Sidro / Anchor — Design

The rules for how Sidro (Anchor in English) looks, reads and behaves. Check this before building a page; update it whenever a rule changes (in the same commit as the code).

_Last updated: 2 November 2026_

---

## 1. What we are

**One-liner:** Find a room, furnish it and settle in — with verified students and checked landlords only.

**Name: Sidro in Slovenian, Anchor in English** (was "Kampus" briefly, and "Student Trade" before 2 Nov 2026). The name follows the language: public pages switch with the SL/EN button; the logged-in pages are English for now, so they say Anchor, and so do the confirmation email and server messages. The names live in one place, `client/src/lib/brand.js` (`BRAND_NAMES`, `brandFor(lang)`, `BRAND` = Anchor). In Slovenian the name declines like a noun: _Sidro_, _Sidra_ (after a negation: "Sidra ne morete uporabljati"). Check the .si/.com domains and trademarks before printing anything.

A student platform for Slovenia (starting in Koper / University of Primorska, then Ljubljana and Maribor). One account, three platforms:

| Platform | What it is | Status |
|---|---|---|
| **Housing** | Rooms, flats, sublets, "roommate wanted". Every listing is checked by a person before it goes live. Students message landlords with their rental profile attached. | Live |
| **Marketplace** | Second-hand furniture, books, tech, bikes between students. | Live |
| **Settle In** (SL: _Udomači se_, name not final) | Student deals, help with documents (address registration, residence permit), bank/SIM/transport, guide to Slovenia, community. | Coming soon (placeholder page) |

Shared across all three: in-app messaging (phone number stays private), verified profiles and reviews, reporting.

**Who it's for**
1. **Main:** students moving to Slovenia — from abroad (Erasmus, full-degree) or another city.
2. **Students already here:** sell, sublet, find flatmates. They are the supply side.
3. **Landlords and agencies:** list places for verified students. Housing only.
4. **Partners:** student organisations, ESN/Erasmus groups, international offices (distribution, free); local businesses and brands (student deals, paid).

**Why us:** Facebook groups and classifieds have volume but no verification and plenty of scams; student-housing sites only do bookings. We combine verified students, checked housing, a second-hand marketplace and relocation help, run locally by students who went through the move.

---

## 2. Colour — "Nordic Stone"

Steel blue, stone beige and off-white, with **raspberry** as the one loud colour.

| Token | Hex | Use |
|---|---|---|
| Ink | `#1B2A41` | Text, dark bands (trust strip, partner band), footer, active tab |
| Off-white | `#FAF7F0` | Page background |
| White | `#FFFFFF` | Top bar, cards, alternate sections |
| Stone beige | `#DDD4C5` | Lines, borders, quiet surfaces |
| Steel blue | `#3C6E91` | Main buttons, links, small labels (eyebrows, kickers) |
| Steel blue dark | `#2F5875` | Hover on blue, blue text on light blue |
| Light blue | `#D5E3EC` | Chips, "Live" tags, info, chat section background |
| Muted | `#5D6470` | Secondary text (only on white/off-white, never on beige) |
| **Raspberry** | `#C2305A` | **Attention only** — see rule below. Text on it is white. |
| Raspberry dark | `#A82650` | Hover on raspberry |

**The attention rule:** raspberry marks the one thing on a screen we want people to act on or notice — Sign up, Create account, Become a partner, "New", unread counts, focus outlines. At most one raspberry button per screen. Everything else uses steel blue or ink.

**Contrast:** body text must pass 4.5:1. All pairs above were checked; muted text fails on beige, so don't put it there.

**Where the values live today** (duplicated — see Open items):
- `client/src/Pages/LandingPage.css` → `--lp-*` variables
- `client/src/components/AppNav.css` → `--an-*`
- `client/src/Pages/housing/Housing.css` → `--hs-*`
- `client/src/Pages/SettleInPage.css`, `App.css`, `ChatPage.css`, `ProfilePage.css` → hard-coded

---

## 3. Type, shape, spacing

- **Headings:** Bricolage Grotesque (Google Fonts, weights 600 and 800), tight letter-spacing (−0.02em). Page titles 28–46px, `clamp()` for responsive sizes.
- **Body:** system font stack (`system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`), 15–18px, line-height ~1.5.
- **Eyebrows / kickers:** 13–14px, bold, uppercase, letter-spacing 0.08em, steel blue.
- **Corners:** buttons and inputs 10–12px; cards 14–24px; tags and pills fully round.
- **Touch targets:** at least 44px for anything clickable (icon buttons included).
- **Focus:** 3px raspberry outline, 2px offset, on every interactive element.
- **Motion:** short and calm (150–450ms). Everything respects `prefers-reduced-motion` (no animation, chat demo shows all messages at once).

---

## 4. Components

**Buttons**
- **Primary:** steel blue, white bold text.
- **Attention:** raspberry, white text. Sign-up type actions only.
- **Ink:** dark ink, light text (e.g. "Create a landlord account").
- **Quiet:** white with beige border.
- **Link button:** underlined blue text, for secondary actions ("Or leave your details").

**Status tags** — be honest: a feature is "Live" only once it ships.
- **Live:** light blue background, ink text.
- **Soon:** transparent, dashed border.

**Logo (`components/Logo.jsx`)** — a white anchor on a rounded ink tile, its ring in raspberry, next to the name (Sidro / Anchor, passed as `name`) in Bricolage Grotesque. The favicon (`client/public/favicon.svg`) is the same mark. On phones the bars show the mark only.

**Top bars** — `PublicNav` for everyone logged out (landing, log in, sign up, email confirmation) and `AppNav` for every logged-in page. See section 5.

**Auth pages (`components/AuthShell.jsx`)** — `PublicNav` + "Back to the homepage" + one white card. The two sign-up pages add a **Student / Landlord or agency** switch at the top of the card and an ink side panel ("What you get as…") that links to that side's explainer on the landing page. Student panel on the left, landlord panel on the right, as on the landing page; on phones the form comes first. Behind it, the three landing scenes (room, desk, map) sit side by side, faded and blended into each other, with a calm area in the middle so the form stays readable; the background doesn't slide with the page.

**Housing tabs (`HousingTabs`)** — Browse · Saved · My listings · My stays (landlords: Browse · My listings). "Post a place" lives in the top bar, not in the tabs.

**Marketplace tabs (`MarketTabs`)** — Browse · My items. "Sell an item" lives in the top bar. No "Saved" tab until the server can save items.

**One layout for both platforms** — Housing and the Marketplace share the same building blocks (`hs-` classes in `Housing.css`); the marketplace only adds what differs (`Pages/marketplace/Market.css`, `mk-`):
- **Browse:** tabs → page header → filter box → results bar (count, Clear filters, Sort) → card grid. Filters live in the address (`?q=lamp&max=20&sort=price_asc`) so a search can be shared and the back button works. Text and number boxes keep their own value while typing and update the address after a short pause.
- **Card:** photo (4:3, cropped), price, title, one meta line (marketplace: seller's avatar, name and when it was posted).
- **Item / listing page:** photo, title, description on the left; price and actions, owner panel, safety tips and Report on the right. The owner sees Edit / Delete instead of Message.
- **Form page** (post / sell / edit): fields on the left, live card preview on the right. Replaces the old pop-ups.
- **Messages (`/chatpage`, `ch-`):** conversation list (newest activity first, last message as a preview, a raspberry dot for new messages) and the open conversation side by side; on phones one at a time with a back arrow. The open conversation is in the address (`?chatId=12`). Messages are grouped by day; mine are steel blue on the right, theirs white on the left. Enter sends, Shift+Enter adds a line. When there are no conversations at all, the page shows one empty state with links to the marketplace and housing (landlords: My places) instead of two empty panes. Reviews are left from the conversation in a dialog using the shared star input.
- **My profile (`/profilepage`, `mp-`):** card with photo, name, Verified student / landlord tag, member since, email and bio; editing happens in the same card. Reviews about you below. On the right: rental profile status (students), shortcuts with counts (My items, My places, Saved places, My stays, Messages) and "How others see you".
- **"My" list:** one row per item with thumbnail, title, details and actions; Delete asks "Delete for good?" inline. After saving or deleting, a green message confirms what happened.

**Page header** — eyebrow (optional), H1, one line of explanation in muted text.

**Empty states** — say what's missing and give the next step ("You haven't posted anything yet" + Post a place).

**"Coming soon" pages** — list what's coming with Soon tags and link back to what already works (see `SettleInPage.jsx`).

**CSS class prefixes** — Vite loads all CSS globally, so each area uses its own prefix:
`lp-` landing · `pn-` public top bar · `appnav-` logged-in top bar · `auth-` log in / sign up / confirmation · `brand-` logo · `hs-` housing and profile pages · `si-` Settle In · `mk-` marketplace additions · `ch-` messages · `mp-` my profile · `loc-` map pin picker.

---

## 5. Navigation and roles

**Top bar (logged in)**
- Left: logo → the user's home (students `/marketplace`, landlords `/housing/mine`).
- Students: platform switch **Marketplace · Housing · Settle In (Soon)**; the current one is raised in white.
- Landlords: no switch, a "Housing · for landlords" tag instead.
- Right: context button (**Sell an item** on the marketplace, **Post a place** on housing, none elsewhere) · Messages icon · account menu.
- Account menu: My profile · Rental profile (students) · How others see me · _Marketplace:_ My items (students) · _Housing:_ My places · Saved places (students) · My stays (students) · Log out.
- Phones (≤720px): the switch drops to its own full-width row; name and "Soon" tag hide.
- No search in the top bar. Search lives inside each platform's page.

**Top bar (logged out, `PublicNav`)** — the same bar on the landing page, log in, both sign-ups and email confirmation, so the same buttons are always in the same place.
- Logo → the landing page (on the landing page it scrolls to the top).
- Section links: Housing, Marketplace, Settle In → the matching lane on the landing page; For landlords → opens the landlord explainer (`/#for-landlords`); Partners → the partner band. From another page they go to the landing page and it scrolls there.
- SL/EN switch (shared with every public page, `lib/language.js`), Log in (underlined when you're on it), **Sign up** (raspberry; turns quiet while you're on a sign-up page).
- Phones (≤760px): section links hide, logo shows the mark only.

**Page transitions (`components/PageSlide.jsx`)** — each page has a step in the visitor's journey: landing 0 → log in 1 → sign up 2 → landlord sign-up 3 → email confirmation 4 → the app 10. Going to a higher step slides the content in from the right, a lower step from the left; same step, no animation (e.g. moving inside the app). Only the content slides — the top bars stay still. No animation with reduced motion.

**Tab titles (`components/RouteTitle.jsx`)** — public pages follow the language ("Prijava · Sidro" / "Log in · Anchor"; the landing page is just the name); logged-in pages are "Housing · Anchor" and so on.

**Getting into the app**
- Guests who open Housing or the Marketplace (from the landing columns or a link) go to log in, which says what they were trying to open ("Log in to see the marketplace.") and takes them there afterwards.
- Log in links to both sign-ups; each sign-up links to log in and to the other sign-up (the switch at the top).
- After log in: students → `/marketplace`, landlords → `/housing/mine`. Log out → log in (slides back from the left).

**Routes**

| Path | Who | Notes |
|---|---|---|
| `/` | everyone | Landing page for visitors; logged-in users are sent to `/marketplace` |
| `/marketplace` | students | Browse. Landlords are sent to `/housing/mine` (all marketplace pages) |
| `/marketplace/:id`, `/marketplace/new`, `/marketplace/mine`, `/marketplace/:id/edit` | students | Item page · Sell an item · My items · Edit (owner only) |
| `/housing`, `/housing/:id`, `/housing/mine`, `/housing/new`, `/housing/:id/edit` | students + landlords | |
| `/housing/saved`, `/housing/stays` | students | |
| `/settle-in` | students | Placeholder until built |
| `/profile/student` (rental profile) | students | |
| `/chatpage`, `/profilepage`, `/users/:id` | students + landlords | |
| `/login`, `/register`, `/register/landlord` | logged out | Logged-in users go to `/` |
| `/verify-pending`, `/verify-email` | everyone | Email confirmation |

**Guards** (`components/RouteGuards.jsx`): `RequireAuth` (must be logged in), `StudentOnly` (landlords → `/housing/mine`), `PublicOnly`, `HomeSwitch`. Home paths are the constants `STUDENT_HOME` and `LANDLORD_HOME`.

The logged-in user's profile is loaded once per login and shared (`lib/useCurrentUser.js`). Call `refreshCurrentUser()` after the user changes their own name or photo.

---

### Maps

Housing listings have a map location; the Marketplace doesn't need one.
- **Two points per listing** (`server/lib/location.js`): the exact pin (`latitude`, `longitude`), sent back only to the owner as `exact_location`, and a public point (`public_latitude`, `public_longitude`) moved a random 80–200 m, sent to everyone as `location` (`approximate: true`). Maps show the public point as an area of about 200 m, never the building. The public point is made once and kept until the exact pin moves, so saving again can't reveal the real spot.
- **Placing the pin** (`components/LocationPicker.jsx`, step "Address & dates" of the listing form): when the owner leaves the address fields, the address is looked up once and the pin appears; they can drag it, click the map, use "Pin the middle of the map" (keyboard users), find the address again or remove the pin. If there's no pin when they save, the server looks up the address itself. If the address changes without a new pin, the location is looked up again.
- **Looking up addresses** (`server/lib/geocode.js`, `GET /api/housing/geocode`): OpenStreetMap's free Nominatim for now — one request at a time, at least 1.1 s apart, answers cached, 30 lookups per account per hour, never while typing. Settings: `GEOCODER_URL`, `GEOCODER_EMAIL`, `GEOCODER_USER_AGENT` in `server/.env`.
- **Map pictures (tiles):** OpenStreetMap's free tile server for now, with the required "© OpenStreetMap contributors" credit. Settings: `VITE_MAP_TILE_URL`, `VITE_MAP_ATTRIBUTION` in `client/.env` (`lib/mapConfig.js`). Leaflet loads only on pages with a map (lazy-loaded).
- **Pins outside Slovenia are refused.** Existing listings get a location with `node scripts/geocode-housing.js` (one per second; lists addresses it couldn't find).
- **Pin style:** steel-blue drop with a white dot (`loc-` classes).

## 6. Guests (logged-out visitors)

**Decided:** guests can browse both platforms with limited content, and are asked to sign up only when they try to act.
- **Visible to guests:** photos, price, title, city or neighbourhood, category, "Verified" badge, amenities.
- **Hidden until sign-up:** seller/landlord names and profiles, full description, reviews, exact address.
- **Actions that ask for sign-up:** Message, Save, Post, Apply. The prompt explains why (only verified students can contact people) and brings them back to the same listing after confirming their email.

**Built today:** only the landing page and the auth pages are public. "Browse places" / "Browse items" send guests to log in (with a note saying why). Public browsing needs public listing endpoints with trimmed data on the server.

---

## 7. Landing page (`/`)

Sections, top to bottom:
1. **Three columns** — Housing / Marketplace / Settle In, title centred over a light illustration. Hover widens a column and shows a short description and tags (always shown on phones).
2. **Find your side of the story** — two large panels, "I'm a student." and "I have a place.", with simple drawings (graduation cap on books / house with key). Hovering one grows it while the other narrows. Each ends with a directional arrow (student ←, landlord →), never a sign-up button. Clicking opens a full-screen view that slides in from that side:
   - each view covers **what you can do · what your account includes · what you get · how to join**;
   - "Back to both sides" (also Escape or the browser's back button) and a link to switch to the other side;
   - informational only: no forms or sign-up buttons in these views;
   - the views live in the address (`/#for-students`, `/#for-landlords`), so they can be linked to directly.
   Below the panels: "New here? Start with the story behind it" with a down arrow that scrolls to the problem section (`#story`).
3. **Trust strip** (ink) — verified students only · every housing listing checked by a person · chat in the app, number stays private · Slovenian and English.
4. **The problem** (`#story`) — six things students complain about: budget, nothing available, nobody answers, all over the place, paperwork, who to trust.
5. **What's inside** — three lanes matching the columns, four services each, Live/Soon tags (`LANE_STATUS` in `LandingPage.jsx`).
6. **Messaging demo** — pick a conversation (buying a desk chair, renting a room, taking over a sublet); messages pop in with "typing…". Starts when scrolled into view.
7. **Partners** — logo wall (only real, agreed partners, from `PARTNERS` in `LandingPage.jsx`; hidden while empty) + "Become a partner" band.
8. **Join** — students: university email box (pre-fills the register page); landlords: create account or leave details. Contact form posts to `/api/public/interest`.
9. **Footer.**

Illustrations in `client/src/assets/landing/` are placeholders. Replace with real photos: bright, calm, not busy, so the titles stay readable.

---

## 8. Copy

- **Slovenian is the default**, English second (Slovenian law, ZJRS, requires Slovenian for sites aimed at Slovenia). All public pages are bilingual: landing copy in `client/src/Pages/landingCopy.js`, log in / sign up / confirmation in `client/src/Pages/authCopy.js`, top bar in `components/PublicNav.jsx`. Every string needs both languages. Form errors are stored as keys so they follow the language switch; errors from the server are shown as the server sends them (English for now).
- **Address:** students informally (_ti_), landlords and partners formally (_vi_). Text aimed at both at once (the "Find your side" intro, log in, email confirmation) uses _vi_.
- **Tone:** short, plain, friendly. Say what something does, not how great it is.
- **Honesty:** no invented statistics, testimonials or partner logos. The problem lines are common complaints, not quotes from real people — replace with real student quotes (with permission) or keep them unattributed.
- **Names:** Housing (_Bivanje_), Marketplace (_Tržnica_), Settle In (_Udomači se_ — not final).

---

## 9. Open items

- [ ] **Pet question** in the rental profile: remove "Rather not say", keep only Yes / No. Decide whether it becomes required like "smoker".
- [ ] **Public browsing** for guests (section 6) — server endpoints + guest views + sign-up prompt.
- [ ] **Unread messages** — the chat list marks new messages only while the page is open. A real unread count (and a badge on the Messages icon) needs a "read" time on messages on the server.
- [ ] **Old stylesheet** `client/src/App.css` is no longer loaded by any page; delete it when convenient.
- [ ] **Marketplace categories and city** — the item model has none, so there is no category filter or location on cards yet. Needs a server change.
- [ ] **Saved items** and **"Sold" status** on the marketplace — today sellers delete sold items. Needs a server change.
- [ ] **One set of colour variables** for the whole app instead of four copies (section 2).
- [ ] **Name for Settle In** in both languages.
- [ ] **Native-speaker check** of the Slovenian landing and auth copy.
- [ ] **Real photos** for the three landing columns.
- [ ] **Partner logos** once organisations agree.
- [ ] **Logged-in pages are English only** (and have no language switch) — decide on Slovenian for the app.
- [ ] **Server messages and the confirmation email are English only.**
- [ ] **Sidro / Anchor:** check the .si/.com domains and trademarks before it's final. "Anchor" is a common name for other products, so the English name especially needs a check.
- [ ] **Map provider before launch:** the map uses OpenStreetMap's free tiles and geocoder, which are best-effort and can block heavy users. Switch to a paid plan or self-hosted tiles before public launch (two settings, see "Maps").
- [ ] **Maps, next steps:** approximate-area map on each listing page, then a map view in Housing → Browse (rectangle search, price labels, grouping), then "minutes to your faculty".
- [ ] **Different experience per account type** — no account / student / landlord (next round).
- [ ] **Forgot password** doesn't exist yet.

---

## 10. Change log

- **2026-11-02** — Renamed to **Sidro (SL) / Anchor (EN)** with an anchor logo and favicon; tab titles follow the language. Housing listings get map locations: pin picker in the listing form, address lookup, exact pin private to the owner, public point 80–200 m off, backfill script. Needs `npx prisma db push` and `npm install` (Leaflet).
- **2026-11-02** — Log in / sign up get a blended background of the three landing scenes. Messages rebuilt: list with previews and newest first (server now sends the last message), day separators, my messages on the right, errors shown instead of silently failing, phone layout, clear empty states, review dialog without browser pop-ups. My profile restyled with shortcuts and rental-profile status; the old "My listings" block is gone. Focus outline is raspberry everywhere and only shows for keyboard users.
- **2026-11-02** — Marketplace rebuilt in the housing layout: tabs (Browse · My items), filter box, cards, item page (`/marketplace/:id`) with Message / Report, Sell and Edit form pages with live preview, My items list. New server route `GET /api/listings/item/:id` (with tests). Price filters on Housing and Marketplace no longer drop keystrokes; tall photos no longer stretch cards.
- **2026-11-02** — Renamed to **Kampus**: logo, favicon, tab titles, confirmation email. Shared `PublicNav` for all logged-out pages; slide transitions between pages; log in / sign up / confirmation redesigned and bilingual, with a Student / Landlord switch on sign-up.
- **2026-11-02** — Landing page: "Find your side of the story" section (student / landlord panels and slide-in views) below the three columns.
- **2026-11-02** — Shared top bar for all logged-in pages; student/landlord routing (`/marketplace`, `/settle-in`, `StudentOnly`); marketplace search moved into the page; Quick Actions sidebar removed. This file created.
- **2026-10-30** — New landing page; palette set to Nordic Stone.
