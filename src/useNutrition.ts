import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { loadMeals, updateMeal } from "./storage";
import { localDate, nutritionGoals, sumMeals } from "./nutrition";
import type { Meal, MealDays } from "./nutrition";
import type { Profile } from "./health";

export function useNutrition(profile: Profile) {
  const [days, setDays] = useState<MealDays>({});
  const [date, setDate] = useState(localDate);
  const [ready, setReady] = useState(false);
  const [mealError, setMealError] = useState("");
  const [mealBusy, setMealBusy] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    let mounted = true;
    void loadMeals()
      .then((value) => {
        if (mounted) setDays(value);
      })
      .catch(() => {
        if (mounted)
          setMealError(
            "Daily meals could not be loaded. Please restart to retry; existing data is preserved.",
          );
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    const refresh = () => setDate(localDate());
    const timer = setInterval(refresh, 30000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      mounted = false;
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  const changeMeal = async (
    mealDate: string,
    id: string,
    meal: Meal | null,
  ) => {
    if (!ready || busy.current)
      throw new Error("Please wait for the current meal update.");
    busy.current = true;
    setMealBusy(true);
    try {
      const next = await updateMeal(mealDate, id, meal);
      setDays(next);
      setDate(localDate());
      setMealError("");
    } catch {
      setMealError(
        "Meal update could not be saved. Your totals have not changed; please retry.",
      );
      throw new Error("Meal could not be saved. Please retry.");
    } finally {
      busy.current = false;
      setMealBusy(false);
    }
  };
  const mealLogged = (days[date] || []).some(
    (m) => m.id === `demo-lunch-${date}`,
  );
  const setMealLogged = (enabled: boolean) => {
    const now = new Date();
    const today = localDate(now);
    const id = `demo-lunch-${today}`;
    void changeMeal(
      today,
      id,
      enabled
        ? {
            id,
            date: today,
            timestamp: now.toISOString(),
            name: "Sample power bowl (demo)",
            amount: 1,
            unit: "serving",
            source: "demo",
            calories: 420,
            carbs: 52,
            protein: 24,
            fat: 14,
          }
        : null,
    ).catch(() => undefined);
  };
  return {
    days,
    date,
    meals: days[date] || [],
    totals: sumMeals(days[date] || []),
    goals: nutritionGoals(profile),
    mealsReady: ready,
    mealError,
    mealBusy,
    changeMeal,
    mealLogged,
    setMealLogged,
  };
}
