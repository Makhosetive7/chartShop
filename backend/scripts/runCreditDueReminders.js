import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/database.js";
import { runCreditDueReminders } from "../services/CreditDueReminderService.js";

dotenv.config();

await connectDB();

try {
  const result = await runCreditDueReminders();
  console.log("[credit-due] finished", result);
} catch (error) {
  console.error("[credit-due] failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
