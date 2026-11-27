# Plant Pals — houseplant & watering tracker

A small phone app for tracking houseplants, the rooms they live in, and their watering schedules. Local use only for now: no accounts, no server, and all data stays on the device.

## Approach

### Platform: one web app, two ways to run it
The app itself is plain **HTML + CSS + JavaScript with no build step**, in [www/](www/).

- **Web app (PWA):** served from GitHub Pages. It runs in any browser, installs to the home screen and works offline.
- **Android app:** the same `www/` files wrapped with [Capacitor](https://capacitorjs.com) into a real APK ([android/](android/)). This adds what a web page can't do reliably: **daily watering reminders** scheduled on the phone, plus Android's share sheet for backups. [www/js/native.js](www/js/native.js) holds those extras. In the browser it detects that it isn't in the app and does nothing, so one codebase serves both.
- **No server, no accounts, no tracking.** A Content-Security-Policy in `index.html` blocks the page from loading anything from other sites, and the Nunito font is bundled ([www/fonts/](www/fonts/), SIL Open Font License).

### Data: on-device storage
- All rooms and plants are stored in the browser's `localStorage` under one versioned key (`plantPals.data.v2`). See [js/store.js](js/store.js). Data saved by an older version is upgraded automatically on load.
- The app **starts empty**; no plant data ships with it.
- **Settings → Your data** has the data buttons:
  - **Export backup** downloads everything as JSON. This matters because clearing browser data wipes the plants.
  - **Import backup** loads an export back in, replacing the current plants and rooms. It's also how to move plants from one device to another.
  - **Clear all plants** deletes every plant and its history. Rooms and settings are kept.
- **Monthly backups.** Web apps can't save files silently, so backups come in two kinds:
  - **Automatic snapshots:** every 30 days, and before *Clear all plants* or an import, the app saves a copy of your plants inside its own storage (up to 3 monthly + 3 safety copies). *Restore a snapshot* in Settings brings one back. These protect against mistakes, but not against uninstalling.
  - **Backup file reminder:** 30 days after the last backup file (or after first use), Today shows a "Monthly backup time" banner. *Save* downloads the file (on Android it goes to Downloads); *Later* snoozes it for a week.
- Import also accepts a prepared file with a 4-week rota. If the file has a `scheduleStart` date and per-plant `scheduleDays` (day numbers 1–28 of a repeating cycle), each plant's first due date is set to its next rota day. That way an existing schedule carries straight over instead of every plant being due at once.

#### Data model
```text
Room   { id, name, emoji }
Plant  { id, name, detail, species|null, roomId|null, placement,
         schedule: { spring:{min,max}, summer:{…}, autumn:{…}, winter:{…} },
         waterMethod: 'top'|'bottom'|'soak'|'cup'|'tray'|'vase', waterType, notes,
         lastWatered|null, nextDue, history: [dates, newest first] }
Settings { seasonMode: 'auto'|'spring'|'summer'|'autumn'|'winter', appliedSeason }
```
`species` is a key into the plant catalogue ([js/catalog.js](js/catalog.js)) and picks the plant's illustration. Dates are local calendar days (`YYYY-MM-DD`).

### Watering logic
See [js/watering.js](js/watering.js). Each plant has a range for the active season, e.g. *every 7–10 days*:
- **Watered** → next due = today + `minDays`.
- **Due** from that date for `maxDays − minDays` days. This is the "check the soil" window, and the app shows how much slack is left.
- **Overdue** after the window. The plant turns thirsty in the Today list.
- **Not yet** pushes a plant to tomorrow, for when the soil is still damp.
- Every action shows an **Undo** toast.

### How to water + watering guide
Each plant has a **watering method**, shown as a pill on plant cards, in the Today list and in the sitter's plan:

| Method | Default for |
|---|---|
| ⬇️ From the top | most plants |
| ⬆️ From below | African violet, cyclamen, Cape primrose, Rex begonia, cuttings & seedlings |
| 🛁 Soak & drain | orchids, air plants, staghorn ferns |
| 🥤 Into the cup | bromeliads |
| 🍽️ Stand in a tray | Venus flytrap, pitcher plants, sundews |
| 🫙 Top up the vase | lucky bamboo |

The plant form shows a one-line "how to" for the chosen method. The **watering guide** opens from the **?** in the top bar, the **?** next to "How to water" and "Water type" in the plant form, Settings → Watering guide, or the sitter's plan. It covers checking before watering, each method (with drawings for top, bottom and soak), rain vs tap water (and why to avoid softened water), and signs of over- or under-watering. It opens as its own layer on top of whatever is open, so it never loses unsaved form edits. The shared sitter's plan also ends with a short "How to water" section for the methods it uses.

### Light
Each plant shows a small sun drawing for how much light it wants: **full sun** (filled sun: a sunny windowsill), **half sun** (half-filled: bright, out of harsh midday sun) or **shade** (sun behind a cloud: copes with a darker spot). Catalogue species come with a default (`Catalog.defaultLight`), and plants you add yourself start at half sun. You can change it with the three-way picker in the plant form. The watering guide has a "How much light?" section.

### Showing water type
Settings → Watering → **Show water type** (on by default). When it's off, the rain/tap pills disappear from cards, Today and the sitter's plan, and the field is hidden in the plant form. The stored value is kept, so switching it back on restores everything.

### Seasons
Each plant has a separate range for **spring, summer, autumn and winter**. A banner at the top of the Today tab shows which schedule is active, for example "🍂 Autumn schedule · Automatic". Tap it to change:
- **Automatic** (the default) follows UK meteorological seasons: spring is Mar–May, summer Jun–Aug, autumn Sep–Nov and winter Dec–Feb.
- Or pin a season manually, for example to stay on Winter while the heating is still on in March.

When the season changes, due dates are recalculated from each plant's last watering. Each plant's edit sheet shows all four ranges, with the current one highlighted, and every range can be edited.

**Where the seasonal ranges come from:** the catalogue only gives **winter** ranges. The other three seasons are estimated in [js/catalog.js](js/catalog.js) by multiplying the winter interval by a factor for each type of plant:

| Profile | Spring | Summer | Autumn | Used for |
|---|---|---|---|---|
| Standard | ×0.75 | ×0.55 | ×0.85 | most leafy, flowering, trailing plants, palms, ferns, trees |
| Herb | ×0.7 | ×0.5 | ×0.8 | herbs & edibles |
| Succulent | ×0.5 | ×0.35 | ×0.6 | succulents, plus water-storers like Snake Plant, ZZ, Hoya |
| Desert cactus | ×0.35 | ×0.22 | ×0.45 | desert cacti (jungle cacti use Standard) |

A few plants have explicit ranges instead because their year runs differently. Living Stones and Aeonium rest in summer, Caladium sleeps through winter, and Venus Flytraps stand in water while growing. These are general rules of thumb, not measured values, so adjust any plant that seems too wet or too dry.

A **new plant** starts with today as its last watering, so it's next due after the current season's minimum interval. **Imported plants** that aren't on a rota and have never been watered are first due at today plus their minimum interval. After the first watering in the app, each plant follows its own interval.

All catalogue frequencies are general rules of thumb from common houseplant care guidance, not measured values. Adjust any plant that seems too wet or too dry.

### Holiday mode
Switch on **Holiday mode** on the Today tab, set the day you leave and the day you're back, and choose how often someone can visit: once, twice or three times a week, on whichever weekdays suit.

The app simulates every plant across the trip ([js/watering.js](js/watering.js) `planHoliday`). At each stop (you on the day you leave, then each visit), a plant gets watered if it's already due, or if it would run past the end of its watering window before the next stop or your return. Seasons are taken into account if the trip crosses a season boundary.

The **Sitter's plan** lists each visit with plants grouped by room, plus where each plant sits, its water type, a one-line care tip, and a "give it a thorough soak" flag when the gap to the next visit is longer than the plant's maximum interval. Plants that need nothing while you're away are listed separately. The plan can be **shared** (WhatsApp, email and so on via Android's share sheet), **copied** as text, or **printed / saved as a PDF**. The person watering doesn't need the app.

