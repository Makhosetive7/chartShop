import AuthService from "../AuthService.js";
import { resolveChannelIdentity } from "../../utils/channelIdentity.js";

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
 * Single entry: match chat/web text → domain handler.
 * @param {string} actorId - telegram chat id, wa:<phone>, or web session key
 * @param {string} text
 * @param {string} [channelHint] - "telegram" | "whatsapp" | "web"
 */
async function processCommand(actorId, text, channelHint) {
  const { channel, channelKey } = resolveChannelIdentity(actorId, channelHint);
  const ctx = { channel, channelKey };
  const command = text.trim().toLowerCase();

  if (command === "help") {
    return getHelpText();
  }

  if (command.startsWith("register") || command === "register") {
    return await handleRegister(ctx, text);
  }

  const regStatus = await AuthService.getRegistrationStatus(channel, channelKey);
  if (regStatus && !command.startsWith("/")) {
    const result = await AuthService.processRegistrationStep(
      channel,
      channelKey,
      text
    );
    return result.message;
  }

  const pinChangeStatus = await AuthService.getPinChangeStatus(
    channel,
    channelKey
  );
  if (pinChangeStatus && !command.startsWith("/")) {
    const result = await AuthService.processPinChange(channel, channelKey, text);
    return result.message;
  }

  if (command.startsWith("login") || command === "login") {
    return await handleLogin(ctx, text);
  }

  // Bare PIN while a linked chat is waiting after "login" prompt
  if (
    /^\d{4}$/.test(command) &&
    !(await AuthService.isAuthenticated(channel, channelKey))
  ) {
    return await handleLogin(ctx, text);
  }

  if (command === "logout") {
    return await handleLogout(ctx);
  }

  if (command === "account" || command === "profile") {
    return await handleAccount(ctx);
  }

  if (command === "status") {
    return await handleStatus(ctx);
  }

  if (command === "/profile") {
    const result = await AuthService.getProfile(channel, channelKey);
    return result.message;
  }

  if (
    command.startsWith("/profile edit name") ||
    command.startsWith("profile edit name")
  ) {
    return await handleProfileEditName(ctx, text);
  }

  if (
    command.startsWith("/profile edit description") ||
    command.startsWith("profile edit description")
  ) {
    return await handleProfileEditDescription(ctx, text);
  }

  if (command === "/profile edit pin" || command === "profile edit pin") {
    return await handleProfileEditPin(ctx);
  }

  if (!(await AuthService.isAuthenticated(channel, channelKey))) {
    return (
      `*Welcome to Chart Shop!*\n\n` +
      `Hi there! You need to be logged in.\n\n` +
      `*To get started:*\n` +
      `• Register: \`register\`\n` +
      `• Login: \`login your_username 1234\`\n\n` +
      `Same username + PIN work on web, Telegram, and WhatsApp.\n\n` +
      `Need help? Type *help*`
    );
  }

  await AuthService.updateActivity(channel, channelKey);

  const shop = await AuthService.getAuthenticatedShop(channel, channelKey);
  if (!shop || shop.isActive === false) {
    return `*Session Error*\n\nPlease login again: \`login your_username 1234\``;
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

  return `Unknown command. Type "help" for available commands.`;
}

const commandService = { processCommand };

export default commandService;
export { processCommand };
