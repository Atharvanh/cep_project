# WelNest — Phase 1 Implementation Report (historical)

> This report describes the code before Phase 2. See [PHASE2.md](PHASE2.md) for the implemented persistence, BMI, camera, and API additions.

**Review date:** 13 October 2026  
**Scope:** Current application source, dependency lockfile, Expo/build configuration, and existing build documentation. This is a source audit, not a new device test.

## Executive assessment

WelNest is a populated, interactive, offline frontend prototype with five screens and a standalone Android APK. Navigation, profile editing, simulated scanning, meal toggling, hydration controls, recipe saving, community interactions, and appointment selection work within a running session.

**The current code does not implement BMI, AsyncStorage persistence, real camera/barcode scanning, OpenFoodFacts requests, a general Health Match engine, or historical analytics.** These should be planned as new functionality. UI labels describing personalization and AI are demonstration copy; the source explicitly identifies the results as simulated.

## 1. Tech stack and core dependencies

Exact resolved versions below come from `package-lock.json`, rather than interpreting the version ranges in `package.json`.

### Runtime

- Expo: **57.0.27** (declared `~57.0.27`).
- React / React DOM: **19.2.3** each.
- React Native: **0.86.3**.
- React Navigation native: **7.5.0** (declared `^7.5.0`).
- React Navigation bottom tabs: **7.20.0** (declared `^7.20.0`).
- React Native Screens: **4.26.2** (declared `~4.26.0`).
- React Native Safe Area Context: **5.7.0**.
- React Native SVG: **15.15.4**; circular progress visuals.
- React Native Web: **0.21.4** (declared `^0.21.2`).
- Expo Vector Icons: **15.1.1**; Ionicons imported directly.
- Expo Font: **57.0.4**; configured Expo plugin.
- Expo Linear Gradient: **57.0.2**.
- Expo Status Bar: **57.0.1**.
- Expo Metro Runtime: **57.0.16**.

### Development

- TypeScript: **6.0.3**, with `strict: true`.
- React types: **19.2.18**.
- ESLint: **9.39.5**.
- ESLint Config Expo: **57.0.2**.
- Prettier: **3.9.10**.
- npm lockfile present; no Bun lockfile.

### Requested libraries that are absent

- **NativeWind:** not installed or used. Styling is React Native `StyleSheet.create`, with inline responsive overrides.
- **expo-camera:** not installed or used.
- **AsyncStorage (`@react-native-async-storage/async-storage`):** not installed or used.
- **Expo Router:** not installed or used. This differs from the current `AGENTS.md` navigation convention.
- No application API client, persistent database, authentication SDK, or AI inference integration.

## 2. Project architecture

```text
cep_app/
├── index.ts                  Expo root registration
├── App.tsx                   Components, screens, context, navigation, styles
├── src/
│   └── data.ts               Static recipes, posts, doctors, slots, articles
├── assets/                   App icons and bundled food photographs
├── android/                  Generated native Android project
├── builds/                   WelNest.apk, checksum, installation notes
├── dist/                     Previously generated export artifacts
├── screenshots/              Presentation screenshot
├── app.json                  Expo identity, orientation, platform settings
├── eas.json                  Preview APK cloud-build profile
├── package.json
├── package-lock.json
├── tsconfig.json
├── eslint.config.js
└── README.md
```

### Runtime composition

`index.ts` registers `App`. `App` wraps `AppShell` in `SafeAreaProvider`. `AppShell` owns shared state and exposes it through a React context. Its `NavigationContainer` hosts one bottom-tab navigator:

1. **Overview → Dashboard:** daily calories/macros, hydration, reputation, recipes, wellness articles.
2. **My Plan → Plan:** sample daily schedule, lunch logging, saved recipes, profile editing.
3. **AI Lens → Lens:** food/barcode simulation and results sheet.
4. **Community → Community:** static members plus local likes, follows, comments, posts.
5. **Find Care → Care:** fictional providers, filters, slot selection, appointment list.

