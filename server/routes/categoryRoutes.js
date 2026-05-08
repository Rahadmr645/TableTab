import express from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import { requireActiveSubscription } from "../middlewares/subscriptionMiddleware.js";
import { requireStaffAccount, requireRole } from "../middlewares/roleMiddleware.js";
import {
  resolvePublicTenant,
  resolveOptionalBranch,
  stripForbiddenTenantFields,
} from "../middlewares/tenantMiddleware.js";
import {
  listCategories,
  createCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

const router = express.Router();

const publicBrowse = [
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

/** Public menu builders — requires X-Tenant-Id */
router.get("/browse", ...publicBrowse, listCategories);

/** Authenticated staff listing (same payload shape as `/browse`) */
router.get("/", ...staffBase, listCategories);

router.post(
  "/",
  ...staffBase,
  requireRole(["owner", "manager"]),
  stripForbiddenTenantFields,
  createCategory,
);

router.delete(
  "/:id",
  ...staffBase,
  requireRole(["owner", "manager"]),
  stripForbiddenTenantFields,
  deleteCategory,
);

export default router;
