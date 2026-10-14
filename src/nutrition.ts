import type { Product, Profile } from "./health";

export type Nutrients = {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
};
export type Meal = Nutrients & {
  id: string;
  timestamp: string;
  date: string;
  name: string;
  amount: number;
  unit: "g" | "serving";
  source: "barcode" | "demo";
};
export type MealDays = Record<string, Meal[]>;
export type Goals = Nutrients & { explanation: string };
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function nutritionGoals(profile: Profile): Goals | null {
  const weight = Number(profile.weight);
  if (
    !Number.isFinite(weight) ||
    weight < 10 ||
    weight > 500 ||
    Number(profile.age) < 20 ||
    profile.bmi === null
  )
    return null;
  const calories = Math.round(weight * 30);
  const proteinShare = profile.bmi >= 25 ? 0.25 : 0.2;
  return {
    calories,
    protein: (calories * proteinShare) / 4,
    fat: (calories * 0.3) / 9,
    carbs: (calories * (0.7 - proteinShare)) / 4,
    explanation: `Illustrative adult targets: 30 kcal/kg of saved weight; ${profile.bmi >= 25 ? "45% carbs, 25% protein" : "50% carbs, 20% protein"}, 30% fat. This BMI-based split is a presentation rule, not a prescribed diet. Activity, pregnancy, and medical conditions are not accounted for.`,
  };
}
export function canLogProduct(product: Product): boolean {
  return [product.calories, product.carbs, product.protein, product.fat].every(
    (v) => v !== null && Number.isFinite(v) && v >= 0,
  );
}
export function mealFromProduct(
  product: Product,
  amount: number,
  id: string,
  now = new Date(),
): Meal {
  if (!canLogProduct(product))
    throw new Error(
      "Calories and all three macros are required to log this product.",
    );
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > (product.basis === "100g" ? 5000 : 50)
  )
    throw new Error(
      "Enter a portion above zero, up to 5,000 g or 50 servings.",
    );
  const multiplier = product.basis === "100g" ? amount / 100 : amount;
  return {
    id,
    timestamp: now.toISOString(),
    date: localDate(now),
    name: product.name,
    amount,
    unit: product.basis === "100g" ? "g" : "serving",
    source: "barcode",
    calories: product.calories! * multiplier,
    carbs: product.carbs! * multiplier,
    protein: product.protein! * multiplier,
    fat: product.fat! * multiplier,
  };
}
export function sumMeals(meals: Meal[]): Nutrients {
  return meals.reduce(
    (total, m) => ({
      calories: total.calories + m.calories,
      carbs: total.carbs + m.carbs,
      protein: total.protein + m.protein,
      fat: total.fat + m.fat,
    }),
    { calories: 0, carbs: 0, protein: 0, fat: 0 },
  );
}
export function validateMealDays(value: unknown): MealDays {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(
      "Daily meals could not be read. Existing data has been preserved.",
    );
  for (const [date, meals] of Object.entries(value)) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Array.isArray(meals) ||
      !meals.every(
        (m) =>
          m &&
          m.date === date &&
          typeof m.id === "string" &&
          typeof m.name === "string" &&
          typeof m.timestamp === "string" &&
          Number.isFinite(Date.parse(m.timestamp)) &&
          (m.unit === "g" || m.unit === "serving") &&
          (m.source === "barcode" || m.source === "demo") &&
          Number.isFinite(m.amount) &&
          m.amount > 0 &&
          [m.calories, m.carbs, m.protein, m.fat].every(
            (n) => typeof n === "number" && Number.isFinite(n) && n >= 0,
          ),
      )
    ) {
      throw new Error(
        "Daily meals could not be read. Existing data has been preserved.",
      );
    }
  }
  return value as MealDays;
}
