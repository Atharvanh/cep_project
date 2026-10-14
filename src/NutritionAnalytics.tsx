import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { localDate, sumMeals } from "./nutrition";
import type { Goals, Meal, MealDays, Nutrients } from "./nutrition";

type Props = {
  date: string;
  days: MealDays;
  totals: Nutrients;
  goals: Goals | null;
  meals: Meal[];
  mealError: string;
  mealBusy: boolean;
  mealsReady: boolean;
  remove: (meal: Meal) => void;
};
export function NutritionAnalytics({
  date,
  days,
  totals,
  goals,
  meals,
  mealError,
  mealBusy,
  mealsReady,
  remove,
}: Props) {
  const [weekly, setWeekly] = React.useState(false);
  const ratio = goals ? Math.min(totals.calories / goals.calories, 1) : 0;
  const circumference = 2 * Math.PI * 62;
  const metrics = [
    ["Carbohydrates", "carbs", "#dda875"],
    ["Protein", "protein", "#337a6b"],
    ["Fat", "fat", "#9890bf"],
  ] as const;
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.title}>Your daily balance</Text>
          <Text style={styles.muted}>
            {date} · {meals.length} meals logged
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setWeekly(!weekly)}
        >
          <Text style={styles.action}>{weekly ? "Today" : "Last 7 days"}</Text>
        </Pressable>
      </View>
      {!mealsReady ? (
        <Text style={styles.muted}>Loading daily meals…</Text>
      ) : (
        <>
          {!!mealError && (
            <Text accessibilityRole="alert" style={styles.error}>
              {mealError}
            </Text>
          )}
          {weekly ? (
            <View style={styles.week}>
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(`${date}T12:00:00`);
                d.setDate(d.getDate() - 6 + i);
                const key = localDate(d);
                const total = sumMeals(days[key] || []).calories;
                const height = Math.min(
                  (total / (goals?.calories || Math.max(total, 1))) * 100,
                  100,
                );
                return (
                  <View key={key} style={styles.day}>
                    <Text style={styles.micro}>{Math.round(total)}</Text>
                    <Svg width={22} height={104}>
                      <Rect
                        x={0}
                        y={0}
                        width={22}
                        height={104}
                        rx={6}
                        fill="#edf2ee"
                      />
                      <Rect
                        x={0}
                        y={104 - height}
                        width={22}
                        height={height}
                        rx={6}
                        fill={i === 6 ? "#337a6b" : "#a7c6bb"}
                      />
                    </Svg>
                    <Text style={styles.micro}>
                      {d.toLocaleDateString(undefined, { weekday: "short" })}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.balance}>
              <View
                style={styles.energy}
                accessible
                accessibilityLabel={`${Math.round(totals.calories)} calories consumed${goals ? ` of ${goals.calories}` : ""}`}
              >
                <Svg width={146} height={146}>
                  <Circle
                    cx={73}
                    cy={73}
                    r={62}
                    fill="none"
                    stroke="#edf2ee"
                    strokeWidth={9}
                  />
                  <Circle
                    cx={73}
                    cy={73}
                    r={62}
                    fill="none"
                    stroke="#337a6b"
                    strokeWidth={9}
                    strokeDasharray={`${circumference * ratio} ${circumference}`}
                    transform="rotate(-90 73 73)"
                    strokeLinecap="round"
                  />
                </Svg>
                <View style={styles.energyLabel}>
                  <Text style={styles.big}>
                    {Math.round(totals.calories).toLocaleString()}
                  </Text>
                  <Text style={styles.muted}>
                    {goals ? `of ${goals.calories} kcal` : "kcal logged"}
                  </Text>
                </View>
              </View>
              <View style={styles.macros}>
                {metrics.map(([name, key, color]) => {
                  const consumed = totals[key];
                  const target = goals?.[key];
                  const pct = target ? consumed / target : 0;
                  return (
                    <View
                      key={key}
                      style={styles.metric}
                      accessible
                      accessibilityLabel={`${name}: ${consumed.toFixed(1)} grams${target ? ` of ${target.toFixed(1)} grams` : "; no goal calculated"}`}
                    >
                      <View style={styles.heading}>
                        <Text style={styles.label}>{name}</Text>
                        <Text style={styles.muted}>
                          {consumed.toFixed(1)}
                          {target ? ` / ${target.toFixed(1)}` : ""} g
                        </Text>
                      </View>
                      <Svg
                        width="100%"
                        height={10}
                        viewBox="0 0 300 10"
                        preserveAspectRatio="none"
                      >
                        <Rect width={300} height={10} rx={5} fill="#edf2ee" />
                        <Rect
                          width={Math.min(pct, 1) * 300}
                          height={10}
                          rx={5}
                          fill={color}
                        />
                      </Svg>
                      {pct > 1 && (
                        <Text style={styles.micro}>
                          {Math.round((pct - 1) * 100)}% above illustrative goal
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}
          <Text style={styles.muted}>
            {weekly
              ? "Recorded calories per day. Bars use your current goal; days without logs show zero."
              : goals
                ? `${Math.round(Math.abs(goals.calories - totals.calories))} kcal ${totals.calories > goals.calories ? "above" : "remaining against"} illustrative goal.`
                : "Complete an adult profile to view illustrative targets."}
          </Text>
          {goals && <Text style={styles.note}>{goals.explanation}</Text>}
          <Text style={[styles.title, { marginTop: 20 }]}>
            Meals consumed today
          </Text>
          {!meals.length && (
            <Text style={styles.note}>
              No meals yet. Scan a product, choose your portion, then log it
              here.
            </Text>
          )}
          {meals.map((meal) => (
            <View key={meal.id} style={styles.meal}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{meal.name}</Text>
                <Text style={styles.muted}>
                  {meal.amount} {meal.unit} · {Math.round(meal.calories)} kcal
                  {meal.source === "demo" ? " · demo" : ""}
                </Text>
              </View>
              <Pressable
                disabled={mealBusy}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${meal.name}`}
                onPress={() => remove(meal)}
              >
                <Text style={styles.action}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 23,
    borderWidth: 1,
    borderColor: "#eaeef0",
    gap: 16,
  },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  title: { fontSize: 18, fontWeight: "600", color: "#202b36" },
  muted: { fontSize: 12, color: "#63746e", lineHeight: 19 },
  action: {
    fontSize: 12,
    color: "#337a6b",
    fontWeight: "600",
    paddingVertical: 8,
  },
  balance: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 22,
    alignItems: "center",
  },
  energy: { width: 146, height: 146, alignSelf: "center" },
  energyLabel: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  big: { fontSize: 29, fontWeight: "600", color: "#202b36" },
  macros: { flex: 1, minWidth: 190, gap: 18 },
  metric: { gap: 8 },
  label: { fontSize: 13, fontWeight: "600", color: "#202b36" },
  note: { fontSize: 12, lineHeight: 20, color: "#63746e" },
  error: { color: "#a44f36", fontSize: 13 },
  meal: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: "#edf0f1",
  },
  week: { flexDirection: "row", justifyContent: "space-between", gap: 3 },
  day: { alignItems: "center", gap: 8 },
  micro: { fontSize: 10, color: "#63746e" },
});
