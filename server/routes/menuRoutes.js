import express from "express";

import {
  getMenu,
  addMenu,
  menuUpdate,
  deleteMenu,
} from "../controllers/menuController.js";
import {
  getPurchasedMenuIds,
  getMyVotes,
  voteMenuItem,
  addPublicComment,
  getCommentsForMenuItem,
  getMyOrderReviews,
  getPendingItemReviews,
  addOrderItemReview,
} from "../controllers/menuEngagementController.js";
import upload from "../middlewares/memoryMulter.js";
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

router.post(
  "/add-menu",
  authenticate,
  requireActiveSubscription,
  requireStaffAccount,
  requireRole(["owner", "manager"]),
  resolveOptionalBranch,
  upload.single("image"),
  stripForbiddenTenantFields,
  addMenu,
);
router.put(
  "/update/:id",
  authenticate,
  requireActiveSubscription,
  requireStaffAccount,
  requireRole(["owner", "manager"]),
  resolveOptionalBranch,
  upload.single("image"),
  stripForbiddenTenantFields,
  menuUpdate,
);
router.delete(
  "/delete/:id",
  authenticate,
  requireActiveSubscription,
  requireStaffAccount,
  requireRole(["owner", "manager"]),
  resolveOptionalBranch,
  stripForbiddenTenantFields,
  deleteMenu,
);

router.get("/purchased-dishes/:guestToken", ...publicTenant, getPurchasedMenuIds);
router.get("/my-votes/:guestToken", ...publicTenant, getMyVotes);
router.post("/vote", ...publicTenant, voteMenuItem);
router.post("/comment", ...publicTenant, addPublicComment);
router.get("/comments/:menuItemId", ...publicTenant, getCommentsForMenuItem);
router.post("/order-review", ...publicTenant, addOrderItemReview);
router.get("/my-reviews/:guestToken", ...publicTenant, getMyOrderReviews);
router.get("/review-pending/:guestToken", ...publicTenant, getPendingItemReviews);

router.get("/menuList", ...publicTenant, getMenu);

export default router;
