# WelNest Phase 3

## Consumed meals

The live barcode result now includes **Log to Daily Meals** and a portion field. Products labeled per 100 g take grams; serving-based products take a number of label servings. Calories, carbs, protein, and fat are scaled together. Logging is disabled if those four nutrient values are incomplete. A successful save updates Overview immediately, and the result button prevents repeated logging of that same result. A new scan can represent a separate meal.

Daily meal records are stored under `@welnest/meals/v1`, grouped by the device's local `YYYY-MM-DD` date. Each record retains its timestamp, portion, nutrients, and source. Updates serialize read/modify/write operations; retries replace the same record ID rather than duplicating it. Totals change only after storage succeeds. Meals can be removed from Overview. Previous dates remain available for the seven-day chart. Foreground changes and a 30-second check handle local date rollover.

The existing sample lunch controls now add/remove a persistent meal explicitly marked **demo**. Scans alone never increment consumed totals. Other meals in the sample schedule remain display content.

## Nutrition analytics

Overview now starts at zero recorded intake and calculates totals from stored meals. SVG charts show consumed carbohydrates, protein, and fat against goals; the calorie ring and the seven-day chart also use actual logs. Progress bars cap visually at their target, while text shows amounts above the target.

For completed adult profiles, the illustrative formula is 30 kcal/kg of saved weight. Macro energy shares are 50% carbs / 20% protein / 30% fat below BMI 25, and 45% / 25% / 30% at BMI 25 or above. Carbs and protein use 4 kcal/g; fat uses 9 kcal/g. The formula is transparent presentation logic and is **not an individualized clinical prescription**. No adult targets are generated for profiles under age 20 or incomplete profiles. Activity, pregnancy, and condition-specific requirements are not modeled. Weekly bars use the current profile's goal for comparison.

## Health report

**My Plan → Export Health Report** creates an A4 HTML/PDF summary with:

- Saved profile, measurements, BMI/category, conditions, blood group, and cycle preference.
- Current day's consumed nutrients and illustrative goals, including the formula assumptions.
- Today's logged meals and portions, with demo items labeled.
- The ten most recent viewed scans and their label energy basis, including unavailable values.

User/product strings are escaped before entering HTML. The report has no external asset requests. On Android/iOS, Expo Print generates a PDF and Expo Sharing opens the system share sheet; unavailable sharing falls back to printing. On web, a separate report preview has a **Print / Save as PDF** button so the browser prints the report rather than the app UI. Popup failures and export errors appear in My Plan. Export is blocked while meal storage has an unresolved error.

## Modules and tests

- `src/nutrition.ts`: typed portions, totals, local dates, target calculation, record validation.
- `src/storage.ts`: serialized daily meal persistence alongside existing profile/scan storage.
- `src/useNutrition.ts`: hydration, mutations, rollover, and shared nutrition state.
- `src/NutritionAnalytics.tsx`: responsive SVG analytics and meal list.
- `src/report.ts`: report HTML generation and escaping.
- `src/exportReport.ts`: native PDF/share and browser preview paths.
- `src/__tests__/`: Phase 2 regressions, meal/report tests, and export adapter tests.

Run `npm test`, `npm run typecheck`, and `npx expo lint App.tsx src`. Tests use a deterministic storage adapter and mocked native export modules; they do not substitute for physical-device acceptance testing.

New native dependencies are Expo-compatible `expo-print` and `expo-sharing`. The existing `builds/WelNest.apk` remains the Phase 1 binary; a new native build is required for these additions.

## Completed validation

- TypeScript strict check and lint over the app and `src/` pass.
- All 17 tests pass, covering the Phase 2 regressions plus portion scaling, date boundaries, durable meal writes/removal/retry, report escaping, and native/web export adapters.
- Android and web production bundles compile; generated Android configuration refreshes successfully.
- A representative two-page report was rendered to PDF and both pages visually checked, including long product names, unavailable calories, and heading placement at page breaks.
- Native PDF generation/sharing and camera-to-meal interaction still require physical-device acceptance testing. The browser automation tool could not initialize in this environment.

SDK references: [Expo Print](https://docs.expo.dev/versions/v57.0.0/sdk/print/) and [Expo Sharing](https://docs.expo.dev/versions/v57.0.0/sdk/sharing/).
