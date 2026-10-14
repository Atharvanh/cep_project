import type { Product } from "./health";

function numberOrNull(value: unknown): number | null {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && !value.trim())
  )
    return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export function parseProduct(
  payload: unknown,
  barcode: string,
): Product | null {
  if (!payload || typeof payload !== "object")
    throw new Error("Invalid product response.");
  const response = payload as Record<string, unknown>;
  if (response.status === 0) return null;
  if (
    response.status !== 1 ||
    !response.product ||
    typeof response.product !== "object"
  )
    throw new Error("Invalid product response.");
  const p = response.product as Record<string, unknown>;
  const n = (
    p.nutriments && typeof p.nutriments === "object" ? p.nutriments : {}
  ) as Record<string, unknown>;
  const keys = [
    "energy-kcal",
    "energy-kj",
    "energy",
    "carbohydrates",
    "fat",
    "proteins",
    "sugars",
  ];
  const basis = keys.some((k) => numberOrNull(n[`${k}_100g`]) !== null)
    ? "100g"
    : "serving";
  const nutrient = (key: string) => numberOrNull(n[`${key}_${basis}`]);
  // OFF normalizes generic energy_100g/serving to kJ; energy_unit is the
  // source label's input unit and must not reinterpret the normalized value.
  const kj = nutrient("energy-kj") ?? nutrient("energy");
  const kcal = nutrient("energy-kcal");
  const grade = text(p.nutriscore_grade)?.toLowerCase();
  const image = text(p.image_front_url) ?? text(p.image_url);
  const nova = numberOrNull(p.nova_group);
  return {
    barcode,
    name: text(p.product_name) ?? text(p.product_name_en) ?? "Unnamed product",
    brand: text(p.brands) ?? "Brand unavailable",
    imageUrl: image?.startsWith("https://") ? image : null,
    basis,
    servingSize: text(p.serving_size),
    calories: kcal ?? (kj === null ? null : kj / 4.184),
    carbs: nutrient("carbohydrates"),
    fat: nutrient("fat"),
    protein: nutrient("proteins"),
    sugars: nutrient("sugars"),
    sugars100g: numberOrNull(n.sugars_100g),
    nutriscore: grade && /^[a-e]$/.test(grade) ? grade : null,
    nova:
      nova !== null && Number.isInteger(nova) && nova >= 1 && nova <= 4
        ? nova
        : null,
  };
}

export async function fetchProduct(
  barcode: string,
  signal?: AbortSignal,
  timeoutMs = 12000,
): Promise<Product | null> {
  if (!/^\d{8,14}$/.test(barcode))
    throw new Error("Enter a valid numeric product barcode (8–14 digits).");
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort);
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const fields =
      "product_name,product_name_en,brands,image_front_url,image_url,nutriments,serving_size,nutriscore_grade,nova_group";
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}?fields=${fields}`,
      {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      },
    );
    if (response.status === 404) return null;
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "Too many lookups. Please wait and try again."
          : "Product lookup is unavailable. Please try again.",
      );
    return parseProduct(await response.json(), barcode);
  } catch (error) {
    if (timedOut)
      throw new Error(
        "Product lookup timed out. Check your connection and try again.",
      );
    if (signal?.aborted) throw error;
    if (error instanceof TypeError)
      throw new Error(
        "Unable to connect. Check your internet connection and try again.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
