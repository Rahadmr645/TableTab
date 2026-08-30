import express from "express";
import {
  updateProfilePic,
  adminCreate,
  adminLogin,
  fetchAdmin,
  listStaff,
  getChefCompletedOrdersToday,
  updateStaffStatus,
  deleteStaff,
  updateStripeSettings,
  updateTaxSettings,
  updatePosPin,
} from "../controllers/adminController.js";
import uploadAdmin from "../middlewares/memoryMulter.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { requireActiveSubscription } from "../middlewares/subscriptionMiddleware.js";
import { requireStaffAccount, requireRole } from "../middlewares/roleMiddleware.js";
import { stripForbiddenTenantFields } from "../middlewares/tenantMiddleware.js";

const router = express.Router();

router.post("/login", adminLogin);

router.post(
  "/create",
  authenticate,
  requireActiveSubscription,
  requireStaffAccount,
  requireRole(["owner"]),
  stripForbiddenTenantFields,
  adminCreate,
);

router.get(
  "/staff",
  authenticate,
  requireActiveSubscription,
  requireStaffAccount,
  requireRole(["owner", "manager"]),
  listStaff,
);

router.put(
  "/staff/:staffId/status",
  authenticate,
  requireActiveSubscription,
  requireStaffAccount,
  requireRole(["owner", "manager"]),
  updateStaffStatus,
);

router.delete(
  "/staff/:staffId",
  authenticate,
  requireActiveSubscription,
  requireStaffAccount,
  requireRole(["owner", "manager"]),
  deleteStaff,
);

router.get(
  "/staff/:chefId/completed-today",
  authenticate,
  requireActiveSubscription,
  requireStaffAccount,
  requireRole(["owner", "manager"]),
  getChefCompletedOrdersToday,
);

router.get(
  "/fetchAdmin/:id",
  authenticate,
  requireStaffAccount,
  fetchAdmin,
);

router.put(
  "/profile-pic",
  authenticate,
  requireActiveSubscription,
  requireStaffAccount,
  uploadAdmin.single("image"),
  updateProfilePic,
);

router.put(
  "/stripe-settings",
  authenticate,
  requireActiveSubscription,
  requireStaffAccount,
  requireRole(["owner"]),
  updateStripeSettings,
);

router.put(
  "/tax-settings",
  authenticate,
  requireActiveSubscription,
  requireStaffAccount,
  requireRole(["owner"]),
  updateTaxSettings,
);

router.put(
  "/venue-settings",
  authenticate,
  requireActiveSubscription,
  requireStaffAccount,
  requireRole(["owner"]),
  updateTaxSettings,
);

router.put(
  "/pos-pin",
  authenticate,
  requireStaffAccount,
  updatePosPin,
);

export default router;
