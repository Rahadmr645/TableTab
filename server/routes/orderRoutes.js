import express from "express";

import {
  activeOrders,
  createOrder,
  deleteOrder,
  getAllOrders,
  getOrdersByUser,
  getOrdersByCustomerAccount,
  getServerClock,
  getSummaryStats,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { requireCustomerAuth } from "../middlewares/customerAuthMiddleware.js";
import { authenticate } from "../middlewares/authMiddleware.js";
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

router.post("/create-order", ...publicTenant, createOrder);

router.get("/all-orders", ...staffBase, getAllOrders);
router.get("/summary-stats", ...staffBase, getSummaryStats);
router.delete(
  "/delete-order/:id",
  ...staffBase,
  requireRole(["owner", "manager"]),
  deleteOrder,
);
router.put(
  "/:id/status",
  ...staffBase,
  requireRole(["owner", "manager", "chef"]),
  updateOrderStatus,
);
router.get("/active-orders", ...staffBase, activeOrders);
router.get("/server-clock", getServerClock);

router.get("/my-orders-for-account", requireCustomerAuth, getOrdersByCustomerAccount);

router.get("/my-orders/:guestToken", ...publicTenant, getOrdersByUser);

export default router;
