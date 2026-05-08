import mongoose from "mongoose";
import Branch from "../models/Branch.js";

/**
 * Strip tenant identifiers from JSON bodies — tenant scope must come from JWT or trusted headers only.
 * Prevents clients from forging `tenantId` on create/update payloads.
 */
export function stripForbiddenTenantFields(req, res, next) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    delete req.body.tenantId;
    delete req.body.tenant;
  }
  next();
}

/**
 * Public/unauthenticated flows (menu browse, guest ordering) resolve the restaurant via **X-Tenant-Id**
 * or `?tenantId=` on GET. Never trust `tenantId` from JSON body for writes — use `stripForbiddenTenantFields`.
 */
export function resolvePublicTenant(req, res, next) {
  const raw = req.headers["x-tenant-id"] || req.query.tenantId;
  if (!raw || !mongoose.Types.ObjectId.isValid(String(raw))) {
    return res.status(400).json({
      message:
        "Missing or invalid tenant context. Send header X-Tenant-Id (or tenantId query param on GET).",
    });
  }
  req.tenantId = new mongoose.Types.ObjectId(String(raw));
  next();
}

/**
 * Optionally narrow listing/mutations to an outlet using **X-Branch-Id** (must belong to `req.tenantId`).
 * Sets `req.branchId`, `req.branchKey` for queries (`branchKey` avoids Mongo null uniqueness pitfalls).
 */
export async function resolveOptionalBranch(req, res, next) {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(500).json({ message: "Tenant context missing" });
    }

    /** Outlet staff must stay within JWT-assigned branch — ignore spoofed branch headers */
    const role = req.user?.role;
    if (["chef", "cashier"].includes(role) && req.user?.branchId) {
      if (!mongoose.Types.ObjectId.isValid(String(req.user.branchId))) {
        return res.status(403).json({ message: "Staff branch assignment invalid" });
      }
      req.branchId = new mongoose.Types.ObjectId(String(req.user.branchId));
      req.branchKey = String(req.user.branchId);
      return next();
    }

    const raw = req.headers["x-branch-id"];
    if (!raw) {
      req.branchId = null;
      req.branchKey = "default";
      return next();
    }

    if (!mongoose.Types.ObjectId.isValid(String(raw))) {
      return res.status(400).json({ message: "Invalid X-Branch-Id" });
    }

    const bid = new mongoose.Types.ObjectId(String(raw));
    const branch = await Branch.findOne({ _id: bid, tenantId }).select("_id").lean();
    if (!branch) {
      return res.status(403).json({ message: "Branch does not belong to this tenant" });
    }

    req.branchId = bid;
    req.branchKey = String(bid);
    next();
  } catch (e) {
    res.status(500).json({ message: "Branch resolution failed", error: e.message });
  }
}

/**
 * Optional tenant hint for analytics/metadata (does not fail when absent).
 */
export function optionalPublicTenant(req, res, next) {
  const raw = req.headers["x-tenant-id"] || req.query.tenantId;
  if (raw && mongoose.Types.ObjectId.isValid(String(raw))) {
    req.tenantId = new mongoose.Types.ObjectId(String(raw));
  }
  next();
}
