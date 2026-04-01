import "dotenv/config";
import { sendReportNotificationEmail } from "./src/services/email.js";

await sendReportNotificationEmail(
  "harrod.pablo@gmail.com", // 👈 poné tu mail real
  "Pablo",
  "123",
);

console.log("Test ejecutado");