Each plant's due date is frozen when holiday mode is switched on, so the plan you shared doesn't shift mid-trip. Watering in the app before you leave updates the plan. When you're back, Today asks whether the sitter followed the plan; *Yes* adds their visits to each plant's watering history.

### Plant catalogue
[js/catalog.js](js/catalog.js) lists 120 common UK houseplants. Each has winter watering defaults, a water type, a one-line care note, and a pattern used to recognise existing plant names. Plants are sorted into everyday groups rather than botanical ones, and each plant is in exactly one group:

| Group | Examples |
|---|---|
| 🌿 Leafy & tropical | Monstera, ZZ, Snake Plant, Alocasia |
| 🎨 Colourful & patterned | Prayer Plant, Calathea, Croton, Polka Dot Plant |
| 🍃 Trailing & climbing | Pothos, Ivy, String of Pearls, Hoya |
| 🌴 Palms & ferns | Boston Fern, Kentia Palm, Maidenhair, Ponytail Palm |
| 🌳 Trees & tall plants | Fiddle Leaf Fig, Yucca, Money Tree, Olive |
| 🌸 Flowering | Peace Lily, Orchid, Cyclamen, Poinsettia |
| 🪴 Succulents | Echeveria, Jade, Aloe, Living Stones |
| 🌵 Cacti | Golden Barrel, Bunny Ears, Christmas Cactus |
| 🌱 Herbs & edibles | Basil, Rosemary, Chilli, Lemon Tree |
| 🪰 Quirky & carnivorous | Venus Flytrap, Air Plant, Lucky Bamboo |

