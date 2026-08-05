import express from "express";
import { requireApiAuth } from "../../middleware/requireApiAuth.js";
import * as authController from "../../controllers/api/authController.js";
import * as productController from "../../controllers/api/productController.js";
import * as saleController from "../../controllers/api/saleController.js";
import * as customerController from "../../controllers/api/customerController.js";
import * as orderController from "../../controllers/api/orderController.js";
import * as expenseController from "../../controllers/api/expenseController.js";
import * as reportController from "../../controllers/api/reportController.js";
import * as helpController from "../../controllers/api/helpController.js";
import * as statsController from "../../controllers/api/statsController.js";
import * as chatController from "../../controllers/api/chatController.js";
import * as activityController from "../../controllers/api/activityController.js";

const router = express.Router();

// Auth (public)
router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.get("/auth/demos", authController.listDemos);
router.post("/auth/demo", authController.enterDemo);
router.get("/auth/status", authController.status);

// Auth (session)
router.post("/auth/logout", requireApiAuth, authController.logout);
router.get("/auth/me", requireApiAuth, authController.me);
router.get("/auth/profile", requireApiAuth, authController.profile);
router.patch(
  "/auth/profile/name",
  requireApiAuth,
  authController.updateProfileName
);
router.patch(
  "/auth/profile/description",
  requireApiAuth,
  authController.updateProfileDescription
);
router.patch(
  "/auth/profile/pin",
  requireApiAuth,
  authController.updateProfilePin
);

// Products
router.get("/products", requireApiAuth, productController.listProducts);
router.post("/products", requireApiAuth, productController.createProduct);
router.get("/products/low-stock", requireApiAuth, productController.lowStock);
router.get("/products/:id", requireApiAuth, productController.getProduct);
router.patch("/products/:id", requireApiAuth, productController.updateProduct);
router.post(
  "/products/:id/stock",
  requireApiAuth,
  productController.updateStock
);
router.delete("/products/:id", requireApiAuth, productController.deleteProduct);

// Sales
router.post("/sales/cash", requireApiAuth, saleController.createCashSale);
router.post("/sales/credit", requireApiAuth, saleController.createCreditSale);
router.post(
  "/sales/to-customer",
  requireApiAuth,
  saleController.sellToCustomer
);
router.get("/sales/recent", requireApiAuth, saleController.listRecentSales);
router.get("/sales/refunds", requireApiAuth, saleController.refundsReport);
router.post(
  "/sales/cancel/last",
  requireApiAuth,
  saleController.cancelLastSale
);
router.post("/sales/:id/cancel", requireApiAuth, saleController.cancelSale);

// Laybye
router.post("/laybye", requireApiAuth, saleController.createLaybye);
router.post("/laybye/pay", requireApiAuth, saleController.payLaybye);
router.post("/laybye/complete", requireApiAuth, saleController.completeLaybye);

// Customers
router.get("/customers", requireApiAuth, customerController.listCustomers);
router.post("/customers", requireApiAuth, customerController.createCustomer);
router.get("/customers/:id", requireApiAuth, customerController.getCustomer);
router.get(
  "/customers/:id/history",
  requireApiAuth,
  customerController.customerHistory
);
router.get(
  "/customers/:id/credit-history",
  requireApiAuth,
  customerController.creditHistory
);
router.post(
  "/customers/:id/credit",
  requireApiAuth,
  customerController.addCredit
);
router.post(
  "/customers/:id/payment",
  requireApiAuth,
  customerController.recordPayment
);

// Orders
router.get("/orders", requireApiAuth, orderController.listOrders);
router.post("/orders", requireApiAuth, orderController.createOrder);
router.get("/orders/:id", requireApiAuth, orderController.getOrder);
router.patch(
  "/orders/:id/status",
  requireApiAuth,
  orderController.updateOrderStatus
);

// Expenses
router.post("/expenses", requireApiAuth, expenseController.createExpense);
router.get("/expenses", requireApiAuth, expenseController.listExpenses);
router.get(
  "/expenses/breakdown",
  requireApiAuth,
  expenseController.expenseBreakdown
);

// Reports
router.get("/reports/daily", requireApiAuth, reportController.dailyReport);
router.get("/reports/weekly", requireApiAuth, reportController.weeklyReport);
router.get("/reports/monthly", requireApiAuth, reportController.monthlyReport);
router.get(
  "/reports/best-sellers",
  requireApiAuth,
  reportController.bestSellers
);
router.get("/reports/profit", requireApiAuth, reportController.profitReport);
router.get("/reports/export", requireApiAuth, reportController.exportPdf);

// Stats / analytics (dashboard)
router.get("/stats", requireApiAuth, statsController.overview);
router.get("/stats/products", requireApiAuth, statsController.products);
router.get("/stats/customers", requireApiAuth, statsController.customers);
router.get("/stats/sales", requireApiAuth, statsController.sales);
router.get("/stats/inventory", requireApiAuth, statsController.inventory);

// Chat (same commands as Telegram / WhatsApp)
router.post("/chat", requireApiAuth, chatController.sendChatMessage);
router.get("/chat/history", requireApiAuth, chatController.getChatHistory);

// Activity audit feed
router.get("/activity", requireApiAuth, activityController.listActivity);

// Help
router.get("/help", requireApiAuth, helpController.help);

export default router;