At widths of at least 900, a custom sidebar drives the same navigator through a ref and the bottom bar is hidden. There is no stack navigator, file-based routing, or configured URL/deep-link mapping. Onboarding, recipes, news, notifications, reputation, scan results, community dialogs, and booking use a shared React Native `Modal` wrapper, `Sheet`.

`App.tsx` is 2,979 lines and contains nearly all behavior. Reusable primitives include `Button`, `Chip`, `Heading`, `Ring`, `Avatar`, `Sheet`, and `Page`. Domain services, storage adapters, and separate screen modules have not been extracted.

### State ownership

- Shared state: profile, water count, saved recipe IDs, one lunch boolean, bookings, global dialogs, toast message.
- Screen-local state: scanner mode/result/loading; community likes/follows/comments/posts; provider follows/filter/selected slot.
- State uses `useState`, with refs/effects for timers and navigation. There is no hydration from disk. Restarting the app loses changes; screen-local state also resets if its component is unmounted.

Source anchors: `App.tsx:37` (profile), `App.tsx:198` (Sheet), `App.tsx:2049` (AppShell), `App.tsx:2245` (navigation area), `App.tsx:2452` (root).

## 3. Functional features and requested engine status

### 3.1 Local onboarding and BMI

**Implemented:** an optional, editable two-step profile modal initialized from the current profile. Startup uses a default Alex profile and opens Overview; there is no mandatory first-run gate.

- Captures name, age, blood type, gender, selected conditions/wellness interests, and a cycle-aware wellbeing boolean.
- Name is limited to 30 characters and must contain non-whitespace text. Age input removes non-digits, is limited to three characters, and must evaluate to 1–120 before proceeding.
- Conditions are toggleable strings: mindful sugar intake, high blood pressure, PCOS, food sensitivities, balanced nutrition.
- Cycle preference appears for Woman; changing to another gender clears the boolean. There are no cycle dates or predictions.
- Generation waits 2.4 seconds, writes the draft to shared state, then displays success. Closing/unmounting clears the timer.
- Saved profile text appears in greetings, My Plan, and Lens. The meal schedule and 2,100 kcal target remain fixed.

**Not implemented:** height, weight, BMI formula/classification, BMR/TDEE, goal derivation, or a health calculation engine. No AsyncStorage import, keys, writes, reads, schema migrations, hydration/loading state, or persistence error handling exists.

Source: `App.tsx:1782` (Onboarding), `App.tsx:1651` (Plan), `App.tsx:2052` (profile state).

### 3.2 AI Lens / barcode scanner

**Implemented as a UI simulation:** Food mode displays the bundled bowl photograph; Barcode mode displays the drink photograph. The shutter starts an animated scan line and a 2.3-second timer. Scanning disables the mode buttons and shutter. Completion opens a result modal. Animation and timer cleanup exist on unmount.

- Food result: 420 kcal, 52 g carbs, 14 g fat, 24 g protein; fixed ingredient text and a positive verdict.
- Barcode result: 180 kcal, 44 g carbs, 0 g fat, 1 g protein; fixed sugar/flavoring warnings and an explicitly fictional adulterant flag.
- Adding the Food result sets the shared `mealLogged` boolean to true. Repeated scans do not create multiple entries.
- The Barcode action changes the demo back to Food mode.

**Not implemented:** `CameraView`, camera permissions, barcode events, actual barcode values, image capture, recognition, autofocus/torch control, or device camera lifecycle management. The flash icon is decorative. There is no `expo-camera` integration.

Source: `App.tsx:705` (Lens).

### 3.3 OpenFoodFacts fetch and parsing

**Not implemented.** Application source contains no OpenFoodFacts URL, network fetch, Axios client, response model, product lookup, or nutrient/ingredient parser. All scanner values are inline literals.

Consequently, there is no product-not-found handling, request cancellation, timeout, retry/backoff, cache, missing-nutrient handling, serving-versus-100 g normalization, unit conversion, allergen parsing, or response validation. These are requirements for a future API feature, not failing branches of an existing integration.

### 3.4 Health Match / local recommendation logic

**One simple profile rule exists:**

