import express from "express";
import { registerTenant, getTenantBySlug, resolveTenantIdBySlug } from "../controllers/tenantController.js";

const router = express.Router();

router.post("/register", registerTenant);
router.get("/by-slug/:slug", getTenantBySlug);
router.get("/resolve/:slug", resolveTenantIdBySlug);

export default router;
