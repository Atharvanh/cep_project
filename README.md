# WelNest

WelNest is a college CEP health and nutrition project built with React Native, Expo SDK 57, and strict TypeScript. It helps users connect packaged-food labels with their saved profile, daily consumed nutrients, and an exportable health summary.

For faculty evaluation, start with [FACULTY_PITCH.md](FACULTY_PITCH.md): the two-minute script, API-versus-dataset defense, physical-device demonstration, and technical Q&A. **My Plan → View System Architecture** displays the system's technology and data flow on the device.

## Completed features

- **Durable profile and BMI:** onboarding collects age, gender, height in cm, weight in kg, blood group, conditions, and optional cycle preference. TypeScript calculates BMI; AsyncStorage persists the normalized profile. A saved profile restores on startup and skips onboarding.
- **Daily targets:** adult profiles use an illustrative `30 × weightKg` calorie formula. Below BMI 25 the macro energy split is 50% carbs / 20% protein / 30% fat; at BMI 25 or above it is 45% / 25% / 30%. Carbs/protein use 4 kcal/g and fat 9 kcal/g. No adult targets/categories are applied to under-20 profiles. These presentation rules do not model individual clinical needs.
- **Live barcode lookup:** expo-camera reads EAN/UPC and other configured product codes. Synchronous locking, a five-second same-code cooldown, focus-aware camera mounting, permission guidance, and manual barcode input support recovery.
- **Live product facts:** Open Food Facts v2 supplies name, brand, image, calories, macros/sugars, Nutri-Score, and NOVA. The adapter uses a consistent per-100 g or per-serving basis, preserves missing data, converts kJ when needed, and handles not-found, HTTP/network errors, timeout, and cancellation.
- **Local Health Match:** an adult overweight/obese profile plus D/E or sugar above 22.5 g/100 g yields an explained warning. A/B yields a positive verdict when the warning rule does not take priority; unknown results prompt label review.
- **Portion-based meals:** Log to Daily Meals scales nutrients by grams/100 or the number of servings. Complete calorie/carbs/protein/fat data is required. Meals persist by local date, can be removed, and use serialized/idempotent storage updates.
- **SVG analytics:** the calorie ring, macro progress bars, consumed-meal list, and seven-day chart use persisted intake records. Recent Scans remains a separate record of products viewed.
- **Native health report:** My Plan → Export Health Report generates an A4 PDF with profile, BMI, goals, today's meals, and the latest ten scans. expo-print and expo-sharing open the device share workflow, with printing as a fallback. Web opens a report preview with Print / Save as PDF.
- **Presentation UI:** five bottom tabs on mobile, a sidebar on wide screens, reusable dialogs, recipe saving, hydration controls, and populated Community/Care demo interactions. My Plan includes a scrollable System Architecture modal.

