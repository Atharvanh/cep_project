# WelNest — Faculty Evaluation Guide

## 1. Two-minute pitch script

Read at roughly 135–145 words per minute. Pause briefly before beginning the device demonstration.

> Good morning. WelNest addresses a familiar problem: packaged food can look healthy while its label tells a different story. Sugars and serving sizes are easy to overlook, and a general nutrition label does not explain how a choice relates to our own daily goals.
>
> Our solution is an Expo and React Native app that connects product facts with a locally saved health profile. The user enters height, weight, age, and health interests. TypeScript utilities calculate adult BMI and illustrative daily targets using 30 calories per kilogram. AsyncStorage preserves the profile and activity across restarts, without a custom backend.
>
> In AI Lens, expo-camera reads a product barcode. A synchronous lock and cooldown prevent repeated detections from flooding the lookup. Open Food Facts supplies nutrition values, Nutri-Score, and NOVA classification. We deliberately chose a live product API over training a basic image model on a static Kaggle snapshot: we need identifiable products and structured nutrition facts that can be updated independently of our app.
>
> Our local Health Match engine then explains the choice. For an adult overweight or obese profile, a D or E score, or high sugar, triggers a warning. The user can enter a portion and log it as consumed. Grams and servings are scaled correctly, and saved daily totals immediately update our custom SVG charts.
>
> Finally, the user can export an A4 PDF containing profile, BMI, goals, meals, and recent scans, and open the phone’s native share sheet for a discussion with a nutritionist.
>
> Our engineering achievement is a complete path from scan to explanation, action, and a portable record, with testable rules and visible failure states. These are transparent prototype targets, not a medical prescription. I’ll now demonstrate that path on the phone.

## 2. Technical defense: live API versus a Kaggle model

We deliberately selected the Open Food Facts API because WelNest's core task is **packaged-product identification and nutrition interpretation**, rather than visual food-category classification. A barcode lookup returns structured label fields through a common schema for products contributed across markets; it can access database updates without shipping a new dataset or retraining a model. A basic image classifier trained on a static Kaggle snapshot would introduce labeling, preprocessing, model evaluation, deployment, and retraining work while still needing a reliable mapping from an image class to an exact product and its nutrient values. The API approach therefore gives this project a clearer interface, simpler maintenance, and more explainable results. This is a scope-driven engineering decision, not a claim that Kaggle datasets or machine learning are inherently inferior: curated datasets remain valuable for experiments and future recognition research. “Live” means fetched at lookup time, not guaranteed up-to-the-minute correctness; records may be missing, incomplete, or outdated. Growth also requires respecting API limits and considering caching. The provider documents these data-quality and usage constraints. [Open Food Facts API documentation](https://openfoodfacts.github.io/openfoodfacts-server/api/).

**Use this wording:** “Live access to a globally contributed product database with structured nutrition fields.” Avoid claiming every product is covered, every record is current, or our app trained an AI model. AI Lens is the feature name; current intelligence consists of barcode decoding and local rules.

## 3. Physical Android live-demo flow

### Prepare before the session

- Build and install the **current** preview APK. The existing `builds/WelNest.apk` is the older Phase 1 artifact and does not include the completed flows.
- Charge the phone and verify internet access. New lookups require connectivity; saved profiles, meals, charts, and report content are local.
- Use fictional profile details. Preflight one physical high-sugar packaged product with complete calories/carbs/protein/fat data. Check its actual barcode and API coverage beforehand. `3017620422003` is a previously verified Nutella lookup, useful for manual-entry fallback; it may differ from the barcode on your package.
- Rehearse camera permission and PDF generation/sharing on the same installed APK. Confirm a PDF viewer or appropriate save destination is available.
- Start with no consumed meals for today, or note the starting total. Remove rehearsal meals using Overview so the calorie increase is easy to show.

### Demonstration sequence

