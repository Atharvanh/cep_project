import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { buildHealthReport } from "./report";
import type { ReportData } from "./report";

export async function exportHealthReport(data: ReportData): Promise<void> {
  const html = buildHealthReport(data);
  if (Platform.OS === "web") {
    // Print the report document, not the app's navigation/UI. Open synchronously
    // from the button gesture so popup blockers can permit the preview.
    const preview = window.open("", "_blank");
    if (!preview)
      throw new Error(
        "Allow pop-ups to open the health report, then try again.",
      );
    preview.opener = null;
    preview.document.open();
    preview.document.write(html);
    preview.document.close();
    const button = preview.document.createElement("button");
    button.className = "print";
    button.textContent = "Print / Save as PDF";
    button.onclick = () => preview.print();
    preview.document.body.prepend(button);
    return;
  }
  const { uri } = await Print.printToFileAsync({
    html,
    width: 595,
    height: 842,
  });
  if (await Sharing.isAvailableAsync())
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: "WelNest health summary",
    });
  else await Print.printAsync({ uri });
}