The deliberate API choice fits packaged-product identification: it retrieves structured product facts at lookup time without distributing or retraining a basic image model. Data is globally contributed and can be updated; individual records are not guaranteed current, complete, or accurate. See the [Open Food Facts documentation](https://openfoodfacts.github.io/openfoodfacts-server/api/) and the fuller defense in the faculty pitch.

## Run locally

Use Node.js 22.13 or newer, npm, and the committed lockfile:

```sh
npm ci
npm start
```

For the browser preview:

```sh
npm run web
```

A native build is required to include added device modules. Android local development uses `npm run android`; iOS local builds require macOS. The standalone APK built below runs without Expo Go or a development server. Internet is required for new product lookups.

## Generate the final physical Android APK

The committed `eas.json` already defines a `preview` profile with `distribution: "internal"` and `android.buildType: "apk"`. The custom `.easignore` excludes generated native directories so EAS can generate them from app configuration.

1. Install dependencies and run the checks below.
2. Sign in once if no Expo account session is available:

   ```sh
   npx eas-cli@latest login
   ```

3. Start the final preview build:

   ```sh
   npx eas-cli@latest build --platform android --profile preview
   ```

4. Complete any initial Expo project linking and Android signing prompts. No local Android Studio is required for the EAS cloud build.
5. Download the resulting **APK** from the build link. Open it on the physical Android phone and follow the installation prompt. If updating an installation signed with a different demo certificate fails, use a clean test installation; uninstalling loses locally saved app data.
6. Rehearse profile restoration, camera permissions, product lookup, portion logging, charts, and PDF sharing on that exact APK before evaluation.

**Artifact status:** `builds/WelNest.apk` is the older Phase 1 demo, not the final Phase 3 build. This repository preparation adds the architecture modal and build instructions; it does not create a new cloud APK. Use the command above to generate the current binary. See [Expo's APK build/install guide](https://docs.expo.dev/build-reference/apk/).

## Quality checks

```sh
npm test
npm run typecheck
npx expo lint App.tsx src
npx expo-doctor
```

The current suite contains 17 regression tests under `src/__tests__/`, covering BMI, API parsing/errors, portion scaling, date boundaries, persistence, report escaping, and native/web export adapters. Unit tests use controlled storage and native-module substitutes. Physical-device camera and share-sheet acceptance must be performed on the final build.

For a static web export:

```sh
npm run export:web
```

Serve `dist/` through an HTTP server. Prior validation also compiled the Android JavaScript bundle; bundle export alone is not an installable APK.

## Evaluation walkthrough

1. Save an adult demo profile with height/weight and show the BMI-based illustrative targets.
2. Open AI Lens and scan a preflighted packaged-food barcode.
3. Explain label macros, Nutri-Score, NOVA, and the local Health Match verdict.
4. Enter grams or servings and choose Log to Daily Meals.
5. Show Overview's consumed totals, SVG charts, meal removal, and Recent Scans.
6. Show My Plan → Export Health Report and the native PDF/share workflow.
7. Show My Plan → View System Architecture to defend the technology choices.

For exact demo values, camera/network fallback, and faculty answers, use [FACULTY_PITCH.md](FACULTY_PITCH.md).

## Architecture and source layout

- `App.tsx`: shared context, existing React Navigation bottom tabs, screens, and modal shell.
- `src/health.ts`: typed profiles/products, BMI, profile validation, and Health Match.
- `src/products.ts`: Open Food Facts fetching and response normalization.
- `src/storage.ts`: AsyncStorage profile, scan history, and daily meal storage.
- `src/nutrition.ts`: portion conversion, nutrient totals, local dates, and target rules.
- `src/useNutrition.ts`: meal hydration/mutations and date rollover.
- `src/NutritionAnalytics.tsx`: SVG analytics and consumed-meal controls.
- `src/report.ts`, `src/exportReport.ts`: escaped HTML summary and platform export adapters.
- `src/ArchitectureSummary.tsx`: device-visible technology overview.
- `src/data.ts`, `assets/images/`: seeded presentation content and bundled imagery.
- `src/__tests__/`: regression suites and a report-layout fixture generator.
- `app.json`, `eas.json`: native plugins, app identity, and build profiles.

Styling remains `StyleSheet.create`. Navigation remains the existing tab shell. There is no custom backend, authentication, payment flow, or trained image model. The API endpoint remains v2; the provider now recommends v3 for new integrations, so migration is a future maintenance task.

## Data and prototype boundaries

Profiles, the latest 100 simplified scan records, and meals grouped by local date persist locally. Saved chart/report content can be used offline; a scan-history record does not include all fields needed to recreate a full product lookup. AsyncStorage is unencrypted; use fictional profile details for the faculty demonstration. Product requests send the barcode, not the saved profile. PDF sharing is user-directed.

Community members/mentors, reputation, doctors, appointments, prices, sample meal plans, recipes, and wellness articles contain demo content. Food-photo mode is explicitly simulated, and the app does not detect adulterants. Care availability retains fixed October 2026 demonstration dates. Hydration and social/recipe/booking interactions remain session-only. Overview nutrition totals and dates are driven by actual local meal records.

Additional implementation detail: [PHASE2.md](PHASE2.md), [PHASE3.md](PHASE3.md). [WELNEST_TECHNICAL_REPORT.md](WELNEST_TECHNICAL_REPORT.md) is retained as a historical Phase 1 audit.

## Photography

Representative presentation photos are bundled from Unsplash:

- Bowl: images.unsplash.com/photo-1511690743698-d9d85f2fbf38
- Toast: images.unsplash.com/photo-1525351484163-7529414344d8
- Drink: images.unsplash.com/photo-1600271886742-f049cd451bba