Some plants could fit more than one group; they go where a non-specialist would look first. For example, Ponytail Palm is botanically a succulent but is listed under palms, and Christmas Cactus is under cacti rather than flowering.

### Settings page
The ⚙️ **Settings** tab gathers:
- **Watering:** the season schedule (same as the banner on Today), holiday mode and the watering guide.
- **Reminders (Android app):** a daily notification at a time you choose, only on days when plants are due. The browser version shows a note instead.
- **Appearance:** theme *Automatic* (follows the phone), *Light* or *Dark*. The theme is applied by a small script in `<head>` before the first paint, so there's no flash of the wrong theme. Dark-mode CSS is keyed on `<html data-theme="dark">`. The page also declares `<meta name="color-scheme" content="light dark">`, so Android Chrome's "dark theme for sites" option doesn't auto-darken or invert the page and plant drawings.
- **Your data:** backup status, Export / Import backup, Restore a snapshot, Clear all plants.
- **About.**

### Design
- **Theme:** warm oranges and yellows on a cream background, with a warm-brown dark mode (automatic or chosen in Settings). Colours are CSS variables at the top of [css/styles.css](css/styles.css).
- **Feel:** playful and game-like, in the spirit of Duolingo: chunky rounded cards, buttons with a "pressable" bottom edge, and the Nunito font.
- **Plant characters:** [js/plant-art.js](js/plant-art.js) draws a flat, two-tone SVG character for each of the 120 catalogue species. Each one is a plant in a coloured pot with a face, built from shared shapes (leaf, heart, frond, strap, cactus) plus a short recipe per species. There are no image files, so they stay sharp at any size and work offline. The face follows watering status: **happy** when fine, **expectant** when due, and **thirsty** when overdue (faded and drooping, with worried brows and a sweat drop). Plants without a type get a generic leafy plant. To add a species, add a catalogue entry and a recipe in `R`.

### Code layout
```text
www/                      the app (published to GitHub Pages, bundled into the APK)
  index.html              app shell (top bar, screen, tab bar, bottom sheet, guide)
  css/styles.css          theme tokens + all styles
  js/catalog.js           120 common houseplants in 10 groups: defaults + name matching
  js/watering.js          date maths, seasons, due/overdue status
  js/plant-art.js         SVG plant characters (species × mood)
  js/store.js             data layer: load/save/migrate, CRUD, water/snooze/undo, settings
  js/native.js            Android-app extras: reminders, share sheet, back button
  js/app.js               UI: rendering, forms, events
  fonts/                  bundled Nunito font + licence
  sw.js                   service worker for offline use (web only)
  manifest.webmanifest    home-screen install metadata
  icons/                  web app icons
android/                  Capacitor's Android project (generated, plus our tweaks)
assets/                   source images for the Android icon and splash screen
capacitor.config.json     app id, name, notification icon colour
scripts/build-apk.ps1     builds a signed APK + Play bundle into dist/  (npm run apk)
scripts/store-assets.py   regenerates the Play listing images in store/
store/                    Google Play listing kit (text, answers, images)
```

## Running it

