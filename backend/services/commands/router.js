import Shop from "../../models/Shop.js";
import AuthService from "../AuthService.js";

import {
  handleRegister,
  handleLogin,
  handleLogout,
  handleAccount,
  handleStatus,
  handleProfileEditName,
  handleProfileEditDescription,
  handleProfileEditPin,
} from "./handlers/auth.js";

import {
  handleAddProduct,
  handleUpdateStock,
  handleLowStock,
  handleUpdatePrice,
  handleDeleteProduct,
  handleEditProduct,
  handleSetThreshold,
  handleListProducts,
} from "./handlers/inventory.js";

import {
  handleCancelSale,
  handleCashSale,
  handleCreditSale,
  handleLayBye,
  handleLayByePayment,
  handleLayByeComplete,
} from "./handlers/sales.js";

import {
  handleCustomerCommands,
  handleSellToCustomer,
  handleCustomerCredit,
  handleCustomerPayment,
  handleCreditHistory,
} from "./handlers/customers.js";

import {
  handleOrderCommands,
  handleOrderStatusUpdate,
} from "./handlers/orders.js";

import {
  handleExpenseRecording,
  handleExpenseReports,
  handleExpenseBreakdown,
} from "./handlers/expenses.js";

import {
  handleDailyTotal,
  handleWeeklyReport,
  handleMonthlyReport,
  handleBestSellingProducts,
  handleExportReport,
  handleProfitCalculation,
} from "./handlers/reports.js";

import { getHelpText } from "./handlers/help.js";

/**
 * Single entry: match Telegram text → domain handler.
 */
async function processCommand(telegramId, text) {
  const command = text.trim().toLowerCase();

  if (command.startsWith("register") || command === "register") {
    return await handleRegister(telegramId, text);
  }

  const regStatus = await AuthService.getRegistrationStatus(telegramId);
  if (regStatus && !command.startsWith("/")) {
    const result = await AuthService.processRegistrationStep(telegramId, text);
    return result.message;
  }

  const pinChangeStatus = await AuthService.getPinChangeStatus(telegramId);
  if (pinChangeStatus && !command.startsWith("/")) {
    const result = await AuthService.processPinChange(telegramId, text);
    return result.message;
  }

  if (command.startsWith("login") || command === "login") {
    return await handleLogin(telegramId, text);
  }

  if (command === "logout") {
    return await handleLogout(telegramId);
  }

  if (command === "account" || command === "profile") {
    return await handleAccount(telegramId);
  }

  if (command === "status") {
    return await handleStatus(telegramId);
  }

  if (command === "/profile" || command === "profile") {
    const result = await AuthService.getProfile(telegramId);
    return result.message;
  }

  if (
    command.startsWith("/profile edit name") ||
    command.startsWith("profile edit name")
  ) {
    return await handleProfileEditName(telegramId, text);
  }

  if (
    command.startsWith("/profile edit description") ||
    command.startsWith("profile edit description")
  ) {
    return await handleProfileEditDescription(telegramId, text);
  }

  if (command === "/profile edit pin" || command === "profile edit pin") {
    return await handleProfileEditPin(telegramId);
  }

  if (!(await AuthService.isAuthenticated(telegramId))) {
    return `*Welcome to Chart Shop!*\n\nHi there! You need to be logged in.\n\n*To get started:*\n• Register: \`register\`\n• Login: \`login\`\n\nNeed help? Type *help*`;
  }

  await AuthService.updateActivity(telegramId);

  const shop = await Shop.findOne({ telegramId, isActive: true });
  if (!shop) {
    return `*Session Error*\n\nPlease login again: \`login\``;
  }

  if (command.startsWith("sell to")) {
    return await handleSellToCustomer(shop._id, text);
  }

  if (
    command.startsWith("sell ") &&
    !command.includes("to") &&
    !command.includes("credit")
  ) {
    return await handleCashSale(shop._id, text);
  }

  if (command.startsWith("credit sale")) {
    return await handleCreditSale(shop._id, text);
  }

  if (command.startsWith("laybye pay")) {
    return await handleLayByePayment(shop._id, text);
  }

  if (command.startsWith("laybye complete")) {
    return await handleLayByeComplete(shop._id, text);
  }

  if (command.startsWith("laybye")) {
    return await handleLayBye(shop._id, text);
  }

  if (command.startsWith("add ")) {
    return await handleAddProduct(shop._id, text);
  }

  if (command === "list" || command === "products") {
    return await handleListProducts(shop._id);
  }

  if (command === "daily" || command === "total") {
    return await handleDailyTotal(shop._id);
  }

  if (command.startsWith("stock ")) {
    return await handleUpdateStock(shop._id, text);
  }

  if (command === "low stock" || command === "lowstock") {
    return await handleLowStock(shop._id);
  }

  if (command.startsWith("threshold ")) {
    return await handleSetThreshold(shop._id, text);
  }

  if (command.startsWith("price ")) {
    return await handleUpdatePrice(shop._id, text);
  }

  if (command.startsWith("delete ")) {
    return await handleDeleteProduct(shop._id, text);
  }

  if (command.startsWith("edit ")) {
    return await handleEditProduct(shop._id, text);
  }

  if (command.startsWith("weekly") || command.startsWith("week")) {
    return await handleWeeklyReport(shop._id);
  }

  if (command.startsWith("monthly") || command.startsWith("month")) {
    return await handleMonthlyReport(shop._id);
  }

  if (
    command.startsWith("best selling") ||
    command.startsWith("bestselling") ||
    command.startsWith("best")
  ) {
    return await handleBestSellingProducts(shop._id, text);
  }

  if (command.startsWith("export ") || command.startsWith("pdf ")) {
    return await handleExportReport(shop, text);
  }

  if (command.startsWith("cancel")) {
    return await handleCancelSale(shop._id, text);
  }

  if (command.startsWith("customer") || command.startsWith("customers")) {
    return await handleCustomerCommands(shop._id, text);
  }

  if (command.startsWith("credit history")) {
    return await handleCreditHistory(shop._id, text);
  }

  if (command.startsWith("credit ")) {
    return await handleCustomerCredit(shop._id, text);
  }

  if (command.startsWith("payment ")) {
    return await handleCustomerPayment(shop._id, text);
  }

  if (command.startsWith("order") || command.startsWith("orders")) {
    return await handleOrderCommands(shop._id, text);
  }

  if (
    command.startsWith("confirm order") ||
    command.startsWith("ready order") ||
    command.startsWith("complete order") ||
    command.startsWith("cancel order")
  ) {
    return await handleOrderStatusUpdate(shop._id, text);
  }

  if (
    command.startsWith("expense breakdown") ||
    command.startsWith("expenses breakdown")
  ) {
    return await handleExpenseBreakdown(shop._id, text);
  }

  if (command.startsWith("expense ") && !command.startsWith("expenses")) {
    return await handleExpenseRecording(shop._id, text);
  }

  if (command.startsWith("expenses")) {
    return await handleExpenseReports(shop._id, text);
  }

  if (command.startsWith("profit")) {
    return await handleProfitCalculation(shop._id, text);
  }

  if (command === "help") {
    return getHelpText();
  }

  return `Unknown command. Type "help" for available commands.`;
}

const commandService = { processCommand };

export default commandService;
export { processCommand };
