import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizeProfile } from "./health";
import type { Profile, ScanRecord } from "./health";
import { validateMealDays } from "./nutrition";
import type { Meal, MealDays } from "./nutrition";

export const MEALS_KEY = "@welnest/meals/v1";
export async function loadMeals(): Promise<MealDays> {
  const raw = await AsyncStorage.getItem(MEALS_KEY);
  return raw === null ? {} : validateMealDays(JSON.parse(raw));
}
let mealQueue: Promise<unknown> = Promise.resolve();
export function updateMeal(
  date: string,
  id: string,
  meal: Meal | null,
): Promise<MealDays> {
  const operation = mealQueue.then(async () => {
    const days = await loadMeals();
    const next = {
      ...days,
      [date]: [
        ...(days[date] || []).filter((m) => m.id !== id),
        ...(meal ? [meal] : []),
      ],
    };
    validateMealDays(next);
    await AsyncStorage.setItem(MEALS_KEY, JSON.stringify(next));
    return next;
  });
  mealQueue = operation.catch(() => undefined);
  return operation;
}

export const PROFILE_KEY = "@welnest/profile/v1";
export const HISTORY_KEY = "@welnest/scans/v1";

export async function loadProfile(): Promise<Profile | null> {
  const value = await AsyncStorage.getItem(PROFILE_KEY);
  return value === null ? null : normalizeProfile(JSON.parse(value));
}
export async function saveProfile(profile: Profile): Promise<Profile> {
  const normalized = normalizeProfile(profile);
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
  return normalized;
}
export async function loadScanHistory(): Promise<ScanRecord[]> {
  const value = await AsyncStorage.getItem(HISTORY_KEY);
  if (value === null) return [];
  const data: unknown = JSON.parse(value);
  if (
    !Array.isArray(data) ||
    !data.every(
      (r) =>
        r &&
        typeof r.id === "string" &&
        typeof r.timestamp === "string" &&
        Number.isFinite(Date.parse(r.timestamp)) &&
        typeof r.productName === "string" &&
        (r.basis === "100g" || r.basis === "serving") &&
        (r.calories === null ||
          (typeof r.calories === "number" &&
            Number.isFinite(r.calories) &&
            r.calories >= 0)),
    )
  ) {
    throw new Error("Saved scan history could not be read.");
  }
  return data.slice(0, 100);
}
// Serialize read/modify/write so overlapping saves cannot discard a scan.
let queue: Promise<unknown> = Promise.resolve();
export function appendScan(record: ScanRecord): Promise<ScanRecord[]> {
  const operation = queue.then(async () => {
    const previous = await loadScanHistory();
    const next = [record, ...previous.filter((r) => r.id !== record.id)].slice(
      0,
      100,
    );
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    return next;
  });
  queue = operation.catch(() => undefined);
  return operation;
}
