import express from "express";
import {
  platformLogin,
  platformRegister,
  getPlatformSetupStatus,
  getPlatformDashboard,
  patchTenantAccountStatus,
} from "../controllers/platformController.js";
import { authenticatePlatformOwner } from "../middlewares/platformAuthMiddleware.js";

const router = express.Router();

router.get("/setup-status", getPlatformSetupStatus);
router.post("/register", platformRegister);
router.post("/login", platformLogin);
router.get("/dashboard", authenticatePlatformOwner, getPlatformDashboard);
router.patch(
  "/tenants/:tenantId/account-status",
  authenticatePlatformOwner,
  patchTenantAccountStatus,
);

export default router;