```text
Food mode → Good for you
Barcode + conditions includes "Mindful sugar intake"
  → Avoid for your demo profile
Barcode without that condition → Consider an alternative
```

No numeric product score or generalized recommendation engine exists. Other conditions, blood type, age, gender, and cycle preference do not change food selection, macros, or targets. Condition strings are echoed in explanatory text.

Community `match` values are static labels. The Community screen does not read the profile to match users: Your circle shows all seeded posts, Mentors filters the fixed role, and Following filters locally followed IDs. Mentor status is assigned in data, not earned by a computed score. Provider filters are hardcoded doctor-ID selections, not health-based recommendations.

Source: `App.tsx:937` (verdict area), `App.tsx:1007` (Community), `App.tsx:1374` (provider filter), `src/data.ts:40` (seeded posts).

### 3.5 Local history and analytics

**Working session interactions:**

- Lunch can be logged/undone from Overview and My Plan; Lens can mark it logged.
- Calories switch from 1,420 to 1,840; protein 68→92 g; carbs 163→215 g; fat 48→62 g.
- Goals stay at 2,100 kcal / 120 g protein / 260 g carbs / 70 g fat.
- Hydration starts at five 250 ml glasses. Controls allow zero through eight glasses, updating the icons and liters.
- Recipes can be saved/unsaved and opened from My Plan.
- Appointments are stored in a session array and can be cancelled.

**No history engine:** there are no timestamped food/scan/water records, daily buckets, date rollover, history screen, aggregation functions, or persisted trends. The weekly graph is the fixed array `[72, 88, 65, 92, 78, 85, 71]`. Health rating remains 86/100; its 34/40, 27/30, 25/30 breakdown and +8 monthly change are fixed.

Source: `App.tsx:254` (Dashboard), `App.tsx:2053` (shared state), `App.tsx:2374` (rating).

### 3.6 Other working prototype interactions

- Community supports reversible follows/likes, seeded-plus-local comment counts, nonempty comments, and nonempty posts capped at 500 characters. New posts are shown as You. Following has an empty state. None of this is transmitted.
- Care offers three doctors, five fixed dates, and twelve times per day. A slot is unavailable when `(slotIndex + dayIndex + doctorId) % 4 === 0`, or when an existing session booking matches doctor/date/time.
- Changing day clears the selected slot; opening a provider resets selection. Confirmation requires a selected slot and rechecks availability. A confirmed booking appears in the session appointment list; cancelling removes it.
- Recipe ingredients/instructions, article content, reputation breakdown, and notification samples open in dialogs. Toasts dismiss after 3.2 seconds.

## 4. Mocked content inventory

- **Dashboard:** baseline intake, nutrition targets, weekly chart, reputation, monthly growth, demo date, notification reminders.
- **My Plan:** four fixed meals totaling 1,580 kcal; the UI explicitly notes that snacks/portions could fill the remaining target. Only lunch is loggable.
- **Lens:** both products, images, nutrient values, ingredient warnings, verdicts, and analysis delay.
- **Community:** three seeded posts/members, two mentors, background labels, ratings, timestamps, original likes/comments. Local edits change the presentation only.
- **Care:** three fictional providers, qualifications, clinics, ratings/reviews, prices, availability, and video-visit confirmation. Following does not create a subscription; no payments, real booking, or video call occurs.
- **Quick Bites:** two static recipes and two static wellness articles, not a live news feed.
- **Onboarding:** generation and personalization are simulated; the profile form itself is interactive.

## 5. Known limitations and audit findings

### Confirmed functional limitations

