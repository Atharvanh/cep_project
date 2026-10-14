import React from "react";
import { StyleSheet, Text, View } from "react-native";

const layers = [
  {
    name: "Application",
    technology: "React Native · Expo · TypeScript",
    detail:
      "Five tabs with shared state, reusable modal flows, and native device integrations.",
  },
  {
    name: "Local intelligence",
    technology: "BMI & Health Match utilities",
    detail:
      "Height and weight drive adult BMI and illustrative 30 kcal/kg goals. Product rules explain warnings and positive matches.",
  },
  {
    name: "Device storage",
    technology: "AsyncStorage",
    detail:
      "Profiles, scan history, and meals grouped by local date survive app restarts. Meal writes are serialized.",
  },
  {
    name: "Product capture",
    technology: "expo-camera",
    detail:
      "Live barcode events use a synchronous lock and cooldown. Permission fallback and manual entry keep lookup accessible.",
  },
  {
    name: "Product facts",
    technology: "Open Food Facts API",
    detail:
      "Barcode lookup retrieves nutrition, Nutri-Score, and NOVA. Missing values, timeouts, and failed requests have explicit states.",
  },
  {
    name: "Visual analytics",
    technology: "react-native-svg",
    detail:
      "Portions scale label values into consumed totals. Macro bars, an energy ring, and seven-day history use saved meals.",
  },
  {
    name: "Portable summary",
    technology: "expo-print · expo-sharing",
    detail:
      "An A4 PDF combines profile, BMI, nutrition goals, meals, and recent scans, then opens the native share sheet.",
  },
];

export function ArchitectureSummary() {
  return (
    <View style={styles.content}>
      <Text style={styles.eyebrow}>WELNEST · ENGINEERING OVERVIEW</Text>
      <Text style={styles.title}>From a label to a daily habit.</Text>
      <Text style={styles.intro}>
        A device-first app with local calculations and a live product-data
        connection.
      </Text>
      <View style={styles.flow}>
        <Text style={styles.flowLabel}>DATA FLOW</Text>
        <Text style={styles.flowText}>
          Profile → Barcode → Product facts → Health Match → Meals → Charts &
          PDF
        </Text>
      </View>
      {layers.map((layer, index) => (
        <View key={layer.name} style={styles.layer}>
          <Text style={styles.number}>
            {String(index + 1).padStart(2, "0")}
          </Text>
          <View style={styles.layerBody}>
            <Text style={styles.layerName}>{layer.name}</Text>
            <Text style={styles.technology}>{layer.technology}</Text>
            <Text style={styles.detail}>{layer.detail}</Text>
          </View>
        </View>
      ))}
      <View style={styles.note}>
        <Text style={styles.noteTitle}>Why a live API?</Text>
        <Text style={styles.detail}>
          A barcode identifies the packaged product. Structured nutrition fields
          let us evaluate the label directly, without training and distributing
          an image-recognition model. Database records can still be incomplete;
          the app makes those gaps visible.
        </Text>
      </View>
      <Text style={styles.footnote}>
        Profile calculations and meal history run locally. Product lookup sends
        the barcode, not the saved profile. Nutrition targets are illustrative;
        Food photo mode, Community, and Care retain their demo content.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: "600",
    color: "#337a6b",
  },
  title: {
    fontSize: 25,
    fontWeight: "600",
    letterSpacing: -0.6,
    color: "#202b36",
  },
  intro: { fontSize: 13, lineHeight: 21, color: "#63746e" },
  flow: { backgroundColor: "#edf3ef", borderRadius: 12, padding: 18, gap: 8 },
  flowLabel: {
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: "600",
    color: "#337a6b",
  },
  flowText: {
    fontSize: 14,
    lineHeight: 24,
    color: "#263f34",
    fontWeight: "500",
  },
  layer: {
    flexDirection: "row",
    gap: 14,
    borderBottomWidth: 1,
    borderColor: "#edf0f1",
    paddingVertical: 12,
  },
  number: { fontSize: 11, fontWeight: "600", color: "#337a6b", paddingTop: 3 },
  layerBody: { flex: 1, gap: 6 },
  layerName: { fontSize: 10, color: "#63746e" },
  technology: { fontSize: 14, fontWeight: "600", color: "#202b36" },
  detail: { fontSize: 12, lineHeight: 20, color: "#63746e" },
  note: { backgroundColor: "#f7f8fa", borderRadius: 12, padding: 18, gap: 8 },
  noteTitle: { fontSize: 13, fontWeight: "600", color: "#202b36" },
  footnote: { fontSize: 11, lineHeight: 19, color: "#63746e" },
});
