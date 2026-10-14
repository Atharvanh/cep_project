import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer, useIsFocused } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { doctors, foodImage, news, posts, recipes, slots } from "./src/data";

import { CameraView, useCameraPermissions } from "expo-camera";
import { calculateBMI, normalizeProfile, healthMatch } from "./src/health";
import type { Profile, Product, ScanRecord } from "./src/health";
import { fetchProduct } from "./src/products";
import {
  loadProfile,
  saveProfile,
  loadScanHistory,
  appendScan,
} from "./src/storage";

import { useNutrition } from "./src/useNutrition";
import { NutritionAnalytics } from "./src/NutritionAnalytics";
import {
  canLogProduct,
  mealFromProduct,
  localDate,
  sumMeals,
} from "./src/nutrition";
import type { Meal } from "./src/nutrition";
import { exportHealthReport } from "./src/exportReport";
import { ArchitectureSummary } from "./src/ArchitectureSummary";

const C = {
  bg: "#f7f8fa",
  ink: "#202b36",
  muted: "#859099",
  line: "#edf0f1",
  teal: "#337a6b",
  light: "#e8f1ed",
  purple: "#9890bf",
  orange: "#dda875",
};
const Tab = createBottomTabNavigator();
type IconName = React.ComponentProps<typeof Ionicons>["name"];
type Booking = { doctor: string; day: string; slot: string };
const initialProfile: Profile = {
  name: "Alex",
  gender: "Prefer not to say",
  age: "22",
  blood: "Unknown",
  conditions: ["Mindful sugar intake"],
  cycle: false,
  height: "",
  weight: "",
  bmi: null,
  bmiCategory: null,
};
const Context = React.createContext<any>(null);
const useApp = () => React.useContext(Context);
function Icon({
  name,
  size = 20,
  color = C.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
function Button({
  title,
  onPress,
  icon,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.buttonSecondary,
        { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: C.teal }]}>
        {title}
      </Text>
      {icon && (
        <Icon name={icon} size={17} color={secondary ? C.teal : "#fff"} />
      )}
    </Pressable>
  );
}
function Chip({
  text,
  selected,
  onPress,
}: {
  text: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.chip, selected && s.chipSelected]}
    >
      <Text style={[s.chipText, selected && { color: C.teal }]}>{text}</Text>
    </Pressable>
  );
}
function Heading({ title, eyebrow, subtitle, action, onPress }: any) {
  return (
    <View style={s.heading}>
      <View style={{ flex: 1 }}>
        {eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}
        <Text style={s.sectionTitle}>{title}</Text>
        {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      </View>
      {action && (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          style={s.inlineAction}
        >
          <Text style={s.actionText}>{action}</Text>
          <Icon name="arrow-forward" size={16} color={C.teal} />
        </Pressable>
      )}
    </View>
  );
}
function Ring({ value, size = 150, color = C.teal, children }: any) {
  const r = (size - 14) / 2,
    circumference = 2 * Math.PI * r;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#edf2ee"
          strokeWidth={9}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={9}
          fill="none"
          strokeDasharray={`${circumference * Math.min(value, 1)} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}
function Avatar({ initials, color = C.light, size = 42 }: any) {
  return (
    <View
      style={[
        s.avatar,
        {
          backgroundColor: color,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={{ fontSize: size * 0.3, fontWeight: "600", color: C.ink }}>
        {initials}
      </Text>
    </View>
  );
}
function Sheet({ visible, onClose, title, children, wide = false }: any) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.modalBackdrop}>
        <View style={[s.modal, wide && { maxWidth: 650 }]}>
          <View style={s.modalHeader}>
            <Text style={s.sectionTitle}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              onPress={onClose}
              style={s.iconButton}
            >
              <Icon name="close" />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 26, paddingTop: 8 }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
function Page({ children }: any) {
  const mobile = useWindowDimensions().width < 600;
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        s.page,
        mobile && { paddingHorizontal: 18, paddingTop: 24 },
      ]}
    >
      <View style={s.pageInner}>
        {children}
        <View style={s.footer}>
          <View style={s.row}>
            <Icon name="leaf-outline" size={14} color={C.muted} />
            <Text style={s.footnote}>A little better, every day.</Text>
          </View>
          <Text style={s.footnote}>WelNest · College prototype</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function Dashboard({ navigation }: any) {
  const {
    profile,
    scanHistory,
    historyLoadError,
    water,
    setWater,
    mealLogged,
    setMealLogged,
    setOnboarding,
    setRecipe,
    setArticle,
    setRating,
  } = useApp();
  const wide = useWindowDimensions().width > 1100;
  const mobile = useWindowDimensions().width < 600;
  const nutrition = useApp();
  return (
    <Page>
      <View
        style={[
          s.rowBetween,
          { marginBottom: 26 },
          mobile && { flexDirection: "column", alignItems: "flex-start" },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>YOUR WELLNESS, CONNECTED</Text>
          <Text style={s.pageTitle}>
            A good day starts with you<Text style={{ color: C.teal }}>.</Text>
          </Text>
          <Text style={s.subtitle}>
            Let’s make a little progress, {profile.name || "Alex"}.
          </Text>
        </View>
        <View style={s.datePill}>
          <Icon name="calendar-outline" size={16} color={C.teal} />
          <Text style={s.smallText}>
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </View>
      </View>
      <View style={[s.dashboardColumns, !wide && { flexDirection: "column" }]}>
        <View style={{ flex: 1, gap: 26 }}>
          <LinearGradient
            colors={["#e7efeb", "#f1f3e9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              s.hero,
              mobile && { flexDirection: "column", alignItems: "stretch" },
            ]}
          >
            <View style={[s.heroText, mobile && { paddingRight: 28 }]}>
              <View style={s.badge}>
                <Icon name="sparkles" size={12} color={C.teal} />
                <Text style={s.badgeText}>MADE FOR YOUR EVERYDAY</Text>
              </View>
              <Text style={s.heroTitle}>
                Small choices.{"\n"}A healthier you.
              </Text>
              <Text style={s.heroDescription}>
                Your next chapter of feeling good starts with what’s on your
                plate.
              </Text>
              <View style={{ alignSelf: "flex-start", marginTop: 20 }}>
                <Button
                  title="Discover your plan"
                  icon="arrow-forward"
                  onPress={() => setOnboarding(true)}
                />
              </View>
            </View>
            <View
              style={[
                s.heroPhotoWrap,
                mobile && {
                  width: "100%",
                  height: 205,
                  marginRight: 0,
                  marginBottom: 18,
                },
              ]}
            >
              <Image source={foodImage} style={s.heroPhoto} />
              <View style={s.floatingLabel}>
                <View style={s.tinyGreenDot} />
                <Text style={{ fontSize: 11, fontWeight: "600", color: C.ink }}>
                  Good food. Better days.
                </Text>
              </View>
            </View>
          </LinearGradient>
          <NutritionAnalytics
            date={nutrition.date}
            days={nutrition.days}
            totals={nutrition.totals}
            goals={nutrition.goals}
            meals={nutrition.meals}
            mealError={nutrition.mealError}
            mealBusy={nutrition.mealBusy}
            mealsReady={nutrition.mealsReady}
            remove={(meal: Meal) => {
              void nutrition
                .changeMeal(meal.date, meal.id, null)
                .catch(() => undefined);
            }}
          />
          <View style={s.card}>
            <Heading
              title="Recent Scans"
              subtitle="Products you viewed · not meals consumed"
            />
            {!!historyLoadError && (
              <Text style={{ color: "#a44f36", marginBottom: 12 }}>
                {historyLoadError}
              </Text>
            )}
            {!scanHistory.length && (
              <Text style={s.bodyText}>
                Your first barcode lookup will appear here.
              </Text>
            )}
            {scanHistory.slice(0, 5).map((scan: ScanRecord) => (
              <View
                key={scan.id}
                style={[
                  s.rowBetween,
                  {
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderColor: C.line,
                  },
                ]}
              >
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={s.cardTitle}>{scan.productName}</Text>
                  <Text style={s.footnote}>
                    {new Date(scan.timestamp).toLocaleString()}
                  </Text>
                </View>
                <Text style={s.smallText}>
                  {scan.calories === null
                    ? "Calories unavailable"
                    : String(Math.round(scan.calories)) + " kcal"}
                  {"\n"}per {scan.basis === "100g" ? "100 g" : "serving"}
                </Text>
              </View>
            ))}
          </View>
          <View>
            <Heading
              title="Quick bites, big goodness"
              subtitle="A world of flavor. A little more nourishment."
              action="Explore"
              onPress={() => setRecipe(recipes[1])}
            />
            <View style={s.recipeGrid}>
              {recipes.map((recipe) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View recipe: ${recipe.title}`}
                  key={recipe.id}
                  onPress={() => setRecipe(recipe)}
                  style={s.recipeCard}
                >
                  <Image source={recipe.image} style={s.recipeImage} />
                  <View style={s.recipeTime}>
                    <Icon name="time-outline" size={12} />
                    <Text style={{ fontSize: 11 }}>{recipe.time}</Text>
                  </View>
                  <View style={{ padding: 18, gap: 8 }}>
                    <Text style={s.miniEyebrow}>{recipe.origin}</Text>
                    <Text style={s.cardTitle}>{recipe.title}</Text>
                    <View style={s.row}>
                      <Text style={s.footnote}>{recipe.calories} kcal</Text>
                      <Text style={s.footnote}>·</Text>
                      <Text style={s.footnote}>{recipe.protein}g protein</Text>
                      <Icon name="arrow-forward" size={16} color={C.teal} />
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={[s.card, s.rowBetween]}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={s.cardTitle}>
                {mealLogged
                  ? "Lunch is in the books"
                  : "Make time for a good lunch"}
              </Text>
              <Text style={s.footnote}>
                {mealLogged
                  ? "Your power bowl is included in today’s balance."
                  : "Add a Mediterranean power bowl to your day."}
              </Text>
            </View>
            <Button
              title={mealLogged ? "Undo" : "Log lunch"}
              disabled={!nutrition.mealsReady || nutrition.mealBusy}
              secondary={mealLogged}
              onPress={() => setMealLogged(!mealLogged)}
              icon={mealLogged ? "arrow-undo-outline" : "add"}
            />
          </View>
        </View>
        <View style={[s.rightColumn, !wide && { width: "100%" }]}>
          <View style={[s.card, { padding: 23 }]}>
            <View style={s.rowBetween}>
              <View style={s.row}>
                <View style={s.smallIcon}>
                  <Icon
                    name="shield-checkmark-outline"
                    color={C.teal}
                    size={18}
                  />
                </View>
                <Text style={s.cardTitle}>Health rating</Text>
              </View>
              <Pressable
                onPress={() => setRating(true)}
                accessibilityRole="button"
                accessibilityLabel="About health rating"
              >
                <Icon
                  name="information-circle-outline"
                  size={18}
                  color={C.muted}
                />
              </Pressable>
            </View>
            <View style={{ alignItems: "center", marginVertical: 22 }}>
              <Ring value={0.86} size={138}>
                <Text style={[s.ringValue, { fontSize: 39 }]}>
                  86<Text style={{ fontSize: 16, color: C.muted }}>/100</Text>
                </Text>
                <Text style={s.miniEyebrow}>THRIVING</Text>
              </Ring>
            </View>
            <View style={{ alignItems: "center", gap: 8 }}>
              <View style={s.row}>
                <Icon name="trending-up" size={16} color={C.teal} />
                <Text
                  style={{ color: C.teal, fontSize: 12, fontWeight: "600" }}
                >
                  +8 points this month
                </Text>
              </View>
              <Text
                style={[s.footnote, { textAlign: "center", lineHeight: 19 }]}
              >
                Building better habits.<Text>{"\n"}</Text>Inspiring your
                community.
              </Text>
            </View>
            <View style={s.divider} />
            <Pressable
              accessibilityRole="button"
              style={s.rowBetween}
              onPress={() => navigation.navigate("Community")}
            >
              <Text style={s.actionText}>Meet your circle</Text>
              <Icon name="arrow-forward" size={17} color={C.teal} />
            </Pressable>
          </View>
          <View
            style={[
              s.card,
              { backgroundColor: "#edf3f7", borderColor: "#e5edf2" },
            ]}
          >
            <View style={s.rowBetween}>
              <View style={s.row}>
                <Icon name="water-outline" color="#7297ad" />
                <Text style={s.cardTitle}>A moment to hydrate</Text>
              </View>
              <Text style={s.footnote}>250 ml / glass</Text>
            </View>
            <Text style={[s.ringValue, { fontSize: 28, marginTop: 20 }]}>
              {(water * 0.25).toFixed(2)}{" "}
              <Text style={{ fontSize: 14, color: C.muted, fontWeight: "400" }}>
                / 2.00 L
              </Text>
            </Text>
            <View style={{ flexDirection: "row", gap: 9, marginVertical: 18 }}>
              {Array.from({ length: 8 }, (_, i) => (
                <Icon
                  key={i}
                  name={i < water ? "water" : "water-outline"}
                  size={23}
                  color={i < water ? "#81a8bd" : "#c8d7df"}
                />
              ))}
            </View>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Button
                  title={water >= 8 ? "Daily goal reached" : "Add a glass"}
                  secondary
                  disabled={water >= 8}
                  icon="add"
                  onPress={() => setWater(Math.min(8, water + 1))}
                />
              </View>
              {water > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove one glass"
                  style={s.iconButton}
                  onPress={() => setWater(water - 1)}
                >
                  <Icon name="remove" color="#7297ad" />
                </Pressable>
              )}
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("AI Lens")}
            style={s.lensMini}
          >
            <View style={s.row}>
              <View style={[s.smallIcon, { backgroundColor: "#ffffff20" }]}>
                <Icon name="scan-outline" color="#fff" size={21} />
              </View>
              <Text style={[s.cardTitle, { color: "#fff" }]}>
                Know your food.
              </Text>
            </View>
            <Text
              style={{
                color: "#b9cfc5",
                fontSize: 12,
                lineHeight: 20,
                marginVertical: 12,
              }}
            >
              A little clarity before your next bite.
            </Text>
            <View style={s.rowBetween}>
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
                Try AI Lens
              </Text>
              <Icon name="arrow-forward" color="#fff" size={17} />
            </View>
          </Pressable>
          <View>
            <Text style={[s.miniEyebrow, { marginBottom: 16 }]}>
              THE DAILY READ
            </Text>
            {news.map((item, i) => (
              <Pressable
                accessibilityRole="button"
                key={item.title}
                onPress={() => setArticle(item)}
                style={[s.newsItem, i > 0 && { marginTop: 16 }]}
              >
                <View
                  style={[
                    s.smallIcon,
                    {
                      backgroundColor: i ? "#edeaf3" : "#f4eadc",
                      width: 43,
                      height: 43,
                    },
                  ]}
                >
                  <Icon
                    name={i ? "nutrition-outline" : "walk-outline"}
                    color={i ? C.purple : "#b8986c"}
                    size={22}
                  />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text
                    style={{
                      color: C.ink,
                      fontSize: 12,
                      fontWeight: "600",
                      lineHeight: 18,
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text style={s.footnote}>Wellness notes · 2 min read</Text>
                </View>
                <Icon name="chevron-forward" size={14} color={C.muted} />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Page>
  );
}

function Lens() {
  const {
    profile,
    setMealLogged,
    toast,
    setScanHistory,
    changeMeal,
    mealsReady,
    mealBusy,
  } = useApp();
  const [portion, setPortion] = useState("100");
  const [mealSaved, setMealSaved] = useState(false);
  const [mealLogError, setMealLogError] = useState("");
  const mealSaveLock = useRef(false);
  const mealId = useRef("");
  const [mode, setMode] = useState("Barcode");
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const [scanning, setScanning] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [foodResult, setFoodResult] = useState(false);
  const [manual, setManual] = useState("");
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [pendingRecord, setPendingRecord] = useState<ScanRecord | null>(null);
  const [savingHistory, setSavingHistory] = useState(false);
  const lock = useRef(false);
  const requested = useRef(false);
  const request = useRef<AbortController | null>(null);
  const lastScan = useRef({ code: "", at: 0 });
  const active = focused && foreground && mode === "Barcode";

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      setForeground(state === "active");
      if (state === "active")
        void getPermission().catch(() =>
          setCameraError("Could not check camera access."),
        );
    });
    return () => sub.remove();
  }, [getPermission]);
  useEffect(() => {
    if (
      active &&
      permission &&
      !permission.granted &&
      permission.canAskAgain &&
      !requested.current &&
      Platform.OS !== "web"
    ) {
      requested.current = true;
      void requestPermission().catch(() =>
        setCameraError("Could not request camera access. Try again below."),
      );
    }
  }, [active, permission, requestPermission]);
  useEffect(() => {
    return () => {
      request.current?.abort();
      lock.current = false;
    };
  }, [active]);

  const persistRecord = async (record: ScanRecord) => {
    setSavingHistory(true);
    try {
      const history = await appendScan(record);
      setScanHistory(history);
      setHistoryError("");
      setPendingRecord(null);
    } catch {
      setPendingRecord(record);
      setHistoryError(
        "This result could not be saved on this device. Retry before closing to keep it in history.",
      );
    } finally {
      setSavingHistory(false);
    }
  };
  const lookup = async (code: string, fromCamera = false) => {
    if (!active || lock.current) return;
    const barcode = code.trim();
    if (
      fromCamera &&
      lastScan.current.code === barcode &&
      Date.now() - lastScan.current.at < 5000
    )
      return;
    lock.current = true;
    lastScan.current = { code: barcode, at: Date.now() };
    const controller = new AbortController();
    request.current = controller;
    setScanning(true);
    setError("");
    setHistoryError("");
    try {
      const found = await fetchProduct(barcode, controller.signal);
      if (controller.signal.aborted) return;
      if (!found) {
        setError("Product not found in database");
        toast("Product not found in database");
        lock.current = false;
      } else {
        setProduct(found);
        setPortion(found.basis === "100g" ? "100" : "1");
        setMealSaved(false);
        setMealLogError("");
        mealId.current = "meal-" + Date.now() + "-" + found.barcode;
        const timestamp = new Date().toISOString();
        void persistRecord({
          id: `${timestamp}-${barcode}`,
          timestamp,
          productName: found.name,
          calories: found.calories,
          basis: found.basis,
        });
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        const message =
          e instanceof Error
            ? e.message
            : "Product lookup failed. Please try again.";
        setError(message);
        toast(message);
      }
      if (request.current === controller) lock.current = false;
    } finally {
      if (request.current === controller) {
        setScanning(false);
        request.current = null;
      }
    }
  };
  const closeResult = () => {
    if (savingHistory || mealSaveLock.current) return;
    setProduct(null);
    lock.current = false;
  };
  const verdict = product ? healthMatch(product, profile) : null;
  const format = (n: number | null, unit = "g") =>
    n === null ? "Not available" : `${Number(n.toFixed(1))}${unit}`;
  return (
    <Page>
      <Heading
        eyebrow="A LITTLE CLARITY IN EVERY BITE"
        title="Meet your AI Lens"
        subtitle="Scan a barcode. Get the facts behind your food."
      />
      <View style={[s.row, { marginBottom: 20 }]}>
        {["Barcode", "Food"].map((m) => (
          <Chip
            key={m}
            text={m === "Food" ? "Food · demo" : "Live barcode"}
            selected={mode === m}
            onPress={() => {
              request.current?.abort();
              setMode(m);
              setError("");
            }}
          />
        ))}
      </View>
      <View style={s.twoCol}>
        <View
          style={[
            s.scanner,
            { flex: 1.3, backgroundColor: "#183a30", height: 440 },
          ]}
        >
          {mode === "Food" ? (
            <Image source={foodImage} style={StyleSheet.absoluteFill} />
          ) : active && permission?.granted && !cameraError && !product ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: [
                  "ean13",
                  "ean8",
                  "upc_a",
                  "upc_e",
                  "code128",
                  "itf14",
                ],
              }}
              onBarcodeScanned={
                scanning
                  ? undefined
                  : (event) => {
                      void lookup(event.data, true);
                    }
              }
              onMountError={() =>
                setCameraError(
                  "The camera could not start. Use the barcode field or retry camera access.",
                )
              }
            />
          ) : (
            <View style={{ padding: 28, gap: 16, alignItems: "center" }}>
              <Icon name="camera-outline" color="#fff" size={38} />
              <Text
                style={{ color: "#fff", textAlign: "center", lineHeight: 23 }}
              >
                {cameraError ||
                  (permission?.granted
                    ? "Camera paused"
                    : "Allow camera access to scan packaged food. You can also enter a barcode below.")}
              </Text>
              {!permission ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Button
                  title={
                    permission.granted
                      ? "Retry camera"
                      : permission.canAskAgain
                        ? "Allow camera"
                        : "Open settings"
                  }
                  onPress={() => {
                    setCameraError("");
                    if (permission.granted) return;
                    if (permission.canAskAgain)
                      void requestPermission().catch(() =>
                        setCameraError(
                          "Could not request access. Check your device settings.",
                        ),
                      );
                    else if (Platform.OS === "web")
                      setCameraError(
                        "Enable camera access in your browser’s site settings, then reload.",
                      );
                    else
                      void Linking.openSettings().catch(() =>
                        setCameraError(
                          "Open your device settings and allow camera access for WelNest.",
                        ),
                      );
                  }}
                />
              )}
            </View>
          )}
          {(mode === "Food" ||
            (active && permission?.granted && !cameraError)) && (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { alignItems: "center", justifyContent: "center" },
              ]}
            >
              <View
                style={{
                  width: 230,
                  height: 160,
                  borderWidth: 2,
                  borderColor: "#fff",
                  borderRadius: 18,
                }}
              />
              <Text
                style={{
                  color: "#fff",
                  backgroundColor: "#183a30cc",
                  padding: 10,
                  marginTop: 20,
                }}
              >
                {mode === "Food"
                  ? "Food photo analysis · demonstration only"
                  : scanning
                    ? "Looking up your product…"
                    : "Align a product barcode inside the frame"}
              </Text>
              {scanning && (
                <ActivityIndicator color="#fff" style={{ marginTop: 15 }} />
              )}
            </View>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 260, gap: 20 }}>
          <View style={s.card}>
            <Icon name="barcode-outline" size={30} color={C.teal} />
            <Text style={[s.sectionTitle, { marginTop: 16 }]}>
              Food insights. Personal context.
            </Text>
            <Text style={s.bodyText}>
              {profile.name} ·{" "}
              {profile.conditions.join(" · ") || "Balanced nutrition"}
            </Text>
            <Text style={s.footnote}>
              {profile.bmi === null
                ? "Complete your profile to calculate BMI."
                : `BMI ${profile.bmi.toFixed(1)} · ${profile.bmiCategory || "Adult classification not applied"}`}
            </Text>
            <View style={s.divider} />
            {mode === "Barcode" ? (
              <>
                <Text style={s.label}>ENTER BARCODE</Text>
                <TextInput
                  accessibilityLabel="Product barcode"
                  value={manual}
                  keyboardType="number-pad"
                  maxLength={14}
                  onChangeText={(t) => setManual(t.replace(/\D/g, ""))}
                  placeholder="8–14 digits on the package"
                  style={s.input}
                />
                <View style={{ marginTop: 16 }}>
                  <Button
                    title={scanning ? "Looking up product…" : "Look up product"}
                    disabled={scanning || manual.length < 8}
                    onPress={() => {
                      void lookup(manual);
                    }}
                  />
                </View>
                {!!error && (
                  <Text
                    accessibilityRole="alert"
                    style={{ color: "#a44f36", marginTop: 16, lineHeight: 20 }}
                  >
                    {error}
                  </Text>
                )}
              </>
            ) : (
              <Button
                title="View sample bowl"
                onPress={() => setFoodResult(true)}
              />
            )}
          </View>
          <View style={s.demoNote}>
            <Text style={[s.footnote, { flex: 1, lineHeight: 20 }]}>
              Barcode results come from Open Food Facts. Missing values are
              shown as unavailable. Scanning does not log a meal or detect
              adulterants. Food-photo recognition remains a demo.
            </Text>
          </View>
        </View>
      </View>
      <Sheet
        visible={!!product && focused}
        onClose={closeResult}
        title="Your food, decoded"
      >
        {product && verdict && (
          <>
            {product.imageUrl && (
              <Image
                source={{ uri: product.imageUrl }}
                style={{
                  height: 160,
                  width: "100%",
                  resizeMode: "contain",
                  marginBottom: 18,
                }}
              />
            )}
            <Text style={s.eyebrow}>OPEN FOOD FACTS · {product.barcode}</Text>
            <Text style={s.sectionTitle}>{product.name}</Text>
            <Text style={s.bodyText}>{product.brand}</Text>
            <View
              style={[
                s.verdict,
                {
                  backgroundColor:
                    verdict.tone === "warning" ? "#f9ece4" : C.light,
                },
              ]}
            >
              <Icon
                name={
                  verdict.tone === "good"
                    ? "checkmark-circle"
                    : "information-circle"
                }
                color={C.teal}
              />
              <Text style={[s.cardTitle, { flex: 1 }]}>{verdict.text}</Text>
            </View>
            <Text style={s.bodyText}>{verdict.reason}</Text>
            <Text style={s.label}>
              {product.basis === "100g"
                ? "PER 100 G"
                : `PER SERVING${product.servingSize ? ` · ${product.servingSize}` : " · SIZE UNSPECIFIED"}`}
            </Text>
            {[
              ["Energy", format(product.calories, " kcal")],
              ["Carbohydrates", format(product.carbs)],
              ["Fat", format(product.fat)],
              ["Protein", format(product.protein)],
              ["Sugars", format(product.sugars)],
              [
                "Nutri-Score",
                product.nutriscore?.toUpperCase() || "Not available",
              ],
              ["NOVA group", product.nova?.toString() || "Not available"],
            ].map(([label, value]) => (
              <View key={label} style={[s.rowBetween, { marginTop: 15 }]}>
                <Text style={s.smallText}>{label}</Text>
                <Text style={s.cardTitle}>{value}</Text>
              </View>
            ))}
            <Text style={[s.footnote, { marginVertical: 20, lineHeight: 20 }]}>
              A simple profile rule, not a medical assessment. Product data is
              community contributed; verify the package label. NOVA describes
              processing, not a personalized safety rating.
            </Text>
            <View style={[s.card, { marginBottom: 20, gap: 12 }]}>
              <Text style={s.cardTitle}>Log your portion</Text>
              <Text style={s.footnote}>
                {product.basis === "100g"
                  ? "Amount eaten in grams (label values are per 100 g)"
                  : "Number of label servings eaten"}
              </Text>
              <TextInput
                accessibilityLabel={
                  product.basis === "100g"
                    ? "Grams consumed"
                    : "Servings consumed"
                }
                keyboardType="decimal-pad"
                style={s.input}
                value={portion}
                editable={!mealSaved && !mealBusy}
                maxLength={8}
                onChangeText={setPortion}
              />
              {!canLogProduct(product) && (
                <Text style={s.footnote}>
                  This product is missing calories or macros, so it cannot be
                  logged accurately.
                </Text>
              )}
              {!!mealLogError && (
                <Text accessibilityRole="alert" style={{ color: "#a44f36" }}>
                  {mealLogError}
                </Text>
              )}
              <Button
                title={
                  mealSaved
                    ? "Logged to Daily Meals"
                    : mealBusy
                      ? "Saving meal…"
                      : "Log to Daily Meals"
                }
                disabled={
                  mealSaved ||
                  mealBusy ||
                  !mealsReady ||
                  !canLogProduct(product)
                }
                onPress={() => {
                  if (mealSaveLock.current) return;
                  mealSaveLock.current = true;
                  setMealLogError("");
                  void (async () => {
                    try {
                      const meal = mealFromProduct(
                        product,
                        Number(portion.replace(",", ".")),
                        mealId.current,
                      );
                      await changeMeal(meal.date, meal.id, meal);
                      setMealSaved(true);
                      toast("Meal saved to today’s nutrition.");
                    } catch (e) {
                      setMealLogError(
                        e instanceof Error
                          ? e.message
                          : "Could not log meal. Please retry.",
                      );
                    } finally {
                      mealSaveLock.current = false;
                    }
                  })();
                }}
              />
            </View>
            {savingHistory && (
              <Text style={s.footnote}>Saving to Recent Scans…</Text>
            )}
            {!!historyError && (
              <>
                <Text style={{ color: "#a44f36", marginBottom: 14 }}>
                  {historyError}
                </Text>
                <Button
                  title="Retry saving scan"
                  disabled={savingHistory}
                  onPress={() => {
                    if (pendingRecord) void persistRecord(pendingRecord);
                  }}
                />
              </>
            )}
            <View style={{ marginTop: 16 }}>
              <Button
                title="Scan another product"
                disabled={savingHistory}
                onPress={closeResult}
              />
            </View>
          </>
        )}
      </Sheet>
      <Sheet
        visible={foodResult && focused}
        onClose={() => setFoodResult(false)}
        title="Sample power bowl"
      >
        <Image
          source={foodImage}
          style={{ height: 180, width: "100%", borderRadius: 14 }}
        />
        <Text style={s.bodyText}>
          Demonstration only: 420 kcal · 52 g carbs · 14 g fat · 24 g protein.
          Contains sesame. No camera analysis is performed.
        </Text>
        <Button
          title="Add sample lunch to today"
          disabled={!mealsReady || mealBusy}
          onPress={() => {
            setMealLogged(true);
            setFoodResult(false);
          }}
        />
      </Sheet>
    </Page>
  );
}