1. **No durable state.** Profile and all activity disappear after restart; no completed-onboarding flag exists.
2. **Calendar is frozen.** Overview shows Monday, 12 October; booking uses 13–17 October 2026 and IST labels. There is no current-time comparison, timezone conversion, or past-slot rejection.
3. **Single-meal model.** `mealLogged: boolean` cannot represent multiple meals, portions, scan history, or different days. Baseline totals are unrelated to stored meal records because those records do not exist.
4. **Incomplete condition handling.** Food sensitivities are not collected as specific allergens or checked. The bowl always receives a positive verdict despite its sesame notice; high BP/PCOS/cycle preferences do not affect recommendations.
5. **Comment draft crosses threads.** One `comment` state variable is shared by all post dialogs and is not reset when closing or opening a different thread. Type a draft on one post, close it, open another: the same draft remains.
6. **No account or social synchronization.** User-created posts have no persistent ID, timestamp, edit/delete controls, or like/comment controls equivalent to seeded posts. Notifications are static and never marked read.
7. **Booking is local only.** No cross-provider overlapping-time prevention, server locking, reminders, payment, video session, or durable booking identifier.
8. **Navigation convention mismatch.** Current React Navigation architecture predates and does not follow the now-required Expo Router / `src/app` convention in `AGENTS.md`.

### Engineering and UX risks requiring targeted testing

- `React.createContext<any>`, numerous `any` props, and an untyped navigation ref weaken otherwise-strict TypeScript protection.
- One large module and one broad context couple unrelated features; context updates can rerender consumers unnecessarily. ScrollView plus mapped arrays is suitable for the small fixtures but is not a scalable feed implementation.
- Scan cleanup runs on unmount, not tab blur. If Lens stays mounted after switching tabs, its timer can finish and open a result modal while another tab is active. This follows from the code and should be checked on-device.
- Modal forms have scrolling but no explicit keyboard-avoidance component. Keyboard visibility, focus, and dismissal need phone testing.
- Some rows have fixed/minimum widths, hydration icons use an unwrapped row, and several labels use 8–12 pt text. Narrow screens, large text settings, and long profile names may expose clipping or crowding. This review did not reproduce a visual regression.
- Tab heights/bottom padding are fixed per OS rather than explicitly based on bottom insets. Check gesture navigation and device safe areas.
- Buttons often have roles/labels, but accessibility coverage is incomplete; screen-reader announcements, selected states on all controls, contrast, focus order, and minimum touch targets need an audit.
- No error boundary or automated unit/component/end-to-end test suite was found in the application files.
- Camera denial and API timeout handlers are absent because the corresponding real features are absent. They must accompany those implementations.

### Build and verification boundaries

- This audit reran explicit application lint (`expo lint App.tsx src/data.ts`) and TypeScript checking (`tsc --noEmit`); both exited successfully with no diagnostics. These checks do not establish runtime correctness.
- Existing `builds/WelNest.apk` is 44,535,469 bytes. Its installation notes record a successful standalone release build, signature/package/architecture/assets checks, and support for ARM64/ARMv7 on Android 7+.
- It uses a demo signing certificate. The EAS preview profile produces APK output; cloud-build configuration does not mean a cloud build or account setup has been completed.
- Prior build documentation explicitly states that physical-device installation/runtime testing has not been performed. This audit does not replace that test.

## 6. Suggested next-phase implementation order

1. Extract typed profile, product, food-log, and booking models; split screens/components/services. Resolve the Expo Router convention before adding more navigation flows.
2. Add durable local storage with schema versioning, safe hydration, validation, recovery, and date-keyed records. Establish persistent onboarding completion and clear/reset controls.
3. Add height/weight with explicit units and input validation, then a separately testable BMI calculation and appropriately scoped interpretation. Keep profile calculations independent of presentation components.
4. Add real barcode capture with permission/denial states, duplicate-scan protection, focus-aware camera lifecycle, and a manual barcode fallback. Photo-based food recognition is a separate feature.
5. Add product lookup through a dedicated OpenFoodFacts adapter with validated responses, units/serving normalization, missing-data states, cancellation, timeouts, and caching.
6. Implement transparent, testable profile/product rules with reasons and an unknown/insufficient-data outcome. Do not equate absent nutrient data with a safe result.
7. Replace demo totals/charts with aggregates from timestamped logs. Test repeat entries, undo/delete, midnight rollover, timezone changes, and restart persistence.
8. Run device QA for permissions, offline behavior, network failures, keyboard/safe areas, accessibility, and state restoration before extending live community or telehealth services.

This order is a planning proposal; none of these new features was added during the audit.
