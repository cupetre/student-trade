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

**Only these colours.** Status colours use the palette too: "good" (bills included, address registration, Live) is steel blue dark on light blue; notices are ink on a light stone tint (`#EEE8DD`); errors are raspberry dark on a light raspberry tint. Listing badges: For rent light blue, Sublet stone beige, Roommate wanted ink. The saved heart is raspberry.

**The attention rule:** raspberry marks the one thing on a screen we want people to act on or notice — Sign up, Create account, Become a partner, "New", unread counts, focus outlines, and the current platform in the top bar. At most one raspberry button per screen. Everything else uses steel blue or ink.

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
- **Page width:** every logged-in page uses the same container: `max-width: var(--page-max)` (1480px) with `var(--page-pad)` (20px) side padding, both set once in `client/src/index.css`. Use `.hs-page` (or those two variables) for any new page; never give a page its own max-width. Narrow content (text, forms) limits itself inside the page, so the page edges never move when switching pages.
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

**Housing quick links (`HousingLinks`)** — "My listings · Liked listings" at the top right of the browse page (and beside the "My listings" title); the current one is steel blue. Landlords only get My listings. Saved places are called **Liked listings** everywhere. My stays is in the account menu; landlords also get "Browse places" there. "Post a place" lives in the top bar. (`HousingTabs.jsx` is no longer used.)

**Housing browse page (`/housing`, `/housing/saved`)** — no visible title (a hidden one for screen readers), only the quick links on the right. Three columns:
- **Left: filters**, stacked (city, listing, type of place, max rent, spots, furnishing, move in by, must-haves, Clear filters link). White panel (12px corners); each filter is a bold label over a small box with 6px corners (dropdowns get a chevron). Sticky while scrolling. Sort stays above the results in the same style. Card headings use the body font, not Bricolage. Saved has no filter column.
- **Middle: listing rows** (`components/HousingRowCard.jsx`) — about 65% text, 35% first photo. Rows: title · "City, Slovenia" far right / price · what the rent covers far right ("Rent + bills included", "Rent only · bills ~€X", "Rent only · bills extra") / size · type · spots · furnishing · from date / neighbourhood and address-registration tags / owner (photo, name, Verified landlord or Student) · "Message in the app". The whole row opens the listing; the heart and the owner's name are separate links.
- **Right: "What you're looking for"** from the rental profile (city, budget, move-in, stay; Edit → `/profile/student?edit=1`; "Use as filters" copies city, budget and move-in into the filters; students only; no helper text under it) and **the map** below it (no note under it) (`components/HousingBrowseMap.jsx`, lazy-loaded): price tags at the approximate points, jumps to the city chosen in the filters (else fits the listings, else Slovenia), hovering a row lights its tag, clicking a tag opens the listing.
- **No phone numbers on the rows.** Contact goes through in-app messages, which checks the student's rental profile first (section 1: "phone number stays private").
- Under 1200px the right column moves above the listings (search and map side by side); under 860px everything is one column and the filters fold behind a "Filters (n)" button; under 600px the photo sits on top of the text.

**Marketplace browse (`/marketplace`)**
- Font: **Public Sans** on every marketplace page and the item window (the top bar and footer keep the app font). Loaded in `Market.css`.
- A very faint version of the log-in scene sits behind all marketplace **and housing** pages (`components/SceneBackdrop.jsx`, placed right after `<AppNav />`), fading to the page colour at the top. The page's `<main>` sits above it automatically.
- No Browse / My items tabs: My items is in the account menu.
- **Left sidebar** (white card, sticky): Categories and Condition as tick boxes (several at once), **Budget** with a big "Up to €" box and a small optional "From €". It's a draft: tick → **Apply filters** → the list filters (the button is disabled until something changed); Reset clears it. Under 900px it folds behind a "Filters (n)" button.
- **Search** sits on top of the items (big box, live after typing stops), then the count and Sort.
- Everything is in the address: `?q=&category=books,bikes&condition=new,like_new&min=&max=&sort=&page=`.
- **Grid: 5 items per row, 10 rows, 50 items a page** (`PAGE_SIZE` in `server/lib/marketOptions.js`). 4 per row under 1360px, 3 under 1120px, 2 on phones.
- **Card, in the same order as the item window:** title (one line) on the left with the price on the right, the square photo, then the seller and when it was posted. No category on the card.