### Android app (APK)
**Install on your phone:** copy `dist/PlantPals-<version>.apk` to the phone (Google Drive, email to yourself, or USB), tap it, and allow "install unknown apps" for whichever app you opened it from when Android asks. Then:
- **Move your plants across:** the APK has its own storage, separate from the web version. In the web app, use Settings → **Export backup**. In the Android app, use **Import backup** and pick that file.
- **Turn on reminders:** Settings → Reminders, then allow notifications when asked.
- **Updates:** install a newer APK over the top. Your data is kept, as long as it's signed with the same key.

**Building it** (Windows; one-off setup already done on the dev PC):
- Tools: Node.js LTS, Microsoft OpenJDK 21 (Gradle doesn't yet run on Android Studio's bundled Java 25), and the Android SDK (platform 36). Android Studio is optional, for opening `android/` in an IDE.
- Signing: release builds are signed with a private key kept **outside the repo**. `android/keystore.properties` (gitignored) points at it. **Back up the key**: without it you can't publish updates that install over the existing app.
- Build: `npm run apk`, which runs `cap sync`, a Gradle release build, and copies the APK to `dist/`.
- After changing anything in `www/`, rebuild the APK so the app gets the change. The web version updates when pushed.

### Google Play
[store/README.md](store/README.md) is the listing kit: store text, the answers for each Play Console form, release steps, and the listing images (icon, feature graphic, screenshots). Regenerate the images with `python scripts/store-assets.py`, which uses demo plants, never real data. `npm run apk` also builds the `.aab` bundle that Play needs. The privacy policy is [www/privacy.html](www/privacy.html), published at https://dayman92.github.io/plant-pals/privacy.html and linked from Settings › About.

### Web app on an Android phone
The app is an installable web app. Chrome on Android installs it like a normal app, with its own icon in the app drawer, opening full-screen and working offline. Chrome only offers to install over **HTTPS**, so the files need to be hosted somewhere first:

1. **Host it (free):** this repo deploys `www/` to **GitHub Pages** through the Actions workflow in `.github/workflows/pages.yml`, at `https://dayman92.github.io/plant-pals/`. Netlify or Cloudflare Pages also work.
2. **Install:** open that URL in **Chrome on the phone**, then tap ⋮ → **Install app** (or **Add to Home screen**).
3. **Update:** push changes to GitHub. The app picks them up the next time it's opened online.

Notes:
- **Your data stays on the phone.** Hosting only serves the app's files, and the repo contains no plant data. Plants you add and your watering history are stored in Chrome's storage for the app on your device. Use **Export backup** now and then, because uninstalling the app or clearing Chrome's data wipes them.
- **Moving plants onto the phone:** copy a backup `.json` file to the phone (by email, Drive, USB, etc.), then use **Import backup** in the app.

### On a computer

Open `www/index.html` directly in Chrome or Edge, or serve the folder:
```sh
python -m http.server 8000 -d www
```
Then visit http://localhost:8000. To get a phone-sized view, use the browser dev tools' device mode (F12 → Ctrl+Shift+M).

**Quick look on a phone (same Wi-Fi):** run the server above, then on the phone open `http://<PC-IP-address>:8000`. Windows may ask to allow Python through the firewall. This works for trying the app, but over plain HTTP Chrome won't install it or cache it for offline use; that needs the HTTPS hosting above.

## Roadmap
1. ✅ **My plants + rooms:** list plants grouped by room, filter and search, add/edit/delete plants, create/rename/delete rooms, assign plants to rooms.
2. ✅ **Watering:** a Today tab with overdue, due-now, watered-today and coming-up lists. Includes a water button, "Not yet", "Water all" and undo; an editable last-watered/next-due date and history per plant; and a due count on the Today tab.
3. ✅ **Plant picker:** choose from 120 common houseplants in 10 everyday groups, each with sensible winter defaults, or add your own.
4. ✅ **Plant characters:** Duolingo-style illustration per species, with happy / due / thirsty moods.
5. ✅ **Seasons:** spring/summer/autumn/winter ranges per plant, automatic or pinned season, and a banner on Today.
6. ✅ **Backup import / clear all:** restore or move data with a JSON file; the app ships with no starter data.
7. ✅ **Reminders:** daily local notifications in the Android app (Capacitor), scheduled three weeks ahead, recalculated after every change, paused on holiday days.
8. ✅ **Holiday mode** with a shareable sitter's plan; **monthly backup** reminders and automatic snapshots.
9. **Fun extras:** a watering streak, and a short celebration when the day's list is done.
