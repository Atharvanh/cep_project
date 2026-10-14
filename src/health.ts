export type BMICategory = "Underweight" | "Normal" | "Overweight" | "Obese";
export type Profile = {
  name: string;
  gender: string;
  age: string;
  blood: string;
  conditions: string[];
  cycle: boolean;
  height: string;
  weight: string;
  bmi: number | null;
  bmiCategory: BMICategory | null;
};
export type Product = {
  barcode: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  basis: "100g" | "serving";
  servingSize: string | null;
  calories: number | null;
  carbs: number | null;
  fat: number | null;
  protein: number | null;
  sugars: number | null;
  sugars100g: number | null;
  nutriscore: string | null;
  nova: number | null;
};
export type ScanRecord = {
  id: string;
  timestamp: string;
  productName: string;
  calories: number | null;
  basis: Product["basis"];
};

export function calculateBMI(heightCm: number, weightKg: number) {
  if (
    !Number.isFinite(heightCm) ||
    !Number.isFinite(weightKg) ||
    heightCm < 50 ||
    heightCm > 260 ||
    weightKg < 10 ||
    weightKg > 500
  ) {
    throw new Error("Enter a height from 50–260 cm and weight from 10–500 kg.");
  }
  const bmi = weightKg / (heightCm / 100) ** 2;
  const bmiCategory: BMICategory =
    bmi < 18.5
      ? "Underweight"
      : bmi < 25
        ? "Normal"
        : bmi < 30
          ? "Overweight"
          : "Obese";
  return { bmi, bmiCategory };
}

export function normalizeProfile(value: unknown): Profile {
  if (!value || typeof value !== "object")
    throw new Error("Invalid saved profile.");
  const p = value as Record<string, unknown>;
  if (
    typeof p.name !== "string" ||
    !p.name.trim() ||
    p.name.length > 30 ||
    typeof p.age !== "string" ||
    !/^\d{1,3}$/.test(p.age) ||
    Number(p.age) < 1 ||
    Number(p.age) > 120 ||
    typeof p.gender !== "string" ||
    typeof p.blood !== "string" ||
    !Array.isArray(p.conditions) ||
    !p.conditions.every((c) => typeof c === "string") ||
    typeof p.cycle !== "boolean" ||
    typeof p.height !== "string" ||
    typeof p.weight !== "string"
  ) {
    throw new Error("Please complete your profile with valid details.");
  }
  const calculated = calculateBMI(Number(p.height), Number(p.weight));
  return {
    name: p.name.trim(),
    age: p.age,
    gender: p.gender,
    blood: p.blood,
    conditions: p.conditions,
    cycle: p.gender === "Woman" && p.cycle,
    height: p.height,
    weight: p.weight,
    bmi: calculated.bmi,
    // Adult categories must not be applied to children or teenagers.
    bmiCategory: Number(p.age) >= 20 ? calculated.bmiCategory : null,
  };
}

export function healthMatch(product: Product, profile: Profile) {
  const higherBMI =
    Number(profile.age) >= 20 &&
    (profile.bmiCategory === "Overweight" || profile.bmiCategory === "Obese");
  // Explicit prototype threshold; never compare serving sugars to a 100 g threshold.
  const highSugar = product.sugars100g !== null && product.sugars100g > 22.5;
  if (
    higherBMI &&
    (product.nutriscore === "d" || product.nutriscore === "e" || highSugar)
  ) {
    return {
      tone: "warning",
      text: "Warning: High sugar/fat for your BMI goal",
      reason: highSugar
        ? "More than 22.5 g sugar per 100 g in the product data."
        : "Nutri-Score D or E triggers your selected BMI rule; it does not measure fat alone.",
    };
  }
  if (product.nutriscore === "a" || product.nutriscore === "b") {
    return {
      tone: "good",
      text: "Good choice for your profile.",
      reason:
        "Based on the product’s Nutri-Score A or B. Check ingredients and portion size.",
    };
  }
  return {
    tone: "neutral",
    text: "Review the label and portion size",
    reason: product.nutriscore
      ? "No positive or warning rule matched this product."
      : "Nutri-Score is unavailable; there is not enough data for a positive verdict.",
  };
}