**Marketplace item window (`/marketplace/:id`)** — opens over the browse page (same filters and page behind it; Escape, × or a click outside closes it). **1360px wide, 40px of space around it, beige (`#FAF7F0`) with a soft shadow. Two columns, 70 / 30**, 8px inside the window's edge.
- **Left:** title with the city and outline pin on the far right of the same row → the photo (kept compact, inset from the edge, whole photo shown) → price → description → facts in one row (condition, category, pick-up, posted) → below it **the seller** (photo, name, "Koper · FAMNIT", age, rating, View profile), their reviews, Report this item.
- **Right:** the **message box** (how the seller prefers to be contacted, the message, Send message, Open chat with <name> under it), then a **small map** of the pick-up area (300 m circle; the seller sees their exact pin).
- Phones: one column — the item, then the message box and map, then the seller.
- The seller's own item shows Edit / Delete instead of the message box.

**Sell form** uses **DM Sans** (Google Fonts, loaded in `Market.css`) with lighter titles: page title and section titles 600, labels 500. Adds: category, "How much has it been used?" (New · Like new · Good · Fair · Worn), pick-up city and area, an optional pin on a map (buyers only see a circle), and how buyers should contact you (Message me here · Message first, then a call · Message first, then meet). The phone number is never shown.

**Footer** (`components/AppFooter.jsx`) — under every logged-in page, added once in `main.jsx`. Ink band, page width: brand line, Platforms, Your account, Stay safe; landlords only see Housing links. It sits at the bottom of the window even on short pages.

**Messages (`/chatpage`)**
- "Messages" title above the panels. The panels are separate white cards (6px corners) with 16px between them: **conversations · open chat · liked listings**. The page fills the window; only the lists and the messages scroll.
- **Conversations** (420px wide next to the liked column, 440px without it): search box on top in the same light blue as the selected conversation (by name, ignores case and accents: "ziga" finds "Žiga"), then roomy rows (52px photo, name, time, last message, raspberry dot for new).
- **Liked listings** (students): photo, title, price and city, owner, and **Message** (starts a chat through the housing contact route, so the rental-profile check still runs) or **Open chat** if one already exists. Own column at 1240px and wider; below that a **Chats · Liked** switch in the left card, and the search box searches whichever is shown.
- After a review, a short dark confirmation appears above the message box and goes away after 4 seconds (or with ×). No more sticky green bar.
- Phones: one panel at a time; the title hides while a chat is open.

**Listing page (`/housing/:id`)**
- The whole listing sits on **one white sheet**: thin border, 4px corners, no shadow. The main photo runs the full width of the sheet from its very top; thumbnails, then badge, title and the one-line summary under it.
- **Three tabs** under the title — **Overview · Location · Contact** — bold words, the open one raspberry with a raspberry underline. The open tab is in the address (`?tab=location`, `?tab=contact`), switching doesn't add history, arrow keys move between tabs.
  - **Overview:** facts grid, about this place, house rules, what's included, video tour.
  - **Location:** street and postcode, "Open in Google Maps", and a map (`components/ListingMap.jsx`, loads only when the tab opens). Everyone sees a shaded 300 m circle around the approximate point; the owner sees their exact pin. No point yet → "Not on the map yet" (owner gets a link to place the pin).
  - **Contact:** who posted it (photo, name, Verified landlord / Student, rating, languages, View profile), then **"Interested?"** (`Pages/housing/InterestPanel.jsx`), then "Stay safe".
- **"Interested?"** — the student taps what they'd like (Seeing the place · Renting it / Taking over the sublet / Moving in as a flatmate · Moving in with a friend, only if 2+ spots are open · Asking questions first), a move-in date and how long (both filled in from the rental profile) and an optional note. "Send to <name>" opens the chat and posts it as the first message; with nothing chosen the button says "Message <name>" and just opens the chat. The server writes the message (`server/lib/housingInterest.js`) so it always reads the same way, and the rental-profile check still runs first.
- **No reviews on listings.** Only people have reviews (landlord ↔ tenant, buyer ↔ seller). The owner's rating shows in the Contact tab. Tenants review their landlord, not the place.
- **One review per person about another person**, whatever brought them together (marketplace chat, a stay, or both). Leaving another one updates the first ("Your review was updated"). Enforced in the database (`@@unique([reviewer_id, reviewee_id])` on Review).
- **Right column:** a small sticky summary — price, spots, available from, bills — with **I'm interested** (opens the Contact tab), **Like / Liked**, and the owner's name (also opens Contact). Owners get Edit listing / My listings instead.
- **Phones:** one column; a bar at the bottom (price + "I'm interested") opens the Contact tab, and hides while that tab is open.