1. **Create the profile.** On first launch, complete onboarding. On subsequent launches, use the top-right profile avatar or My Plan → Edit preferences. Enter name **CEP Demo**, age **22**, height **170 cm**, weight **80 kg**, and **Mindful sugar intake**. Select any demo gender/blood type. Choose **Save my profile**, then close the success screen. Explain that BMI is approximately **27.7**, classified **Overweight**, and the illustrative calorie target is **2,400 kcal**.
2. **Show the saved starting point.** Open Overview. Explain the target split: **270 g carbs, 150 g protein, 80 g fat** for this profile. Show current consumed totals separately from those targets.
3. **Scan a real product.** Open AI Lens → Live barcode. Allow camera access if prompted. Align the barcode and hold it steady. Say: “The event locks immediately while one lookup runs.” If camera access or packaging fails, use **Enter barcode → Look up product** with the preflighted numeric code.
4. **Explain the result.** Show product name, brand, per-100 g or per-serving nutrition, Nutri-Score, and NOVA. For the preflighted D/E or high-sugar product, point to **Warning: High sugar/fat for your BMI goal**. Explain that this is an explicit local rule, not a medical diagnosis or adulterant detector. NOVA describes processing; it is not an individual safety verdict.
5. **Log the consumed portion.** For a per-100 g result, enter **25** grams and tap **Log to Daily Meals** once. Wait for **Logged to Daily Meals**. Show that the button prevents a second log of the same result. Explain the formula: each label value is multiplied by **25/100**. If the live label shows 539 kcal/100 g, that portion adds 134.75 kcal; use the actual returned value during the demo. Serving-based results instead take the number of servings.
6. **Show analytics.** Move the package out of camera view, close the result sheet, and open Overview. Point to the new meal, updated calorie ring, and SVG macro bars. Show **Last 7 days**: the bars use recorded daily meals. Recent Scans is a separate list of products viewed. A scan becomes intake only after explicit logging.
7. **Show persistence.** Close and reopen the app if time permits. The profile and today's meal totals should survive. Skip this step if it would interrupt the timed presentation; rehearse it beforehand.
8. **Export the report.** Open My Plan → **Export Health Report**. Show the generated PDF through the native share sheet's available viewer/save workflow. Point out profile, BMI, goals, consumed meals, and recent scans. Sharing is user-directed; the app does not automatically send the report to a clinician.
9. **Defend the architecture on-device.** Return to My Plan → **View System Architecture**. Show the data flow and the technology responsibilities. Close with: “We integrate live product facts with local, persistent, explainable actions.”

### If a live lookup fails

Keep the failed state visible briefly: demonstrate the product-not-found or connection message and that another lookup can be attempted. Use a second **preflighted** product or the manual barcode field. Saved history alone cannot recreate a full live result, because it stores a simplified record. If internet remains unavailable, demonstrate the already saved meals/charts and PDF, and identify the live lookup as the unavailable step. Do not present the Food demo as successful product recognition.

## 4. Anticipated faculty Q&A

### Q1. “Where is the AI? Why not train a model using Kaggle?”

The current app uses camera barcode decoding and a deterministic recommendation engine. We have not trained an image model. For packaged foods, an exact barcode and structured nutrition values fit our task better than a category prediction from a small image dataset. Separating data retrieval from evaluation makes the reasons testable. Future photo recognition would be a separate feature with a labeled dataset, held-out evaluation, and uncertainty handling.

### Q2. “How do you prevent duplicate scans, duplicate meals, and incorrect serving calculations?”

A ref locks the scanner synchronously before the request, and a five-second cooldown suppresses repeated camera events for the same code. Requests have cancellation and a 12-second timeout. Logging uses one stable ID for each result, disables repeat submission after saving, and serializes storage updates. Per-100 g values scale by grams/100; serving values scale by serving count. Incomplete calorie or macro data blocks meal logging instead of silently counting missing values as zero.

### Q3. “Are your BMI targets and product verdicts clinically validated?”

No. BMI is computed as kg/meters², and adult categories are applied from age 20. Targets use a transparent 30 kcal/kg presentation formula; the macro split changes at BMI 25. Health Match warns on D/E or sugars above 22.5 g/100 g for an adult overweight/obese profile, while A/B is positive unless the warning takes priority. These are explicit prototype rules. Clinical deployment would require validated targets, professional review, and activity/condition-specific assessment; recorded blood type does not drive recommendations.

### Q4. “What happens without internet, and how is user health data protected?”

Profiles and meals are stored locally, so saved totals, charts, and report content remain available without a custom server. New product lookups need internet; unknown, incomplete, timed-out, and failed responses have visible recovery states. The app sends the barcode to Open Food Facts, not the saved profile. AsyncStorage is unencrypted, so we use fictional details for evaluation; production health-data storage would need stronger protection and lifecycle controls. PDF sharing occurs only through the user's action.

## 5. Technical facts to keep consistent

- Calculation occurs in TypeScript utilities; AsyncStorage supplies persistence, not computation.
- Barcode identity, label nutrition, Nutri-Score, and NOVA are different layers; Nutri-Score and NOVA are not personal medical scores.
- The endpoint currently used is `/api/v2/product/{barcode}`. Provider documentation now recommends v3 for new integrations; migration belongs in the roadmap, not in claims about the current build. [API version guidance](https://openfoodfacts.github.io/openfoodfacts-server/api/).
- Tested engineering boundaries include BMI thresholds, missing nutrients, unit conversion, portion scaling, local dates, concurrent writes/retries, report HTML escaping, and export adapter failures. The current automated suite has **17 passing tests**; it does not replace phone acceptance testing.
- Community, Care bookings, reputation, recipes/news, and Food photo mode contain demo content. The complete live demonstration is the profile → barcode → Health Match → meal → chart → PDF path.

## 6. Final build and handover

After validating the current source, authenticate to Expo/EAS if needed and run:

```sh
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

The existing `preview` profile specifies internal distribution and `android.buildType: "apk"`. Complete project/signing setup if EAS prompts for it, download the resulting APK from the build link, install it on the demonstration phone, and rehearse the exact sequence above. The cloud build bundles the app; live API requests still need internet. [Expo physical-device APK instructions](https://docs.expo.dev/build-reference/apk/).
