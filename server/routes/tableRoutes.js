import express from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import { requireActiveSubscription } from "../middlewares/subscriptionMiddleware.js";
import { requireStaffAccount, requireRole } from "../middlewares/roleMiddleware.js";
import {
  resolvePublicTenant,
  resolveOptionalBranch,
  stripForbiddenTenantFields,
} from "../middlewares/tenantMiddleware.js";
import { listTables, createTable, deleteTable } from "../controllers/tableController.js";

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

router.get("/browse", ...publicBrowse, listTables);

router.get("/", ...staffBase, listTables);

router.post(
  "/",
  ...staffBase,
  requireRole(["owner", "manager"]),
  stripForbiddenTenantFields,
  createTable,
);

router.delete(
  "/:id",
  ...staffBase,
  requireRole(["owner", "manager"]),
  stripForbiddenTenantFields,
  deleteTable,
);

export default router;
