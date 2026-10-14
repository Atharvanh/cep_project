import type { Profile, ScanRecord } from "./health";
import type { Goals, Meal, Nutrients } from "./nutrition";
export type ReportData = {
  profile: Profile;
  date: string;
  goals: Goals | null;
  totals: Nutrients;
  meals: Meal[];
  scans: ScanRecord[];
  historyWarning?: string;
};
export const escapeHtml = (value: unknown): string =>
  String(value ?? "—").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const number = (n: number | null | undefined) =>
  n == null ? "Unavailable" : Number(n.toFixed(1)).toLocaleString("en-US");
export function buildHealthReport(data: ReportData): string {
  const { profile: p, goals, totals, meals, scans, date } = data;
  const rows = [
    ["Name", p.name],
    ["Age / gender", `${p.age} / ${p.gender}`],
    ["Height / weight", `${p.height || "—"} cm / ${p.weight || "—"} kg`],
    [
      "BMI / status",
      `${number(p.bmi)} / ${p.bmiCategory || "Adult classification unavailable"}`,
    ],
    ["Blood type", p.blood],
    ["Conditions / interests", p.conditions.join(", ") || "None recorded"],
    ["Cycle wellbeing preference", p.cycle ? "Enabled" : "Disabled"],
  ];
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>WelNest Health Report</title><style>
  h2{break-after:avoid}h2+p{break-after:avoid}
  @page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;color:#202b36;font-size:11px;line-height:1.5;margin:0}header{border-bottom:3px solid #337a6b;padding-bottom:16px;margin-bottom:22px}h1{font-size:28px;margin:0}h2{font-size:16px;margin:24px 0 10px;color:#337a6b}p{margin:8px 0}.sub{color:#58676a}.badge{font-size:10px;letter-spacing:2px;color:#337a6b}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{text-align:left;border-bottom:1px solid #dde4e1;padding:9px 8px;vertical-align:top;overflow-wrap:anywhere}th{background:#edf3ef}thead{display:table-header-group}tr{break-inside:avoid}.note{padding:12px;background:#f1f5f2;margin:16px 0}footer{margin-top:24px;border-top:1px solid #dde4e1;padding-top:12px;color:#58676a}.print{padding:12px;margin:16px 0}@media print{.print{display:none}}
  </style></head><body><header><div class="badge">WELNEST · PERSONAL HEALTH SUMMARY</div><h1>A clearer view of your day</h1><p>${escapeHtml(p.name)} · Local day ${escapeHtml(date)}</p><p class="sub">Prepared ${escapeHtml(new Date().toLocaleString())} · Self-reported profile and product-label data</p></header>
  <h2>Your profile</h2><table>${rows.map(([k, v]) => `<tr><th style="width:32%">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join("")}</table>
  <h2>Daily nutrition · consumed vs goal</h2><table><thead><tr><th>Nutrient</th><th>Consumed</th><th>Illustrative goal</th></tr></thead><tbody>${(
    [
      ["Calories", "calories", "kcal"],
      ["Carbohydrates", "carbs", "g"],
      ["Protein", "protein", "g"],
      ["Fat", "fat", "g"],
    ] as const
  )
    .map(
      ([label, key, unit]) =>
        `<tr><td>${label}</td><td>${number(totals[key])} ${unit}</td><td>${goals ? number(goals[key]) + " " + unit : "Not calculated"}</td></tr>`,
    )
    .join("")}</tbody></table>
  <div class="note">${escapeHtml(goals?.explanation || "Adult targets require a complete profile aged 20 or above. No pediatric nutrition target is generated.")}</div>
  <h2>Meals logged for this day</h2><table><thead><tr><th>Meal</th><th>Portion</th><th>Calories</th></tr></thead><tbody>${meals.length ? meals.map((m) => `<tr><td>${escapeHtml(m.name)}${m.source === "demo" ? " · DEMO" : ""}</td><td>${number(m.amount)} ${escapeHtml(m.unit)}</td><td>${number(m.calories)} kcal</td></tr>`).join("") : '<tr><td colspan="3">No meals logged. Zero totals mean no recorded consumption, not verified intake.</td></tr>'}</tbody></table>
  <h2>Recent scanned products · last 10</h2><p class="sub">Scans show products viewed, not necessarily eaten. Calories below are label values, not consumed portions.</p>${data.historyWarning ? `<p>${escapeHtml(data.historyWarning)}</p>` : ""}<table><thead><tr><th>Product</th><th>Viewed</th><th>Label energy</th></tr></thead><tbody>${
    scans.length
      ? scans
          .slice(0, 10)
          .map(
            (s) =>
              `<tr><td>${escapeHtml(s.productName)}</td><td>${escapeHtml(new Date(s.timestamp).toLocaleString())}</td><td>${number(s.calories)}${s.calories === null ? "" : " kcal"} / ${s.basis === "100g" ? "100 g" : "serving"}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="3">No saved scans.</td></tr>'
  }</tbody></table>
  <footer>For discussion with your clinician or nutritionist. This prototype is not a diagnosis or individualized treatment plan. Open Food Facts data is community contributed; confirm values against packaging. BMI is a screening measure. This report contains personal health information; share only with your intended recipient.</footer></body></html>`;
}
