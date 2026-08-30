import express from "express";

import {
  activeOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  getAllOrders,
  getOrdersByUser,
  getOrdersByCustomerAccount,
  getServerClock,
  getSummaryStats,
  updateOrderStatus,
  markOrderAsPaid,
  requestCancellation,
  resolveCancellationRequest,
} from "../controllers/orderController.js";
import { requireCustomerAuth } from "../middlewares/customerAuthMiddleware.js";
import { authenticate, optionalAuthenticate } from "../middlewares/authMiddleware.js";
import { requireActiveSubscription } from "../middlewares/subscriptionMiddleware.js";
import { requireStaffAccount, requireRole } from "../middlewares/roleMiddleware.js";
import {
  resolvePublicTenant,
  resolveOptionalBranch,
  stripForbiddenTenantFields,
} from "../middlewares/tenantMiddleware.js";

const router = express.Router();

const publicTenant = [
  resolvePublicTenant,
  resolveOptionalBranch,
  stripForbiddenTenantFields,
  requireActiveSubscription,
];

const staffBase = [
  authenticate,
  requireActiveSubscription,
  requireStaffAccount,
  resolveOptionalBranch,
];

router.post("/create-order", optionalAuthenticate, ...publicTenant, createOrder);

router.get("/all-orders", ...staffBase, getAllOrders);
router.get("/summary-stats", ...staffBase, getSummaryStats);
router.put(
  "/:id",
  ...staffBase,
  requireRole(["owner", "manager", "cashier", "barista", "chef"]),
  updateOrder,
);
router.delete(
  "/delete-order/:id",
  ...staffBase,
  requireRole(["owner", "manager"]),
  deleteOrder,
);
router.put(
  "/:id/status",
  ...staffBase,
  requireRole(["owner", "manager", "chef", "barista", "cashier"]),
  updateOrderStatus,
);
router.put(
  "/:id/mark-paid",
  ...staffBase,
  requireRole(["owner", "manager", "cashier"]),
  markOrderAsPaid,
);
router.post(
  "/:id/request-cancel",
  optionalAuthenticate,
  ...publicTenant,
  requestCancellation,
);
router.post(
  "/:id/resolve-cancel-request/:requestId",
  optionalAuthenticate,
  ...publicTenant,
  resolveCancellationRequest,
);
router.get("/active-orders", optionalAuthenticate, ...publicTenant, activeOrders);
router.get("/server-clock", getServerClock);

router.get("/my-orders-for-account", requireCustomerAuth, getOrdersByCustomerAccount);

router.get("/my-orders/:guestToken", ...publicTenant, getOrdersByUser);

export default router;