function Community() {
  const { toast } = useApp();
  const [filter, setFilter] = useState("Your circle");
  const [liked, setLiked] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [thread, setThread] = useState<(typeof posts)[number] | null>(null);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<Record<string, string[]>>({});
  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState("");
  const [myPosts, setMyPosts] = useState<string[]>([]);
  return (
    <Page>
      <Heading
        eyebrow="BETTER, TOGETHER"
        title="Find your kind of people"
        subtitle="Shared experiences. Small wins. A circle that gets you."
        action="Share a moment"
        onPress={() => setCompose(true)}
      />
      <View style={[s.row, { marginBottom: 26, flexWrap: "wrap" }]}>
        {["Your circle", "Mentors", "Following"].map((f) => (
          <Chip
            key={f}
            text={f}
            selected={filter === f}
            onPress={() => setFilter(f)}
          />
        ))}
      </View>
      <View style={s.twoCol}>
        <View style={{ flex: 1.7, minWidth: 280, gap: 20 }}>
          {filter === "Your circle" &&
            myPosts.map((text, i) => (
              <View style={s.card} key={i}>
                <View style={s.row}>
                  <Avatar initials="YOU" />
                  <View>
                    <Text style={s.cardTitle}>You</Text>
                    <Text style={s.footnote}>Just now · Your circle</Text>
                  </View>
                </View>
                <Text style={s.bodyText}>{text}</Text>
                <View style={s.row}>
                  <Icon name="heart-outline" size={17} />
                  <Text style={s.footnote}>
                    Your next small win starts here.
                  </Text>
                </View>
              </View>
            ))}
          {posts
            .filter((p) =>
              filter === "Mentors"
                ? p.role === "MENTOR"
                : filter === "Following"
                  ? following.includes(p.id)
                  : true,
            )
            .map((p) => (
              <View key={p.id} style={s.card}>
                <View style={s.rowBetween}>
                  <View style={s.row}>
                    <Avatar initials={p.initials} color={p.color} />
                    <View style={{ gap: 5 }}>
                      <View style={s.row}>
                        <Text style={s.cardTitle}>{p.name}</Text>
                        {p.role === "MENTOR" && (
                          <Icon name="ribbon" color={C.teal} size={16} />
                        )}
                      </View>
                      <Text style={s.footnote}>
                        {p.match} · {p.time}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      setFollowing(
                        following.includes(p.id)
                          ? following.filter((id) => id !== p.id)
                          : [...following, p.id],
                      )
                    }
                  >
                    <Text style={s.actionText}>
                      {following.includes(p.id) ? "Following" : "Follow"}
                    </Text>
                  </Pressable>
                </View>
                {p.role === "MENTOR" && (
                  <View
                    style={[
                      s.badge,
                      { alignSelf: "flex-start", marginTop: 16 },
                    ]}
                  >
                    <Text style={s.badgeText}>
                      COMMUNITY MENTOR · {p.score} RATING
                    </Text>
                  </View>
                )}
                <Text style={s.bodyText}>{p.text}</Text>
                {p.image && (
                  <Image
                    source={p.image}
                    style={{
                      width: "100%",
                      height: 240,
                      borderRadius: 12,
                      marginBottom: 20,
                    }}
                  />
                )}
                <View
                  style={[
                    s.row,
                    {
                      gap: 24,
                      borderTopWidth: 1,
                      borderColor: C.line,
                      paddingTop: 18,
                    },
                  ]}
                >
                  <Pressable
                    accessibilityLabel="Like post"
                    accessibilityRole="button"
                    style={s.row}
                    onPress={() =>
                      setLiked(
                        liked.includes(p.id)
                          ? liked.filter((id) => id !== p.id)
                          : [...liked, p.id],
                      )
                    }
                  >
                    <Icon
                      name={liked.includes(p.id) ? "heart" : "heart-outline"}
                      size={19}
                      color={liked.includes(p.id) ? "#c17878" : C.muted}
                    />
                    <Text style={s.footnote}>
                      {p.likes + (liked.includes(p.id) ? 1 : 0)}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    style={s.row}
                    onPress={() => setThread(p)}
                  >
                    <Icon name="chatbubble-outline" size={18} color={C.muted} />
                    <Text style={s.footnote}>
                      {p.comments.length + (comments[p.id]?.length || 0)}{" "}
                      comments
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          {filter === "Following" && !following.length && (
            <View
              style={[s.card, { alignItems: "center", padding: 45, gap: 20 }]}
            >
              <Icon name="people-outline" size={40} color={C.teal} />
              <Text style={s.cardTitle}>Your circle is waiting</Text>
              <Text style={s.subtitle}>
                Follow people to see their moments here.
              </Text>
              <Button
                title="Find your circle"
                onPress={() => setFilter("Your circle")}
              />
            </View>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 260, gap: 20 }}>
          <View style={[s.card, { backgroundColor: "#eaf0eb" }]}>
            <Icon name="flower-outline" color={C.teal} size={30} />
            <Text style={[s.sectionTitle, { marginTop: 20 }]}>
              A little encouragement goes a long way.
            </Text>
            <Text style={s.bodyText}>
              Meet mentors who have built healthier habits and want to help
              others do the same.
            </Text>
            <Button
              title="Meet the mentors"
              secondary
              onPress={() => setFilter("Mentors")}
              icon="arrow-forward"
            />
          </View>
          <View style={s.card}>
            <Text style={s.cardTitle}>Your community compass</Text>
            {[
              "Celebrate progress, not perfection.",
              "Share your experience with kindness.",
              "For medical decisions, talk to a clinician.",
            ].map((t, i) => (
              <View
                style={[s.row, { alignItems: "flex-start", marginTop: 22 }]}
                key={t}
              >
                <Text style={{ color: C.teal, fontSize: 12 }}>0{i + 1}</Text>
                <Text style={[s.smallText, { flex: 1, lineHeight: 21 }]}>
                  {t}
                </Text>
              </View>
            ))}
            <View style={s.divider} />
            <Text style={[s.footnote, { lineHeight: 18 }]}>
              Demo members and matches are fictional. Mentor badges represent
              community participation, not medical credentials.
            </Text>
          </View>
        </View>
      </View>
      <Sheet
        visible={compose}
        onClose={() => setCompose(false)}
        title="Share a small win"
      >
        <Text style={s.bodyText}>
          Your story might be the encouragement someone needs.
        </Text>
        <TextInput
          accessibilityLabel="Your community post"
          placeholder="What felt good today?"
          multiline
          value={draft}
          onChangeText={setDraft}
          style={[
            s.input,
            { minHeight: 130, textAlignVertical: "top", marginBottom: 20 },
          ]}
          maxLength={500}
        />
        <Button
          title="Share with your circle"
          disabled={!draft.trim()}
          onPress={() => {
            setMyPosts([draft.trim(), ...myPosts]);
            setDraft("");
            setCompose(false);
            setFilter("Your circle");
            toast("Your moment is shared in the demo feed.");
          }}
        />
      </Sheet>
      <Sheet
        visible={!!thread}
        onClose={() => setThread(null)}
        title="A conversation in your circle"
      >
        {thread && (
          <>
            <Text style={s.bodyText}>{thread.text}</Text>
            {[...thread.comments, ...(comments[thread.id] || [])].map(
              (t, i) => (
                <View key={i} style={[s.demoNote, { marginBottom: 10 }]}>
                  <Text style={s.smallText}>{t}</Text>
                </View>
              ),
            )}
            <TextInput
              accessibilityLabel="Write a comment"
              placeholder="Add a little encouragement…"
              style={[s.input, { marginVertical: 18 }]}
              value={comment}
              onChangeText={setComment}
            />
            <Button
              title="Post comment"
              disabled={!comment.trim()}
              onPress={() => {
                setComments({
                  ...comments,
                  [thread.id]: [
                    ...(comments[thread.id] || []),
                    `${comment.trim()} — You`,
                  ],
                });
                setComment("");
              }}
            />
          </>
        )}
      </Sheet>
    </Page>
  );
}

function Care() {
  const { bookings, setBookings, toast } = useApp();
  const [following, setFollowing] = useState<string[]>([]);
  const [doctor, setDoctor] = useState<(typeof doctors)[number] | null>(null);
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState("");
  const [filter, setFilter] = useState("All specialists");
  const [confirmed, setConfirmed] = useState(false);
  const dates = [
    "Tue, 13 Oct",
    "Wed, 14 Oct",
    "Thu, 15 Oct",
    "Fri, 16 Oct",
    "Sat, 17 Oct",
  ];
  const unavailable = (time: string, i: number) =>
    (i + day + Number(doctor?.id || 0)) % 4 === 0 ||
    bookings.some(
      (b: Booking) =>
        b.doctor === doctor?.name && b.day === dates[day] && b.slot === time,
    );
  return (
    <Page>
      <Heading
        eyebrow="GOOD CARE, CLOSER TO YOU"
        title="Your people in health"
        subtitle="Find a specialist you connect with. Make space for yourself."
      />
      <View style={[s.row, { flexWrap: "wrap", marginBottom: 25 }]}>
        {["All specialists", "Nutrition", "General care", "Women’s health"].map(
          (f) => (
            <Chip
              key={f}
              text={f}
              selected={filter === f}
              onPress={() => setFilter(f)}
            />
          ),
        )}
      </View>
      {bookings.length > 0 && (
        <View
          style={[
            s.card,
            { marginBottom: 25, backgroundColor: C.light, gap: 16 },
          ]}
        >
          <Text style={s.cardTitle}>Your upcoming appointments</Text>
          {bookings.map((b: Booking, i: number) => (
            <View style={s.rowBetween} key={i}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={s.smallText}>{b.doctor}</Text>
                <Text style={s.footnote}>
                  {b.day} · {b.slot} · Video consultation · Demo
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setBookings(
                    bookings.filter((_: Booking, j: number) => i !== j),
                  );
                  toast("Demo appointment cancelled.");
                }}
              >
                <Text style={s.actionText}>Cancel</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <View style={s.doctorGrid}>
        {doctors
          .filter((d) =>
            filter === "Nutrition"
              ? d.id === "1"
              : filter === "General care"
                ? d.id === "2"
                : filter === "Women’s health"
                  ? d.id === "3"
                  : true,
          )
          .map((d) => (
            <View
              key={d.id}
              style={[s.card, { flexGrow: 1, flexBasis: 280, maxWidth: 450 }]}
            >
              <View style={s.rowBetween}>
                <Avatar initials={d.initials} color={d.color} size={70} />
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    setFollowing(
                      following.includes(d.id)
                        ? following.filter((id) => id !== d.id)
                        : [...following, d.id],
                    )
                  }
                  style={[s.chip, following.includes(d.id) && s.chipSelected]}
                >
                  <Text style={s.actionText}>
                    {following.includes(d.id) ? "Following" : "+ Follow"}
                  </Text>
                </Pressable>
              </View>
              <Text style={[s.sectionTitle, { marginTop: 24, fontSize: 22 }]}>
                {d.name}
              </Text>
              <Text style={{ color: C.teal, marginTop: 8, fontSize: 13 }}>
                {d.specialty}
              </Text>
              <Text style={[s.footnote, { marginTop: 8 }]}>{d.experience}</Text>
              <View style={[s.row, { marginTop: 22 }]}>
                <Icon name="star" size={14} color={C.orange} />
                <Text style={s.smallText}>
                  {d.rating}{" "}
                  <Text style={s.footnote}>({d.reviews} reviews)</Text>
                </Text>
              </View>
              <View style={[s.row, { marginVertical: 15 }]}>
                <Icon name="location-outline" size={16} color={C.muted} />
                <Text style={s.footnote}>{d.clinic}</Text>
              </View>
              <View style={[s.row, { flexWrap: "wrap", gap: 6 }]}>
                {d.tags.map((t) => (
                  <View key={t} style={s.tag}>
                    <Text style={{ color: C.muted, fontSize: 10 }}>{t}</Text>
                  </View>
                ))}
              </View>
              <View style={s.divider} />
              <View style={[s.rowBetween, { marginBottom: 20 }]}>
                <Text style={s.footnote}>Video consultation</Text>
                <Text style={s.cardTitle}>
                  ₹{d.price}
                  <Text style={s.footnote}> / session</Text>
                </Text>
              </View>
              <Button
                title="Find a time"
                icon="arrow-forward"
                onPress={() => {
                  setDoctor(d);
                  setSlot("");
                  setDay(0);
                  setConfirmed(false);
                }}
              />
            </View>
          ))}
      </View>
      <View style={[s.demoNote, { marginTop: 28 }]}>
        <Icon name="information-circle-outline" size={18} color={C.muted} />
        <Text style={[s.footnote, { flex: 1, lineHeight: 19 }]}>
          Fictional providers, prices, ratings, and availability. Bookings are
          stored only for this demo session. No payment or real appointment is
          made.
        </Text>
      </View>
      <Sheet
        visible={!!doctor}
        onClose={() => setDoctor(null)}
        title={confirmed ? "A little time for you" : "Choose your moment"}
        wide
      >
        {doctor &&
          (confirmed ? (
            <View
              style={{ alignItems: "center", gap: 20, paddingVertical: 20 }}
            >
              <View
                style={[
                  s.avatar,
                  {
                    backgroundColor: C.light,
                    height: 80,
                    width: 80,
                    borderRadius: 40,
                  },
                ]}
              >
                <Icon name="checkmark" size={40} color={C.teal} />
              </View>
              <Text style={s.sectionTitle}>You’re on the calendar.</Text>
              <Text style={[s.bodyText, { textAlign: "center" }]}>
                {doctor.name}
                {"\n"}
                {dates[day]} · {slot}
                {"\n"}Video consultation
              </Text>
              <Text style={s.footnote}>
                Demo booking confirmed. No payment required.
              </Text>
              <Button
                title="Back to your care"
                onPress={() => setDoctor(null)}
              />
            </View>
          ) : (
            <>
              <View style={s.row}>
                <Avatar
                  initials={doctor.initials}
                  color={doctor.color}
                  size={50}
                />
                <View style={{ gap: 5 }}>
                  <Text style={s.cardTitle}>{doctor.name}</Text>
                  <Text style={s.footnote}>
                    {doctor.specialty} · 30 min video visit
                  </Text>
                </View>
              </View>
              <Text style={[s.label, { marginTop: 28 }]}>
                OCTOBER 2026 · DEMO AVAILABILITY
              </Text>
              <View style={[s.row, { flexWrap: "wrap", marginTop: 12 }]}>
                {dates.map((d, i) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: day === i }}
                    key={d}
                    onPress={() => {
                      setDay(i);
                      setSlot("");
                    }}
                    style={[s.day, day === i && s.daySelected]}
                  >
                    <Text
                      style={{
                        color: day === i ? "#fff" : C.muted,
                        fontSize: 11,
                      }}
                    >
                      {d.slice(0, 3)}
                    </Text>
                    <Text
                      style={{
                        color: day === i ? "#fff" : C.ink,
                        fontSize: 23,
                        fontWeight: "600",
                        marginTop: 7,
                      }}
                    >
                      {13 + i}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={s.consultationStage}>
                <Icon name="videocam-outline" size={18} color={C.teal} />
                <Text style={s.actionText}>Your time to feel heard</Text>
              </View>
              <View style={s.slotGrid}>
                {slots.map((time, i) => {
                  const booked = unavailable(time, i);
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled: booked,
                        selected: slot === time,
                      }}
                      accessibilityLabel={`${time}${booked ? ", booked" : ""}`}
                      key={time}
                      disabled={booked}
                      onPress={() => setSlot(time)}
                      style={[
                        s.slot,
                        booked && s.slotBooked,
                        slot === time && s.slotSelected,
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: booked
                            ? "#bcc1c3"
                            : slot === time
                              ? "#fff"
                              : C.teal,
                          textDecorationLine: booked ? "line-through" : "none",
                        }}
                      >
                        {time}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View
                style={[
                  s.row,
                  { justifyContent: "center", marginVertical: 22 },
                ]}
              >
                {[
                  ["Available", "#fff"],
                  ["Selected", C.teal],
                  ["Booked", "#edf0f1"],
                ].map(([t, c]) => (
                  <View style={s.row} key={t}>
                    <View
                      style={{
                        backgroundColor: c,
                        width: 10,
                        height: 10,
                        borderWidth: 1,
                        borderColor: "#d6dfda",
                        borderRadius: 3,
                      }}
                    />
                    <Text style={s.footnote}>{t}</Text>
                  </View>
                ))}
              </View>
              <View style={s.divider} />
              <View style={[s.rowBetween, { marginBottom: 22 }]}>
                <View style={{ gap: 7 }}>
                  <Text style={s.cardTitle}>
                    {slot
                      ? `${dates[day]} · ${slot}`
                      : "Select an available time"}
                  </Text>
                  <Text style={s.footnote}>
                    All times IST · Simulated availability
                  </Text>
                </View>
                <Text style={s.sectionTitle}>₹{doctor.price}</Text>
              </View>
              <Button
                title="Confirm demo appointment"
                disabled={!slot}
                icon="checkmark"
                onPress={() => {
                  if (!slot || unavailable(slot, slots.indexOf(slot))) return;
                  setBookings([
                    ...bookings,
                    { doctor: doctor.name, day: dates[day], slot },
                  ]);
                  setConfirmed(true);
                }}
              />
            </>
          ))}
      </Sheet>
    </Page>
  );
}

function Plan() {
  const {
    profile,
    setOnboarding,
    setRecipe,
    savedRecipes,
    mealLogged,
    setMealLogged,
  } = useApp();
  const nutrition = useApp();
  const [exporting, setExporting] = useState(false);
  const [architectureOpen, setArchitectureOpen] = useState(false);
  const [exportError, setExportError] = useState("");
  const exportLock = useRef(false);
  const exportReport = () => {
    if (exportLock.current) return;
    exportLock.current = true;
    setExporting(true);
    setExportError("");
    const today = localDate();
    const todaysMeals = nutrition.days[today] || [];
    void exportHealthReport({
      profile,
      date: today,
      goals: nutrition.goals,
      totals: sumMeals(todaysMeals),
      meals: todaysMeals,
      scans: nutrition.scanHistory,
      historyWarning: nutrition.historyLoadError,
    })
      .catch((e: unknown) =>
        setExportError(
          e instanceof Error
            ? e.message
            : "Report export failed. Please try again.",
        ),
      )
      .finally(() => {
        exportLock.current = false;
        setExporting(false);
      });
  };
  return (
    <Page>
      <Heading
        eyebrow="BUILT AROUND YOUR EVERYDAY"
        title={`${profile.name}’s daily plan`}
        subtitle="Simple rhythms. Nourishing meals. Room to be you."
        action="Edit preferences"
        onPress={() => setOnboarding(true)}
      />
      <View style={[s.card, { marginBottom: 24, gap: 12 }]}>
        <View style={s.row}>
          <View style={s.smallIcon}>
            <Icon name="layers-outline" color={C.teal} />
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.cardTitle}>Behind your wellness insights</Text>
            <Text style={s.footnote}>
              Explore the technology powering WelNest.
            </Text>
          </View>
        </View>
        <Button
          title="View System Architecture"
          icon="arrow-forward"
          secondary
          onPress={() => setArchitectureOpen(true)}
        />
      </View>
      <Sheet
        visible={architectureOpen}
        onClose={() => setArchitectureOpen(false)}
        title="System Architecture"
        wide
      >
        <ArchitectureSummary />
      </Sheet>
      <View style={[s.card, { marginBottom: 24, gap: 14 }]}>
        <Text style={s.sectionTitle}>Your health, in one report</Text>
        <Text style={s.bodyText}>
          Profile, BMI, daily goals, consumed meals, and recent scans. Review it
          with your doctor or nutritionist.
        </Text>
        {!!exportError && (
          <Text accessibilityRole="alert" style={{ color: "#a44f36" }}>
            {exportError}
          </Text>
        )}
        <Button
          title={exporting ? "Preparing report…" : "Export Health Report"}
          icon="download-outline"
          disabled={
            exporting ||
            !nutrition.mealsReady ||
            nutrition.mealBusy ||
            !!nutrition.mealError
          }
          onPress={exportReport}
        />
        {!!nutrition.mealError && (
          <Text style={s.footnote}>
            Resolve the meal storage error on Overview before exporting a
            complete report.
          </Text>
        )}
        {Platform.OS === "web" && (
          <Text style={s.footnote}>
            Opens a report preview. Choose Print / Save as PDF.
          </Text>
        )}
      </View>
      <View style={[s.card, { backgroundColor: C.light, marginBottom: 24 }]}>
        <View style={s.row}>
          <Icon name="sparkles-outline" color={C.teal} />
          <Text style={s.cardTitle}>Your personalized starting point</Text>
        </View>
        <Text style={s.bodyText}>
          A balanced day inspired by your preferences:{" "}
          {profile.conditions.join(", ").toLowerCase() || "everyday wellbeing"}.
        </Text>
        <Text style={s.footnote}>
          Sample meal plan ·{" "}
          {nutrition.goals
            ? Math.round(nutrition.goals.calories) + " kcal illustrative target"
            : "No adult target calculated"}
        </Text>
      </View>
      {[
        {
          time: "08:00",
          meal: "A gentle start",
          food: "Overnight oats, berries & chia",
          kcal: 380,
          icon: "sunny-outline",
        },
        {
          time: "12:30",
          meal: "A colorful midday",
          food: "Mediterranean power bowl",
          kcal: 420,
          icon: "nutrition-outline",
        },
        {
          time: "16:00",
          meal: "Your afternoon pause",
          food: "Greek yogurt & a handful of almonds",
          kcal: 220,
          icon: "cafe-outline",
        },
        {
          time: "19:30",
          meal: "A nourishing close",
          food: "Lentil stew, brown rice & seasonal greens",
          kcal: 560,
          icon: "moon-outline",
        },
      ].map((m, i) => (
        <View
          key={m.time}
          style={[
            s.card,
            s.row,
            { marginBottom: 15, gap: 22, flexWrap: "wrap" },
          ]}
        >
          <Text style={s.actionText}>{m.time}</Text>
          <View style={s.smallIcon}>
            <Icon name={m.icon as IconName} color={C.teal} />
          </View>
          <View style={{ flex: 1, minWidth: 160, gap: 7 }}>
            <Text style={s.cardTitle}>{m.meal}</Text>
            <Text style={s.smallText}>{m.food}</Text>
            <Text style={s.footnote}>{m.kcal} kcal · sample serving</Text>
          </View>
          {i === 1 ? (
            <Button
              title={mealLogged ? "Logged ✓" : "Log meal"}
              disabled={!nutrition.mealsReady || nutrition.mealBusy}
              secondary
              onPress={() => {
                setMealLogged(!mealLogged);
              }}
            />
          ) : (
            <Icon name="ellipse-outline" color="#c9d4cd" />
          )}
        </View>
      ))}
      <Text style={[s.footnote, { marginTop: 10, lineHeight: 20 }]}>
        The sample meals total 1,580 kcal; snacks and portions can fill the
        remaining daily target. Demo recommendations are not a clinical diet
        prescription.
      </Text>
      <View style={{ alignSelf: "flex-start", marginTop: 25 }}>
        <Button
          title="Explore a recipe"
          icon="arrow-forward"
          onPress={() => setRecipe(recipes[0])}
        />
      </View>
      {savedRecipes.length > 0 && (
        <View style={[s.card, { marginTop: 22, gap: 18 }]}>
          <Text style={s.cardTitle}>Your saved recipes</Text>
          {recipes
            .filter((r) => savedRecipes.includes(r.id))
            .map((r) => (
              <Pressable
                accessibilityRole="button"
                key={r.id}
                onPress={() => setRecipe(r)}
                style={s.rowBetween}
              >
                <Text style={s.smallText}>{r.title}</Text>
                <Icon name="arrow-forward" color={C.teal} size={18} />
              </Pressable>
            ))}
        </View>
      )}
    </Page>
  );
}

function Onboarding({ visible, onClose }: any) {
  const { profile, setProfile, toast } = useApp();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Profile>(profile);
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const saving = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const close = () => {
    if (!saving.current) onClose();
  };
  const generate = async () => {
    if (saving.current) return;
    try {
      const completed = normalizeProfile(draft);
      saving.current = true;
      setError("");
      setStep(2);
      const saved = await saveProfile(completed);
      if (mounted.current) {
        setProfile(saved);
        setDraft(saved);
        setStep(3);
      }
    } catch (e) {
      if (mounted.current) {
        setError(
          e instanceof Error
            ? e.message
            : "Could not save your profile. Please retry.",
        );
        setStep(1);
      }
    } finally {
      saving.current = false;
    }
  };
  let bmiPreview = "Enter height and weight to calculate BMI.";
  try {
    const calculated = calculateBMI(Number(draft.height), Number(draft.weight));
    bmiPreview =
      Number(draft.age) >= 20
        ? "BMI " + calculated.bmi.toFixed(1) + " · " + calculated.bmiCategory
        : "BMI " +
          calculated.bmi.toFixed(1) +
          " · Adult categories do not apply under age 20.";
  } catch {
    /* Incomplete input is normal while editing. */
  }
  return (
    <Sheet visible={visible} onClose={close} title="A little about you" wide>
      {step < 2 ? (
        <>
          <View style={[s.row, { marginBottom: 22 }]}>
            {[0, 1].map((n) => (
              <View
                key={n}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 3,
                  backgroundColor: n <= step ? C.teal : C.line,
                }}
              />
            ))}
            <Text style={s.footnote}>{step + 1} / 2</Text>
          </View>
          <Text style={s.eyebrow}>
            {step === 0 ? "YOUR STORY STARTS HERE" : "WELLNESS, ON YOUR TERMS"}
          </Text>
          <Text style={[s.sectionTitle, { fontSize: 27 }]}>
            {step === 0
              ? "Let’s make this feel like you."
              : "What should we keep in mind?"}
          </Text>
          <Text style={s.bodyText}>
            Your profile is saved on this device. BMI is a screening measure,
            not a diagnosis.
          </Text>
          {step === 0 ? (
            <>
              <Text style={s.label}>WHAT SHOULD WE CALL YOU?</Text>
              <TextInput
                accessibilityLabel="Name"
                placeholder="Your first name"
                value={draft.name}
                onChangeText={(name) => setDraft({ ...draft, name })}
                style={s.input}
                maxLength={30}
              />
              <View
                style={[
                  s.row,
                  { alignItems: "flex-start", gap: 18, marginTop: 22 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>AGE</Text>
                  <TextInput
                    accessibilityLabel="Age"
                    keyboardType="number-pad"
                    value={draft.age}
                    onChangeText={(age) =>
                      setDraft({ ...draft, age: age.replace(/[^0-9]/g, "") })
                    }
                    style={s.input}
                    maxLength={3}
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={s.label}>BLOOD TYPE</Text>
                  <View
                    style={[s.row, { flexWrap: "wrap", marginTop: 8, gap: 6 }]}
                  >
                    {[
                      "A+",
                      "A−",
                      "B+",
                      "B−",
                      "AB+",
                      "AB−",
                      "O+",
                      "O−",
                      "Unknown",
                    ].map((blood) => (
                      <Chip
                        key={blood}
                        text={blood}
                        selected={draft.blood === blood}
                        onPress={() => setDraft({ ...draft, blood })}
                      />
                    ))}
                  </View>
                </View>
              </View>
              <View
                style={[s.row, { marginTop: 22, alignItems: "flex-start" }]}
              >
                {(
                  [
                    ["height", "HEIGHT (CM)"],
                    ["weight", "WEIGHT (KG)"],
                  ] as const
                ).map(([key, label]) => (
                  <View key={key} style={{ flex: 1 }}>
                    <Text style={s.label}>{label}</Text>
                    <TextInput
                      accessibilityLabel={label}
                      keyboardType="decimal-pad"
                      value={draft[key]}
                      maxLength={6}
                      onChangeText={(value) =>
                        setDraft({
                          ...draft,
                          [key]: value
                            .replace(",", ".")
                            .replace(/[^0-9.]/g, ""),
                        })
                      }
                      style={s.input}
                    />
                  </View>
                ))}
              </View>
              <Text style={[s.footnote, { marginTop: 14, lineHeight: 20 }]}>
                {bmiPreview}
              </Text>
              <Text style={[s.label, { marginTop: 23 }]}>GENDER</Text>
              <View style={[s.row, { flexWrap: "wrap", marginTop: 9 }]}>
                {["Woman", "Man", "Non-binary", "Prefer not to say"].map(
                  (gender) => (
                    <Chip
                      key={gender}
                      text={gender}
                      selected={draft.gender === gender}
                      onPress={() =>
                        setDraft({
                          ...draft,
                          gender,
                          cycle: gender === "Woman" ? draft.cycle : false,
                        })
                      }
                    />
                  ),
                )}
              </View>
            </>
          ) : (
            <>
              <Text style={s.label}>EXISTING CONDITIONS & WELLNESS FOCUS</Text>
              <View style={[s.row, { flexWrap: "wrap", marginVertical: 14 }]}>
                {[
                  "Mindful sugar intake",
                  "High blood pressure",
                  "PCOS",
                  "Food sensitivities",
                  "Balanced nutrition",
                ].map((condition) => (
                  <Chip
                    key={condition}
                    text={condition}
                    selected={draft.conditions.includes(condition)}
                    onPress={() =>
                      setDraft({
                        ...draft,
                        conditions: draft.conditions.includes(condition)
                          ? draft.conditions.filter((c) => c !== condition)
                          : [...draft.conditions, condition],
                      })
                    }
                  />
                ))}
              </View>
              <Text style={s.footnote}>
                Optional · select all that fit, or leave blank.
              </Text>
              {draft.gender === "Woman" && (
                <View
                  style={[s.demoNote, { marginTop: 25, alignItems: "center" }]}
                >
                  <Icon name="flower-outline" color={C.purple} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>Cycle-aware wellbeing</Text>
                    <Text style={[s.footnote, { marginTop: 7 }]}>
                      Include a mock cycle-tracking preference.
                    </Text>
                  </View>
                  <Chip
                    text={draft.cycle ? "On" : "Off"}
                    selected={draft.cycle}
                    onPress={() => setDraft({ ...draft, cycle: !draft.cycle })}
                  />
                </View>
              )}
              <Text style={[s.footnote, { marginTop: 25, lineHeight: 20 }]}>
                Blood type is collected only to demonstrate the form; it does
                not determine nutrition needs. This prototype uses a sample
                balanced meal plan.
              </Text>
            </>
          )}
          {error ? (
            <Text style={{ color: "#b45f4d", marginTop: 16 }}>{error}</Text>
          ) : null}
          <View style={[s.row, { marginTop: 30 }]}>
            {step === 1 && (
              <Button title="Back" secondary onPress={() => setStep(0)} />
            )}
            <View style={{ flex: 1 }}>
              <Button
                title={
                  step === 0 ? "A little more about you" : "Save my profile"
                }
                icon="arrow-forward"
                onPress={() => {
                  if (step === 0) {
                    if (
                      !draft.name.trim() ||
                      Number(draft.age) < 1 ||
                      Number(draft.age) > 120
                    ) {
                      setError("Enter a name and an age between 1 and 120.");
                      return;
                    }
                    try {
                      normalizeProfile(draft);
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Check your measurements.",
                      );
                      return;
                    }
                    setError("");
                    setStep(1);
                  } else void generate();
                }}
              />
            </View>
          </View>
        </>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 35, gap: 22 }}>
          {step === 2 ? (
            <>
              <ActivityIndicator size="large" color={C.teal} />
              <Text style={s.sectionTitle}>Saving your profile…</Text>
              <Text style={[s.bodyText, { textAlign: "center" }]}>
                Calculating your BMI and saving your preferences on this device.
              </Text>
              <Text style={s.footnote}>Local profile storage</Text>
            </>
          ) : (
            <>
              <View
                style={[
                  s.avatar,
                  {
                    width: 75,
                    height: 75,
                    borderRadius: 40,
                    backgroundColor: C.light,
                  },
                ]}
              >
                <Icon name="leaf-outline" size={35} color={C.teal} />
              </View>
              <Text style={s.sectionTitle}>Your next chapter is ready.</Text>
              <Text style={[s.bodyText, { textAlign: "center" }]}>
                Welcome, {draft.name}. Your profile is saved. {bmiPreview} The
                meal plan in My Plan remains a sample.
                {draft.cycle
                  ? "\nCycle-aware wellbeing is enabled in your demo profile."
                  : ""}
              </Text>
              <Button
                title="Let’s feel a little better"
                icon="arrow-forward"
                onPress={() => {
                  close();
                  toast("Your profile and BMI are saved on this device.");
                }}
              />
            </>
          )}
        </View>
      )}
    </Sheet>
  );
}

function AppShell() {
  const width = useWindowDimensions().width,
    desktop = width >= 900;
  const [profile, setProfile] = useState(initialProfile);
  const [onboarding, setOnboarding] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [historyLoadError, setHistoryLoadError] = useState("");
  const [profileLoadError, setProfileLoadError] = useState("");
  useEffect(() => {
    let live = true;
    void Promise.allSettled([loadProfile(), loadScanHistory()]).then(
      ([saved, history]) => {
        if (!live) return;
        if (saved.status === "fulfilled" && saved.value)
          setProfile(saved.value);
        else {
          setOnboarding(true);
          if (saved.status === "rejected")
            setProfileLoadError(
              "Your saved profile could not be read. Complete the form to save a new profile.",
            );
        }
        if (history.status === "fulfilled") setScanHistory(history.value);
        else
          setHistoryLoadError(
            "Saved scans could not be read. Your existing data has not been overwritten.",
          );
        setHydrating(false);
      },
    );
    return () => {
      live = false;
    };
  }, []);
  const [water, setWater] = useState(5);
  const [savedRecipes, setSavedRecipes] = useState<string[]>([]);
  const nutrition = useNutrition(profile);

  const [recipe, setRecipe] = useState<(typeof recipes)[number] | null>(null);
  const [article, setArticle] = useState<(typeof news)[number] | null>(null);
  const [rating, setRating] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [message, setMessage] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [active, setActive] = useState("Overview");
  const navRef = useRef<any>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  const toast = (text: string) => {
    setMessage(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(""), 3200);
  };
  if (hydrating)
    return (
      <SafeAreaView
        style={[
          s.app,
          { alignItems: "center", justifyContent: "center", gap: 18 },
        ]}
      >
        <ActivityIndicator size="large" color={C.teal} />
        <Text style={s.smallText}>Opening your wellness space…</Text>
      </SafeAreaView>
    );
  const navItems: { name: string; icon: IconName; component: any }[] = [
    { name: "Overview", icon: "grid-outline", component: Dashboard },
    { name: "My Plan", icon: "leaf-outline", component: Plan },
    { name: "AI Lens", icon: "scan-outline", component: Lens },
    { name: "Community", icon: "people-outline", component: Community },
    { name: "Find Care", icon: "heart-outline", component: Care },
  ];
  return (
    <Context.Provider
      value={{
        profile,
        setProfile,
        scanHistory,
        setScanHistory,
        historyLoadError,
        water,
        setWater,
        ...nutrition,
        setOnboarding,
        setRecipe,
        savedRecipes,
        setArticle,
        setRating,
        bookings,
        setBookings,
        toast,
      }}
    >
      <SafeAreaView style={s.app} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, flexDirection: "row" }}>
          {desktop && (
            <View style={s.sidebar}>
              <View style={s.logoRow}>
                <View style={s.logoMark}>
                  <Icon name="leaf" size={24} color="#fff" />
                </View>
                <Text style={s.logoText}>
                  welnest<Text style={{ color: C.teal }}>.</Text>
                </Text>
              </View>
              <Text
                style={[
                  s.miniEyebrow,
                  { marginLeft: 19, marginTop: 43, marginBottom: 18 },
                ]}
              >
                YOUR WELLNESS SPACE
              </Text>
              <View style={{ gap: 7 }}>
                {navItems.map((item) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active === item.name }}
                    key={item.name}
                    onPress={() => navRef.current?.navigate(item.name)}
                    style={[s.navItem, active === item.name && s.navActive]}
                  >
                    <Icon
                      name={item.icon}
                      color={active === item.name ? C.teal : "#90989e"}
                      size={21}
                    />
                    <Text
                      style={[
                        s.navText,
                        active === item.name && {
                          color: C.teal,
                          fontWeight: "600",
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                    {item.name === "AI Lens" && (
                      <View style={s.newBadge}>
                        <Text
                          style={{
                            color: C.teal,
                            fontSize: 8,
                            fontWeight: "700",
                          }}
                        >
                          AI
                        </Text>
                      </View>
                    )}
                    {active === item.name && <View style={s.navDot} />}
                  </Pressable>
                ))}
              </View>
              <View style={{ flex: 1 }} />
              <View style={s.sidebarQuote}>
                <Icon name="flower-outline" color={C.teal} size={25} />
                <Text
                  style={{
                    fontSize: 17,
                    lineHeight: 25,
                    color: C.ink,
                    marginTop: 13,
                  }}
                >
                  Wellness is a journey.<Text>{"\n"}</Text>Make it yours.
                </Text>
                <Text style={[s.footnote, { marginTop: 12, lineHeight: 18 }]}>
                  Small steps. Meaningful change.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setOnboarding(true)}
                style={s.sidebarProfile}
              >
                <Avatar
                  initials={profile.name.slice(0, 2).toUpperCase()}
                  color="#eaded1"
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={s.cardTitle}>{profile.name}</Text>
                  <Text style={s.footnote}>Your personal space</Text>
                </View>
                <Icon name="chevron-forward" size={16} color={C.muted} />
              </Pressable>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={[s.topbar, !desktop && { paddingHorizontal: 20 }]}>
              {desktop ? (
                <View style={s.row}>
                  <Text style={s.footnote}>My workspace</Text>
                  <Icon name="chevron-forward" size={12} color="#b9c0c3" />
                  <Text style={s.smallText}>{active}</Text>
                </View>
              ) : (
                <View style={s.row}>
                  <Icon name="leaf" color={C.teal} size={23} />
                  <Text style={[s.logoText, { fontSize: 24 }]}>welnest.</Text>
                </View>
              )}
              <View style={[s.row, { gap: 18 }]}>
                <View style={[s.livePill, width < 500 && { display: "none" }]}>
                  <View style={s.tinyGreenDot} />
                  <Text style={{ fontSize: 10, color: C.teal }}>
                    Your wellness, in sync
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Notifications"
                  style={s.notification}
                  onPress={() => setNotifications(true)}
                >
                  <Icon
                    name="notifications-outline"
                    size={20}
                    color="#7f898d"
                  />
                  <View style={s.notificationDot} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile"
                  onPress={() => setOnboarding(true)}
                >
                  <Avatar
                    initials={profile.name.slice(0, 2).toUpperCase()}
                    color="#eaded1"
                    size={34}
                  />
                </Pressable>
              </View>
            </View>
            <NavigationContainer
              ref={navRef}
              onStateChange={() =>
                setActive(navRef.current?.getCurrentRoute()?.name || "Overview")
              }
            >
              <Tab.Navigator
                screenOptions={({ route }) => ({
                  headerShown: false,
                  animation: "none",
                  tabBarStyle: desktop
                    ? { display: "none" }
                    : {
                        height: Platform.OS === "ios" ? 86 : 72,
                        paddingTop: 7,
                        paddingBottom: Platform.OS === "ios" ? 24 : 10,
                        borderTopColor: C.line,
                        elevation: 0,
                      },
                  tabBarActiveTintColor: C.teal,
                  tabBarInactiveTintColor: C.muted,
                  tabBarLabelStyle: { fontSize: 10, marginTop: 3 },
                  tabBarIcon: ({ color, size }) => (
                    <Icon
                      name={navItems.find((i) => i.name === route.name)!.icon}
                      color={color}
                      size={size - 2}
                    />
                  ),
                })}
              >
                {navItems.map((item) => (
                  <Tab.Screen
                    key={item.name}
                    name={item.name}
                    component={item.component}
                  />
                ))}
              </Tab.Navigator>
            </NavigationContainer>
          </View>
        </View>
        {!!profileLoadError && (
          <View style={s.demoNote}>
            <Text style={s.footnote}>{profileLoadError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setProfileLoadError("")}
            >
              <Text style={s.actionText}>Dismiss</Text>
            </Pressable>
          </View>
        )}
        {onboarding && (
          <Onboarding visible onClose={() => setOnboarding(false)} />
        )}
        <Sheet
          visible={!!recipe}
          onClose={() => setRecipe(null)}
          title="A little more flavor"
        >
          {recipe && (
            <>
              <Image
                source={recipe.image}
                style={{
                  height: 220,
                  width: "100%",
                  borderRadius: 16,
                  marginBottom: 22,
                }}
              />
              <Text style={s.eyebrow}>
                {recipe.origin} · {recipe.time}
              </Text>
              <Text style={s.sectionTitle}>{recipe.title}</Text>
              <Text style={[s.label, { marginTop: 25 }]}>WHAT YOU’LL NEED</Text>
              {recipe.ingredients.map((i) => (
                <Text key={i} style={[s.smallText, { marginTop: 12 }]}>
                  • {i}
                </Text>
              ))}
              <Text style={[s.label, { marginTop: 25 }]}>MAKE IT YOURS</Text>
              <Text style={s.bodyText}>{recipe.steps}</Text>
              <Text style={[s.footnote, { marginBottom: 20 }]}>
                {recipe.calories} kcal · {recipe.protein}g protein · approximate
                demo values
              </Text>
              <Button
                title={
                  savedRecipes.includes(recipe.id)
                    ? "Saved to My Plan"
                    : "Save recipe"
                }
                icon={
                  savedRecipes.includes(recipe.id)
                    ? "bookmark"
                    : "bookmark-outline"
                }
                secondary={savedRecipes.includes(recipe.id)}
                onPress={() => {
                  const saved = savedRecipes.includes(recipe.id);
                  setSavedRecipes(
                    saved
                      ? savedRecipes.filter((id) => id !== recipe.id)
                      : [...savedRecipes, recipe.id],
                  );
                  toast(
                    saved
                      ? "Recipe removed from your saved list."
                      : "Recipe saved to My Plan.",
                  );
                }}
              />
            </>
          )}
        </Sheet>
        <Sheet
          visible={!!article}
          onClose={() => setArticle(null)}
          title="The daily read"
        >
          {article && (
            <>
              <Text style={s.eyebrow}>{article.category}</Text>
              <Text style={s.sectionTitle}>{article.title}</Text>
              <Text style={s.bodyText}>{article.text}</Text>
              <Text style={s.footnote}>
                WelNest editorial sample · Not a live news feed.
              </Text>
            </>
          )}
        </Sheet>
        <Sheet
          visible={rating}
          onClose={() => setRating(false)}
          title="Progress that feels good"
        >
          <Ring value={0.86}>
            <Text style={s.ringValue}>86</Text>
            <Text style={s.footnote}>Health rating</Text>
          </Ring>
          <Text style={s.bodyText}>
            Your community reputation celebrates consistent habits and
            supportive participation.
          </Text>
          {[
            ["Mindful habits", "34 / 40"],
            ["Daily consistency", "27 / 30"],
            ["Community kindness", "25 / 30"],
          ].map(([t, v]) => (
            <View key={t} style={[s.rowBetween, { marginVertical: 12 }]}>
              <Text style={s.smallText}>{t}</Text>
              <Text style={s.actionText}>{v}</Text>
            </View>
          ))}
          <Text style={[s.footnote, { marginTop: 20, lineHeight: 20 }]}>
            This is an illustrative reputation score, not a clinical health
            assessment. Mentor status reflects participation, not professional
            qualifications.
          </Text>
        </Sheet>
        <Sheet
          visible={notifications}
          onClose={() => setNotifications(false)}
          title="A few gentle nudges"
        >
          {[
            [
              "water-outline",
              "A moment to hydrate",
              "A glass of water is a lovely place to start.",
            ],
            [
              "people-outline",
              "Your circle is growing",
              "Priya and Sarah are sharing their small wins.",
            ],
            [
              "leaf-outline",
              "Make your plan yours",
              "Update your preferences to explore onboarding.",
            ],
          ].map(([icon, title, text]) => (
            <View
              key={title}
              style={[
                s.row,
                {
                  alignItems: "flex-start",
                  paddingVertical: 20,
                  borderBottomWidth: 1,
                  borderColor: C.line,
                },
              ]}
            >
              <Icon name={icon as IconName} color={C.teal} />
              <View style={{ flex: 1, gap: 7 }}>
                <Text style={s.cardTitle}>{title}</Text>
                <Text style={s.footnote}>{text}</Text>
              </View>
            </View>
          ))}
        </Sheet>
        {!!message && (
          <View pointerEvents="none" style={s.toast}>
            <Icon name="checkmark-circle" color="#a8d1b9" size={19} />
            <Text style={{ color: "#fff", fontSize: 13, flexShrink: 1 }}>
              {message}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Context.Provider>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <AppShell />
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.bg },
  row: { flexDirection: "row", alignItems: "center", gap: 9 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sidebar: {
    width: 231,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 18,
    paddingTop: 31,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 13,
  },
  logoMark: {
    backgroundColor: C.teal,
    width: 37,
    height: 39,
    borderRadius: 13,
    borderTopRightRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: C.ink,
    fontSize: 29,
    fontWeight: "700",
    letterSpacing: -1.6,
  },
  navItem: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  navActive: { backgroundColor: "#eaf2ed" },
  navText: { fontSize: 13, color: "#7e898f" },
  navDot: {
    width: 5,
    height: 5,
    backgroundColor: C.teal,
    borderRadius: 4,
    marginLeft: "auto",
  },
  newBadge: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    backgroundColor: "#eaf2ed",
    borderRadius: 4,
  },
  sidebarQuote: {
    margin: 10,
    marginBottom: 34,
    padding: 19,
    backgroundColor: "#f7f8f3",
    borderRadius: 13,
  },
  sidebarProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
    paddingHorizontal: 7,
    borderTopWidth: 1,
    borderColor: C.line,
  },
  topbar: {
    height: 81,
    paddingHorizontal: 38,
    borderBottomWidth: 1,
    borderColor: C.line,
    backgroundColor: "#ffffffdd",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  livePill: { flexDirection: "row", alignItems: "center", gap: 7 },
  notification: { padding: 5 },
  notificationDot: {
    width: 4,
    height: 4,
    backgroundColor: "#cda383",
    borderRadius: 2,
    position: "absolute",
    right: 7,
    top: 5,
  },
  page: {
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 20,
    backgroundColor: C.bg,
    flexGrow: 1,
  },
  pageInner: { width: "100%", maxWidth: 1240, alignSelf: "center" },
  pageTitle: {
    fontSize: 29,
    letterSpacing: -0.9,
    fontWeight: "600",
    color: C.ink,
    marginTop: 8,
  },
  eyebrow: {
    color: "#8b9a93",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.7,
    marginBottom: 5,
  },
  subtitle: { color: C.muted, fontSize: 12, marginTop: 9, lineHeight: 19 },
  smallText: { color: C.ink, fontSize: 12 },
  footnote: { color: C.muted, fontSize: 11 },
  bodyText: {
    color: "#7c898c",
    fontSize: 14,
    lineHeight: 25,
    marginVertical: 19,
  },
  datePill: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 11,
    borderWidth: 1,
    borderColor: "#e5e9e7",
    backgroundColor: "#fff",
    borderRadius: 7,
  },
  dashboardColumns: { flexDirection: "row", gap: 25, alignItems: "stretch" },
  rightColumn: { width: 287, gap: 24 },
  hero: {
    borderRadius: 17,
    overflow: "hidden",
    minHeight: 264,
    flexDirection: "row",
    alignItems: "center",
  },
  heroText: { flex: 1.2, padding: 28, paddingRight: 0, zIndex: 1 },
  badge: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: "#ffffff99",
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
    borderRadius: 5,
  },
  badgeText: {
    color: C.teal,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 31,
    lineHeight: 40,
    color: "#2e4940",
    fontWeight: "500",
    letterSpacing: -1.1,
    marginTop: 15,
  },
  heroDescription: {
    color: "#7b8d81",
    fontSize: 11,
    lineHeight: 19,
    marginTop: 10,
    maxWidth: 245,
  },
  heroPhotoWrap: {
    width: "40%",
    height: 240,
    justifyContent: "center",
    alignItems: "center",
    marginRight: -12,
  },
  heroPhoto: {
    width: 215,
    height: 215,
    borderRadius: 110,
    borderWidth: 9,
    borderColor: "#ffffff65",
  },
  floatingLabel: {
    position: "absolute",
    bottom: 20,
    left: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 7,
    backgroundColor: "#ffffffee",
    boxShadow: "0 4px 15px #274b3710",
  },
  tinyGreenDot: {
    width: 5,
    height: 5,
    backgroundColor: "#70a18a",
    borderRadius: 4,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    marginBottom: 19,
  },
  sectionTitle: {
    color: C.ink,
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  inlineAction: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionText: { color: C.teal, fontSize: 11, fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 23,
    borderWidth: 1,
    borderColor: "#eaeef0",
  },
  cardTitle: { fontSize: 13, fontWeight: "600", color: C.ink },
  nutritionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 17 },
  calorieCard: { flex: 1, minWidth: 190, alignItems: "center", gap: 20 },
  ringValue: {
    fontSize: 29,
    fontWeight: "600",
    color: C.ink,
    letterSpacing: -0.9,
    marginVertical: 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  track: {
    backgroundColor: "#f0f1f2",
    height: 6,
    borderRadius: 4,
    overflow: "hidden",
  },
  smallIcon: {
    backgroundColor: "#edf3ef",
    height: 32,
    width: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 21 },
  recipeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  recipeCard: {
    flex: 1,
    minWidth: 210,
    borderRadius: 13,
    backgroundColor: "#fff",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.line,
  },
  recipeImage: { height: 151, width: "100%" },
  recipeTime: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: "#ffffffee",
    borderRadius: 5,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },
  miniEyebrow: {
    fontSize: 8,
    color: "#8e9b95",
    fontWeight: "600",
    letterSpacing: 1.1,
  },
  lensMini: { borderRadius: 13, padding: 22, backgroundColor: "#2e4c41" },
  newsItem: { flexDirection: "row", gap: 12, alignItems: "center" },
  button: {
    backgroundColor: C.teal,
    paddingHorizontal: 17,
    paddingVertical: 13,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  buttonSecondary: {
    backgroundColor: "#ffffffa0",
    borderWidth: 1,
    borderColor: "#d7e3dc",
  },
  buttonText: { fontSize: 11, fontWeight: "600", color: "#fff" },
  chip: {
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e9e7",
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  chipSelected: { borderColor: "#9bbbac", backgroundColor: "#eaf2ed" },
  chipText: { color: C.muted, fontSize: 12 },
  avatar: { alignItems: "center", justifyContent: "center" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 15,
    paddingVertical: 28,
    marginTop: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#10251db3",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  modal: {
    width: "100%",
    maxWidth: 510,
    maxHeight: "92%",
    borderRadius: 22,
    backgroundColor: "#fff",
    overflow: "hidden",
    boxShadow: "0 20px 70px #00000022",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 26,
    paddingTop: 20,
    paddingBottom: 18,
  },
  iconButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f5f4",
  },
  input: {
    borderWidth: 1,
    borderColor: "#dce3df",
    borderRadius: 9,
    padding: 14,
    color: C.ink,
    fontSize: 14,
    marginTop: 8,
    backgroundColor: "#fbfcfb",
  },
  label: {
    color: "#74857b",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.1,
  },
  demoNote: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: "#eef1f0",
    flexDirection: "row",
    gap: 12,
  },
  toast: {
    position: "absolute",
    bottom: 87,
    alignSelf: "center",
    maxWidth: "90%",
    backgroundColor: "#263f34",
    borderRadius: 12,
    padding: 18,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    boxShadow: "0 5px 24px #00000020",
  },
  twoCol: { flexDirection: "row", flexWrap: "wrap", gap: 26 },
  scanner: {
    minWidth: 275,
    height: 575,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  scannerTop: {
    position: "absolute",
    top: 22,
    left: 22,
    right: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  darkBadge: {
    backgroundColor: "#142e28a0",
    borderRadius: 5,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  scanFrame: { width: 240, height: 240, marginTop: -95 },
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: "#e8f5e8",
    borderRadius: 4,
  },
  scanLine: {
    height: 2,
    backgroundColor: "#b4ffd0",
    width: "95%",
    alignSelf: "center",
    boxShadow: "0 0 15px #b4ffd0",
  },
  scanCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerCaption: { color: "#fff", fontSize: 12, marginTop: 22 },
  scannerBottom: {
    position: "absolute",
    bottom: 25,
    alignItems: "center",
    gap: 16,
  },
  modeChip: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 30,
    backgroundColor: "#ffffff20",
  },
  shutter: {
    width: 64,
    height: 64,
    backgroundColor: "#fff",
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 5,
    borderColor: "#ffffff80",
  },
  verdict: {
    flexDirection: "row",
    gap: 12,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  doctorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  tag: {
    backgroundColor: "#f5f6f6",
    borderRadius: 5,
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  day: {
    flex: 1,
    minWidth: 50,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e4eae7",
    backgroundColor: "#fff",
  },
  daySelected: { backgroundColor: C.teal, borderColor: C.teal },
  consultationStage: {
    backgroundColor: "#edf3ef",
    borderTopWidth: 3,
    borderColor: "#9ebbad",
    borderRadius: 25,
    padding: 13,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 32,
    marginBottom: 25,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  slot: {
    width: "22%",
    minWidth: 75,
    paddingVertical: 15,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#c5d9cb",
    backgroundColor: "#fff",
  },
  slotBooked: { backgroundColor: "#edf0f1", borderColor: "#edf0f1" },
  slotSelected: { backgroundColor: C.teal, borderColor: C.teal },
});
