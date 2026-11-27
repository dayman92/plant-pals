# Google Play listing kit

Everything needed to publish Plant Pals on Google Play: listing text, images, and the answers for each Play Console form. The images are made by `python scripts/store-assets.py` from a demo collection of plants. Re-run it after UI changes.

| File | Play Console field | Spec |
|---|---|---|
| `icon-512.png` | App icon | 512 × 512, 32-bit PNG |
| `feature-graphic.png` | Feature graphic | 1024 × 500, 24-bit PNG |
| `screenshots/01-07` | Phone screenshots | 1080 × 1920 (Play needs 2–8; upload all 7) |
| `dist/PlantPals-<version>.aab` | Release (the app itself) | Android App Bundle, built by `npm run apk` |

---

## 1. Store listing (Grow users → Store presence → Main store listing)

**App name** (max 30 characters)
> Plant Pals: Watering Tracker

**Short description** (max 80 characters)
> Houseplant watering reminders, light needs and care tips. No ads, no account.

**Full description** (max 4,000 characters)

> Plant Pals keeps your houseplants happy, telling you who needs a drink today and how to water them properly.
>
> 💧 KNOW WHO NEEDS WATER
> • A Today list of plants that are due, overdue or coming up, with one tap to mark them watered (and undo)
> • A gentle daily reminder at a time you choose, only on days when something needs watering
> • Watering windows instead of rigid dates: "due today, fine to wait 2 more days". Plants are watered when they need it, not by the calendar
>
> 🪴 120 HOUSEPLANTS BUILT IN
> • Pick from 120 common houseplants in everyday groups (leafy, trailing, succulents, cacti, herbs, flowering and more), or add your own
> • Each comes with sensible watering intervals for spring, summer, autumn and winter, and switches automatically with the seasons
> • A cheerful character for every plant, which looks thirsty when it's overdue
> • Organise plants by room
>
> 🌞 CARE THAT FITS EACH PLANT
> • How to water: from the top, from below, soak and drain, or into the cup
> • Light needs at a glance: full sun, half sun or shade
> • Rain or tap water (you can hide this if you only use tap)
> • An illustrated watering guide: bottom-watering, rain versus tap water, light, and spotting over- and under-watering
>
> 🏖️ HOLIDAY MODE
> Going away? Tell Plant Pals when, and how often someone can pop round. It works out which plants to water on each visit and writes a plan you can send to your plant sitter. They don't need the app.
>
> 🔒 PRIVATE BY DESIGN
> • No account, no ads, no tracking
> • Your plants stay on your phone. Nothing is sent to us or anyone else
> • Back up to a file whenever you like (Drive, email, Files), with a monthly reminder
> • Works fully offline
>
> 🌙 Light and dark themes, following your phone's setting.

**App category:** House & Home
**Tags** (choose up to 5 from Play's list): Home & garden, Reminders, Lifestyle (pick the closest Play offers)
**Contact email:** required, and shown publicly on the listing (your choice; it can be a dedicated address)
**Website:** https://dayman92.github.io/plant-pals/
**Privacy policy:** https://dayman92.github.io/plant-pals/privacy.html

**Release notes** for the first release:
> First release of Plant Pals 🌱 Track your houseplants by room, get a daily watering reminder, and learn how much light and water each plant likes.

---

## 2. App content (Policy → App content)

| Form | Answer |
|---|---|
| **Privacy policy** | https://dayman92.github.io/plant-pals/privacy.html |
| **Ads** | No, the app doesn't contain ads |
| **App access** | All functionality is available without special access (no login) |
| **Content rating** | Category: *All other app types*. Answer **No** to every question (no violence, sexual content, language, drugs, gambling, user interaction or sharing of location; there's no user-to-user content). Expected rating: PEGI 3 / Everyone |
| **Target audience** | 13–15, 16–17 and 18+. Leave the under-13 groups unticked: the app isn't designed for children, and including them brings in the Families policy requirements. *Appeals to children?* No |
| **Data safety** | *Does your app collect or share any of the required user data types?* **No.** This gives the label "No data collected" and "No data shared". (Exported backups and sitter plans are shared by the user through Android's share sheet; that doesn't count as the developer collecting data.) |
| **Account deletion** | Not applicable: the app has no accounts |
| **Advertising ID** | No, the app doesn't use the advertising ID |
| **Government app / Financial features / Health / News / COVID-19** | No / None / No / No / No |
| **Permissions** | Notifications (reminders) and Run at start-up (restores reminders after a restart). There are no sensitive permissions, so no declarations are needed |

---

## 3. Releasing

1. **Create the app** in Play Console. Name: Plant Pals: Watering Tracker. Default language: English (United Kingdom). App, Free.
2. **Play App Signing:** accept the default. Google keeps the key that signs the copies people download. Our keystore (in `MiscFiles/plant-pals-signing/`) becomes the **upload key** that proves updates come from you. If it's ever lost, Google can reset an upload key, but keep it backed up anyway.
3. **Internal testing** (Test and release → Testing → Internal testing): upload the `.aab`, add yourself as a tester, and install from the Play link. There's no review wait, so it's a quick sanity check.
4. **Closed testing**, required for new personal developer accounts. Create a closed track, upload the same `.aab`, and add **at least 12 testers** (their Google account emails, or a Google Group). They must opt in from the link and stay opted in for **14 days in a row**. Ask them to actually open the app a few times; Google can refuse production access if testers never use it.
5. **Apply for production** (Dashboard) once the 14 days are up. You answer a few questions about the test. Approval usually takes a few days.
6. **Production release:** promote the tested build, choose countries (e.g. UK first, or worldwide), and submit for review.

**For each update:** bump `versionCode` (must always increase) and `versionName` in `android/app/build.gradle`, run `npm run apk`, and upload the new `.aab`.

**⚠️ Sideloaded copy vs Play copy:** builds from Google Play are signed by Google's key, so Android treats them as a different app from the APK you installed yourself. Before installing from Play, **export a backup** in the sideloaded app, uninstall it, install from Play, then import the backup.
