import mongoose from "mongoose";
import Branch from "../models/Branch.js";
import Tenant from "../models/Tenant.js";
import User, { STAFF_ROLES } from "../models/UserModel.js";

/**
 * Strip tenant identifiers from JSON bodies — tenant scope must come from JWT or trusted headers only.
 * Prevents clients from forging `tenantId` on create/update payloads.
 */
export function stripForbiddenTenantFields(req, res, next) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    delete req.body.tenantId;
    delete req.body.tenant;
    delete req.body.tenantSlug;
  }
  next();
}

function oidOrNull(raw) {
  if (!raw || !mongoose.Types.ObjectId.isValid(String(raw))) return null;
  return new mongoose.Types.ObjectId(String(raw));
}

/**
 * Public/unauthenticated flows (menu browse, guest ordering) resolve the restaurant via **X-Tenant-Id**,
 * **X-Tenant-Slug**, or matching query params. Never trust `tenantId` from JSON body for writes.
 */
export async function resolvePublicTenant(req, res, next) {
  try {
    if (req.tenantId) {
      return next();
    }

    const headerId = req.headers["x-tenant-id"];
    const headerSlug = req.headers["x-tenant-slug"];
    const qId = req.query.tenantId;
    const qSlug =
      req.query.tenantSlug || req.query.slug || req.params.tenantSlug || req.params.slug;

    let oid = oidOrNull(headerId) || oidOrNull(qId);
    if (oid) {
      req.tenantId = oid;
      return next();
    }

    const slugRaw = headerSlug || qSlug;
    if (slugRaw != null && String(slugRaw).trim() !== "") {
      const slug = String(slugRaw).toLowerCase().trim();
      const tenant = await Tenant.findOne({ slug }).select("_id").lean();
      if (!tenant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      req.tenantId = tenant._id;
      return next();
    }

    return res.status(400).json({
      message:
        "Missing tenant context. Send X-Tenant-Id, X-Tenant-Slug, or tenantId / tenantSlug / slug query param.",
    });
  } catch (e) {
    return res.status(500).json({ message: "Tenant resolution failed", error: e.message });
  }
}

/**
 * Staff OTP before login — resolve tenant from header, body slug, or unambiguous staff email.
 */
export async function resolveStaffOtpTenant(req, res, next) {
  try {
    const headerId = req.headers["x-tenant-id"];
    const { email, tenantSlug } = req.body || {};

    let oid = oidOrNull(headerId);
    if (oid) {
      req.tenantId = oid;
      return next();
    }

    if (tenantSlug != null && String(tenantSlug).trim() !== "") {
      const slug = String(tenantSlug).toLowerCase().trim();
      const tenant = await Tenant.findOne({ slug }).select("_id").lean();
      if (!tenant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      req.tenantId = tenant._id;
      return next();
    }

    if (email != null && String(email).trim() !== "") {
      const norm = String(email).toLowerCase().trim();
      const staffUsers = await User.find({
        email: norm,
        role: { $in: STAFF_ROLES },
      })
        .select("tenantId")
        .lean();

      const tenantIds = [...new Set(staffUsers.map((u) => String(u.tenantId)))];
      if (tenantIds.length === 1) {
        req.tenantId = new mongoose.Types.ObjectId(tenantIds[0]);
        return next();
      }
      if (tenantIds.length === 0) {
        return res.status(403).json({
          message:
            "This email is not registered for staff access. Your restaurant owner or manager must add your account first.",
        });
      }
      return res.status(400).json({
        code: "TENANT_REQUIRED",
        message:
          "This email is linked to multiple restaurants. Enter your restaurant code (slug) or ask your manager.",
      });
    }

    return res.status(400).json({
      message: "Provide staff email (and restaurant code if prompted), or X-Tenant-Id.",
    });
  } catch (e) {
    return res.status(500).json({ message: "Tenant resolution failed", error: e.message });
  }
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
    if (["chef", "cashier", "barista"].includes(role) && req.user?.branchId) {
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
export async function optionalPublicTenant(req, res, next) {
  try {
    const raw = req.headers["x-tenant-id"] || req.query.tenantId;
    let oid = oidOrNull(raw);
    if (oid) {
      req.tenantId = oid;
      return next();
    }
    const slugRaw = req.headers["x-tenant-slug"] || req.query.tenantSlug || req.query.slug;
    if (slugRaw != null && String(slugRaw).trim() !== "") {
      const slug = String(slugRaw).toLowerCase().trim();
      const tenant = await Tenant.findOne({ slug }).select("_id").lean();
      if (tenant) {
        req.tenantId = tenant._id;
      }
    }
    next();
  } catch (e) {
    next(e);
  }
}
