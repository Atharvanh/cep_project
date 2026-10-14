# WelNest Phase 2

## Implemented

- **Durable profile:** onboarding collects height in centimeters and weight in kilograms alongside existing fields. Validated profile data and recomputed BMI are saved before the success screen. Startup hydrates profile/history before mounting the main UI; valid saved profiles skip onboarding. Missing profiles open onboarding automatically.
- **BMI:** `src/health.ts` computes kg / meters² and classifies unrounded adult BMI at 18.5, 25, and 30. Under-20 profiles keep the numeric value without an adult category. The UI displays one decimal. Accepted measurement ranges are 50–260 cm and 10–500 kg.
- **Camera:** `expo-camera` 57.0.6 with native permission request, denied/access-settings fallback, mount-error recovery, and focus/foreground-aware camera mounting. Barcode events are locked synchronously during a lookup/result; repeated camera events for the same code have a five-second cooldown. Manual barcode lookup is available without camera access.
- **Products:** `src/products.ts` fetches OpenFoodFacts v2 with a 12-second timeout and cancellation on mode/tab/background changes. It parses name, brand, image, energy/macros/sugars, Nutri-Score, and NOVA. It prefers a consistent 100 g basis, falling back to serving values when 100 g values are absent. Missing data stays null, not zero. Lookup failures and missing products unlock scanning and show feedback.
- **Health Match:** an adult Overweight/Obese profile plus D/E or more than 22.5 g sugars per 100 g yields the requested warning. This warning takes priority over A/B. Otherwise A/B yields the requested positive verdict; other/unknown cases prompt label review. This is a simple product rule, not a clinical diet engine. Serving-only sugars are never compared directly against a per-100 g threshold.
- **Recent Scans:** opening a successful barcode result saves timestamp, name, calories, and nutrition basis. The latest five appear below Overview's nutrition section. History keeps at most 100 records, newest first. Serialized read/modify/write operations avoid lost updates, and retry uses the same ID to avoid duplicates. Storage failure has an explicit retry action.

## Storage

AsyncStorage **2.2.0** is installed using Expo's SDK-compatible installer.

- `@welnest/profile/v1`: normalized profile including BMI/category.
- `@welnest/scans/v1`: scan record array.
- Reads validate saved data; corrupt history is reported and is not silently overwritten.
- AsyncStorage is local, unencrypted persistence. Profile data is not sent to OpenFoodFacts; lookup sends the barcode. No account synchronization is implemented.
- Hydration, meals, recipes, community, and appointments retain their existing session-only behavior. Scanning records a viewed product, not food consumed.

## Preserved boundaries

The existing bottom-tab navigation, modal shell, and StyleSheet approach remain. Food mode is explicitly a sample bowl demonstration; it does not recognize photos. Community, telehealth, fixed meal plans, and dashboard nutrition goals remain prototypes. No adulterant detection is claimed.

The previous implementation report is retained as a historical Phase 1 audit.

## Validation

- `expo lint App.tsx src`: passed.
- `tsc --noEmit`: passed.
- `npm run test:phase2`: nine tests passed, covering BMI boundaries, profile normalization/minor handling, nutrient basis/nulls/units, verdict priority, persistence roundtrips/failures, concurrent/history-limit behavior, HTTP failures, cancellation, and timeout.
- Android and web production bundle exports: passed.
- Expo Android prebuild: passed. Generated manifest includes camera permission; audio recording permission is not requested by the camera plugin configuration.
- Public OpenFoodFacts lookup with sample barcode `3017620422003`: returned a real product, nutrition, Nutri-Score, and NOVA response.
- Native device camera, actual device persistence across restarts, and rendered UI interaction remain unverified. The browser automation tool failed to initialize in this environment.

## Build and device acceptance

**`builds/WelNest.apk` is still the older Phase 1 binary.** This task updates source and native configuration; a fresh native build is required to include the new modules. For the configured cloud APK workflow:

```sh
npx eas-cli@latest build --platform android --profile preview
```

On a fresh native build, verify:

1. Enter measurements, save, close/restart the app, and confirm the greeting/BMI survive without onboarding reopening.
2. Deny camera permission; verify manual lookup works and Settings/retry guidance is usable. Grant permission and scan a physical EAN/UPC barcode.
3. Hold the barcode in view: one request and one result/history entry should be produced until the result is closed.
4. Test an unknown product, offline connection, timeout, tab change during lookup, and background/resume.
5. Confirm live result values, nutrition basis, and Recent Scans survive restart. Scans must not alter consumed-calorie totals.
6. Check keyboards, narrow screens, large text, modal dismissal, and Android gesture-navigation insets.

## Reference documentation

- [Expo SDK 57 Camera](https://docs.expo.dev/versions/v57.0.0/sdk/camera/)
- [Expo SDK 57 AsyncStorage](https://docs.expo.dev/versions/v57.0.0/sdk/async-storage/)
- [OpenFoodFacts v2 reference](https://openfoodfacts.github.io/openfoodfacts-server/api/ref-v2/)
- [CDC adult BMI categories](https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html)