**Marketplace tabs (`MarketTabs`)** — Browse · My items. "Sell an item" lives in the top bar. No "Saved" tab until the server can save items.

**One layout for both platforms** — Housing and the Marketplace share the same building blocks (`hs-` classes in `Housing.css`); the marketplace only adds what differs (`Pages/marketplace/Market.css`, `mk-`):
- **Browse:** tabs → page header → filter box → results bar (count, Clear filters, Sort) → card grid. Filters live in the address (`?q=lamp&max=20&sort=price_asc`) so a search can be shared and the back button works. Text and number boxes keep their own value while typing and update the address after a short pause.
- **Card:** photo (4:3, cropped), price, title, one meta line (marketplace: seller's avatar, name and when it was posted).
- **Item / listing page:** photo, title, description on the left; price and actions, owner panel, safety tips and Report on the right. The owner sees Edit / Delete instead of Message.
- **Form page** (post / sell / edit): fields on the left, live card preview on the right. Replaces the old pop-ups.
- **Messages (`/chatpage`, `ch-`):** conversation list (newest activity first, last message as a preview, a raspberry dot for new messages) and the open conversation side by side; on phones one at a time with a back arrow. The open conversation is in the address (`?chatId=12`). Messages are grouped by day; mine are steel blue on the right, theirs white on the left. Enter sends, Shift+Enter adds a line. When there are no conversations at all, the page shows one empty state with links to the marketplace and housing (landlords: My places) instead of two empty panes. Reviews are left from the conversation in a dialog using the shared star input.
- **My profile (`/profilepage`, `mp-`):** card with photo, name, Verified student / landlord tag, member since, email and bio; editing happens in the same card. Reviews about you below. On the right: rental profile status (students), shortcuts with counts (My items, My places, Saved places, My stays, Messages) and "How others see you".
- **"My" list:** one row per item with thumbnail, title, details and actions; Delete asks "Delete for good?" inline. After saving or deleting, a green message confirms what happened.

**Page header** — just the H1, ideally one or two words. No subtitle or explanation line under it, and no small helper lines under cards.

**Empty states** — say what's missing and give the next step ("You haven't posted anything yet" + Post a place).

**"Coming soon" pages** — list what's coming with Soon tags and link back to what already works (see `SettleInPage.jsx`).

**CSS class prefixes** — Vite loads all CSS globally, so each area uses its own prefix:
`lp-` landing · `pn-` public top bar · `appnav-` logged-in top bar · `auth-` log in / sign up / confirmation · `brand-` logo · `hs-` housing and profile pages · `si-` Settle In · `mk-` marketplace additions · `ch-` messages · `mp-` my profile · `loc-` map pin picker.

---

## 5. Navigation and roles

**Top bar (logged in)**
- Left: logo → the user's home (students `/marketplace`, landlords `/housing/mine`).
- Students: platform switch **Marketplace · Housing · Settle In (Soon)** in the exact middle of the bar, bold words with no background; the current one turns raspberry (the one place raspberry is used for navigation, so it is easy to see which platform you are on).
- Landlords: no switch, a "Housing · for landlords" tag instead.
- Right: context button (**Sell an item** on the marketplace, **Post a place** on housing, none elsewhere) · Messages icon · account menu.
- Account menu: My profile · Rental profile (students) · How others see me · _Marketplace:_ My items (students) · _Housing:_ My places · Saved places (students) · My stays (students) · Log out.
- Phones (≤720px): the switch drops to its own full-width row; name and "Soon" tag hide.
- No search in the top bar. Search lives inside each platform's page.

**Top bar (logged out, `PublicNav`)** — the same bar on the landing page, log in, both sign-ups and email confirmation, so the same buttons are always in the same place.
- Logo → the landing page (on the landing page it scrolls to the top).
- Section links: Housing, Marketplace, Settle In → the matching lane on the landing page; For landlords → opens the landlord explainer (`/#for-landlords`); Partners → the partner band. From another page they go to the landing page and it scrolls there.
- SL/EN switch (shared with every public page, `lib/language.js`), Log in (underlined when you're on it), **Sign up** (raspberry; turns quiet while you're on a sign-up page).
- Always one row, 72px high (64px on phones); side margin grows from 16px to 40px with the window, the same as the landing sections.
- ≤1180px: For landlords and Partners move into a **menu** (button with three lines, at the right end); ≤900px: all section links are in the menu; ≤520px: the SL/EN switch moves into the menu too; ≤420px: logo shows the mark only; ≤360px: Log in hides (it's on the sign-up page anyway). The menu closes on a link, Escape, a click outside, or a page change.

**Page transitions (`components/PageSlide.jsx`)** — each page has a step in the visitor's journey: landing 0 → log in 1 → sign up 2 → landlord sign-up 3 → email confirmation 4 → the app 10. Going to a higher step slides the content in from the right, a lower step from the left; same step, no animation (e.g. moving inside the app). Only the content slides — the top bars stay still. No animation with reduced motion.

**Tab titles (`components/RouteTitle.jsx`)** — public pages follow the language ("Prijava · Sidro" / "Log in · Anchor"; the landing page is just the name); logged-in pages are "Housing · Anchor" and so on.

**Getting into the app**
- Guests who open Housing or the Marketplace (from the landing columns or a link) go to log in, which says what they were trying to open ("Log in to see the marketplace.") and takes them there afterwards.
- Log in links to both sign-ups; each sign-up links to log in and to the other sign-up (the switch at the top).
- **Forgot password:** "Forgot your password?" sits next to the Password label on log in → `/forgot-password` (email is carried over) → "Check your email" with a resend after 60 s → the link opens `/reset-password?token=…` → new password twice → "Password changed" → log in with a green note. The answer never says whether an account exists. Links work once, for one hour; only a hash is stored; one email per minute per account, 5 requests per 15 min per IP + email. Using a reset link also confirms the email. The email is in the language of the page (Sidro / Anchor).
- After log in: students → `/marketplace`, landlords → `/housing/mine`. A login lasts 3 hours (`expiresIn` in `server/controllers/userController.js`); after that the app sends you to log in again. Log out → log in (slides back from the left).

**Rental profile (`/profile/student`, `sp-`)** — what a landlord sees when a student contacts them. Four numbered cards in a **2 × 2 grid** (one column under 900px):
1. **Photo & basic info:** photo (needed), date of birth (needed; only the age is ever shown), home country (needed), home town, a few words about you. Photo and bio are the account's own (also on My profile and in the top bar).
2. **Studies:** university, faculty, level (needed); programme, year, regular / exchange.
3. **What you're looking for** (optional; landlords the student has contacted see it): max rent, move-in date, length of stay (a dropdown: Short lease, up to 6 months · Long lease, more than 6 · Year contract, 12 · Indefinite, for a really long time · Open to negotiate), city.
4. **More about you** (all optional): languages, smoking, pets (Yes / No, nothing chosen = not saying, "Clear" takes an answer back), how you live.
- **Read-only until "Edit profile".** Fields look like text and unchosen options are hidden ("Not added" where empty). Edit profile unlocks everything; Save stores it (photo and bio through the account, the rest through the profile) and locks the page again; Cancel puts back what was saved. A new photo is only uploaded on Save. Coming from "complete your profile to contact this landlord" (`?next=`) opens it ready to edit.
- "Needed" = what must be filled in before messaging a landlord: photo, date of birth, home country, university, faculty, level.
- Who sees what: everyone logged in sees studies; people the student has talked to or lived with also see age, where they're from, what they're looking for and the optional details (`SHOW_HOUSING_NEEDS` in `server/lib/profileOptions.js` switches "what they're looking for" off again). The search filters in Housing stay separate.
- Older saved answers are read as the new choices: a number of months (≤6 short, 12 year, otherwise long), "open" → Indefinite, "other" → Open to negotiate.

**Public profile (`/users/:id`)** — header card (photo, name, tags, bio), then one full-width "About" card with its groups side by side in a row (Basics & studies · Looking for · More about), then Reviews as a full-width card.

**Top-bar photo and name stay in sync** — `updateCurrentUser()` / `refreshCurrentUser()` in `lib/useCurrentUser.js` update every place that shows the logged-in user (top bar included) as soon as a photo, name or bio is saved.

**Routes**

| Path | Who | Notes |
|---|---|---|
| `/` | everyone | Landing page for visitors; logged-in users are sent to `/marketplace` |
| `/marketplace` | students | Browse. Landlords are sent to `/housing/mine` (all marketplace pages) |
| `/marketplace/:id`, `/marketplace/new`, `/marketplace/mine`, `/marketplace/:id/edit` | students | Item page · Sell an item · My items · Edit (owner only) |
| `/housing`, `/housing/:id`, `/housing/mine`, `/housing/new`, `/housing/:id/edit` | students + landlords | |
| `/housing/saved`, `/housing/stays` | students | |
| `/settle-in` | students | Placeholder until built |
| `/profile/student` (rental profile) | students | See "Rental profile" below |
| `/chatpage`, `/profilepage`, `/users/:id` | students + landlords | |
| `/login`, `/register`, `/register/landlord` | logged out | Logged-in users go to `/` |
| `/verify-pending`, `/verify-email` | everyone | Email confirmation |
| `/forgot-password` | logged out | Ask for a reset link |
| `/reset-password?token=…` | everyone | Set a new password from the emailed link |

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
1. **Three columns** — Housing / Marketplace / Settle In, title centred over a light illustration. Hover widens a column and shows a short description and tags (always shown on phones). They stay side by side down to 701px wide and stack below that. Their height fills the window under the top bar (at least 460px, at most 900px); titles, text and padding shrink with the width. On short windows (≤660px high) the hover details leave out the tags so nothing gets cut off.
   Lower sections share one side margin (`--lp-gutter`, 16–40px) and a 1240px max width, the footer included; the "What's inside" lanes are three side by side or one under the other (≤900px), never 2 + 1.
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
- [ ] **More listing details** (floor, heating types, appliances, outdoor space, parking, energy class, itemised costs, room details, house rules, nearby…): the full list with proposed fields and filters is in `HOUSING_FIELDS.md`.
- [ ] **Maps, next steps:** approximate-area map on each listing page, then a map view in Housing → Browse (rectangle search, price labels, grouping), then "minutes to your faculty".
- [ ] **Different experience per account type** — no account / student / landlord (next round).

---

## 10. Change log

- **2026-11-10** — Messages has no footer and never scrolls as a page (top bar + page = window height); only the chat list, the messages and the side cards scroll. Marketplace cards: the photo runs edge to edge across the card, same height as before.
- **2026-11-10** — Marketplace sidebar order: Budget (one plain "Up to (€)" box, empty = no limit; the From box is gone), Sort by (newest, oldest, price low→high, high→low), Categories, Condition; all applied with Apply filters. Card photos get a 1px stone border. Item window: no city in the title row; title, price and description start on the photo's left edge; "Posted …" sits next to the price; facts are Condition · Category · Pick-up; Report this item is at the bottom of the right column. Messages: every contact through an item or a place is recorded (new ChatTopic table, `npx prisma db push`); the open chat shows "About this chat" cards above Liked listings on wide screens, and an "About: …" bar under the chat header on narrower ones.
- **2026-11-10** — Marketplace: Public Sans; left sidebar (categories, condition, budget; apply to filter) with search on top; 5 × 10 grid, cards ordered title | price, photo, seller; Browse / My items tabs removed; item window 1360px, beige, 70 / 30 with the message box and map on the right. Server: several categories / conditions and a min–max price at once, 50 a page.
- **2026-11-10** — The faint scene background now also sits behind every housing page (browse, liked, my listings, my stays, a listing, post / edit a place).
- **2026-11-10** — Sell / edit item: DM Sans instead of the system font, lighter section titles and labels.
- **2026-11-10** — Marketplace: items get category, condition, pick-up city/area + approximate map, contact preference (new ListingItem columns; needs `npx prisma db push`). Browse is 3 × 10 with page numbers, served page by page by the server. Items open in a window over the list with a message box, Open chat, seller card and seller reviews (`POST /api/listings/item/:id/contact`). Faint scene background behind marketplace pages. Footer on every logged-in page.
- **2026-11-10** — One page width everywhere (1480px, 20px side padding, in `index.css`): housing, marketplace, messages, profiles and Settle In no longer jump between widths. Listing form preview column 360px.
- **2026-11-09** — Messages: title outside the panels, three separate cards with gaps, name search, bigger conversation rows, liked listings with Message / Open chat (own column on wide screens, a Liked tab otherwise), review confirmation that closes itself.
- **2026-11-09** — One review per person about another person (marketplace and housing together; a second one updates the first; database rule + `scripts/merge-duplicate-reviews.js` to clean up before `npx prisma db push`). Rental profile: "More about you" card is white like the others, the progress box only shows while something is missing, header subtitle removed.
- **2026-11-09** — Listing page split into Overview · Location · Contact tabs. Location has the approximate-area map (owner sees the exact pin). Contact has the owner card, "Interested?" and Stay safe. The right column is a short summary with I'm interested and Like.
- **2026-11-09** — Listing page: sheet without shadows and with 4px corners; the main photo fills the sheet edge to edge from the top.
- **2026-11-09** — Listing page: one white sheet with side shadows, listing reviews removed (only people have reviews), "Interested?" panel on the right that sends a first message with what the student wants (new `POST /listings/:id/contact` body: interests, move_in, stay_length, note; tests in `server/tests/housingInterest.test.js`), phone bar. "Stay safe" box in palette colours.
- **2026-11-09** — Top bar: Marketplace · Housing · Settle In are bold; the current one is raspberry.
- **2026-11-09** — Housing browse: no title, "My listings · Liked listings" top right, filters back in a white panel with 6px-corner fields, side-card headings in the body font. Saved → "Liked listings". Top bar: platform switch centred, no pill background, current platform in steel blue.
- **2026-11-09** — Housing browse: filters lose their boxes (label + underline), title "Housing", no subtitles or helper lines; housing sub-tabs removed (pages are in the account menu, landlords get "Browse places"). Subtitles removed from page headers across the app. Off-palette greens, oranges and yellows in housing replaced with Nordic Stone.
- **2026-11-09** — Housing browse page redesigned: filters in a left column, listings as wide rows (text + first photo) with what the rent covers and who rents it, right column with "What you're looking for" (Use as filters) and a map that follows the chosen city. The rental profile opens in edit mode with `?edit=1`.
- **2026-11-09** — Rental profile: 2 × 2 grid, read-only until "Edit profile", Save locks it again, length of stay is a dropdown (Indefinite and Open to negotiate replace Not sure yet / Other). Public profile: about groups in one row, reviews below. The top-bar photo updates as soon as a new photo is saved.
- **2026-11-09** — Rental profile reordered (photo → basic info → studies → what you're looking for → more about you). Needed now: photo, date of birth, home country, studies; smoking and languages optional. Length of stay is a choice instead of a number. "What you're looking for" is shown to landlords the student contacted. Bio can be edited here. Pets / smoking: Yes / No only. Needs `npx prisma db push` (adds `stay_length`, `stay_note`).
- **2026-11-03** — Logins last 3 hours (was 1). The logo in both top bars sits exactly in the middle of the bar (the link around it was adding space for letter descenders).
- **2026-11-03** — Landing page fits any window: the three columns stay in a row down to 701px and fill the window height; one side margin everywhere. Public top bar stays one row and moves links into a menu on narrower screens. Forgot password: link on log in, `/forgot-password`, `/reset-password`, bilingual email, server endpoints with tests. Needs `npx prisma db push`.
- **2026-11-02** — Renamed to **Sidro (SL) / Anchor (EN)** with an anchor logo and favicon; tab titles follow the language. Housing listings get map locations: pin picker in the listing form, address lookup, exact pin private to the owner, public point 80–200 m off, backfill script. Needs `npx prisma db push` and `npm install` (Leaflet).
- **2026-11-02** — Log in / sign up get a blended background of the three landing scenes. Messages rebuilt: list with previews and newest first (server now sends the last message), day separators, my messages on the right, errors shown instead of silently failing, phone layout, clear empty states, review dialog without browser pop-ups. My profile restyled with shortcuts and rental-profile status; the old "My listings" block is gone. Focus outline is raspberry everywhere and only shows for keyboard users.
- **2026-11-02** — Marketplace rebuilt in the housing layout: tabs (Browse · My items), filter box, cards, item page (`/marketplace/:id`) with Message / Report, Sell and Edit form pages with live preview, My items list. New server route `GET /api/listings/item/:id` (with tests). Price filters on Housing and Marketplace no longer drop keystrokes; tall photos no longer stretch cards.
- **2026-11-02** — Renamed to **Kampus**: logo, favicon, tab titles, confirmation email. Shared `PublicNav` for all logged-out pages; slide transitions between pages; log in / sign up / confirmation redesigned and bilingual, with a Student / Landlord switch on sign-up.
- **2026-11-02** — Landing page: "Find your side of the story" section (student / landlord panels and slide-in views) below the three columns.
- **2026-11-02** — Shared top bar for all logged-in pages; student/landlord routing (`/marketplace`, `/settle-in`, `StudentOnly`); marketplace search moved into the page; Quick Actions sidebar removed. This file created.
- **2026-10-30** — New landing page; palette set to Nordic Stone.
