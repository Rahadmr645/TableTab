import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Tenant from "../models/Tenant.js";
import Subscription from "../models/Subscription.js";
import User from "../models/UserModel.js";
import Order from "../models/OrderModel.js";
import PlatformOwner from "../models/PlatformOwnerModel.js";
import {
  signPlatformToken,
} from "../middlewares/platformAuthMiddleware.js";

function isEnvPlatformOwnerConfigured() {
  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL?.trim();
  const ownerPass = process.env.PLATFORM_OWNER_PASSWORD;
  return Boolean(ownerEmail && ownerPass);
}

export const getPlatformSetupStatus = async (req, res) => {
  try {
    const envOn = isEnvPlatformOwnerConfigured();
    const dbCount = envOn ? 0 : await PlatformOwner.countDocuments();
    res.status(200).json({
      canRegister: !envOn && dbCount === 0,
    });
  } catch (error) {
    res.status(500).json({ message: "setup status failed", error: error.message });
  }
};

export const platformRegister = async (req, res) => {
  try {
    if (isEnvPlatformOwnerConfigured()) {
      return res.status(403).json({
        message:
          "Registration is disabled because platform credentials are set on the server (PLATFORM_OWNER_*). Sign in with those, or remove them to use a database account.",
      });
    }

    const existing = await PlatformOwner.countDocuments();
    if (existing > 0) {
      return res.status(403).json({
        message: "A platform owner account already exists. Sign in instead.",
      });
    }

    const { email, password } = req.body || {};
    const normalized = String(email || "")
      .toLowerCase()
      .trim();
    if (!normalized || !password) {
      return res.status(400).json({ message: "email and password required" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ message: "password must be at least 8 characters" });
    }

    if (!process.env.SECTRATE_KEY) {
      return res.status(503).json({
        message: "Server authentication is not configured (missing SECTRATE_KEY).",
      });
    }

    const hash = await bcrypt.hash(String(password), 10);
    await PlatformOwner.create({ email: normalized, password: hash });

    const token = signPlatformToken({
      platformOwner: true,
      email: normalized,
    });

    res.status(201).json({
      message: "platform owner created",
      token,
      email: normalized,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ message: "that email is already registered" });
    }
    res.status(500).json({ message: "registration failed", error: error.message });
  }
};

async function verifyPlatformPassword(input, stored) {
  if (stored == null || input == null) return false;
  const s = String(stored);
  if (s.startsWith("$2a$") || s.startsWith("$2b$")) {
    return bcrypt.compare(String(input), s);
  }
  return String(input) === s;
}

export const platformLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "email and password required" });
    }

    const normalized = String(email).toLowerCase().trim();

    if (isEnvPlatformOwnerConfigured()) {
      const ownerEmail = process.env.PLATFORM_OWNER_EMAIL.toLowerCase().trim();
      const ownerPass = process.env.PLATFORM_OWNER_PASSWORD;
      if (normalized !== ownerEmail) {
        return res.status(401).json({ message: "invalid credentials" });
      }
      const ok = await verifyPlatformPassword(password, ownerPass);
      if (!ok) {
        return res.status(401).json({ message: "invalid credentials" });
      }
      try {
        const token = signPlatformToken({
          platformOwner: true,
          email: ownerEmail,
        });
        return res.status(200).json({
          message: "platform login ok",
          token,
          email: ownerEmail,
        });
      } catch {
        return res.status(503).json({
          message: "Server authentication is not configured (missing SECTRATE_KEY).",
        });
      }
    }

    const owner = await PlatformOwner.findOne({ email: normalized });
    if (!owner) {
      return res.status(401).json({ message: "invalid credentials" });
    }

    const ok = await bcrypt.compare(String(password), owner.password);
    if (!ok) {
      return res.status(401).json({ message: "invalid credentials" });
    }

    try {
      const token = signPlatformToken({
        platformOwner: true,
        email: normalized,
      });
      return res.status(200).json({
        message: "platform login ok",
        token,
        email: normalized,
      });
    } catch {
      return res.status(503).json({
        message: "Server authentication is not configured (missing SECTRATE_KEY).",
      });
    }
  } catch (error) {
    res.status(500).json({ message: "login failed", error: error.message });
  }
};

export const getPlatformDashboard = async (req, res) => {
  try {
    const rawFocus = req.query?.tenantId;
    let focusTenantOid = null;
    if (rawFocus != null && String(rawFocus).trim() !== "") {
      const tid = String(rawFocus).trim();
      if (!mongoose.Types.ObjectId.isValid(tid)) {
        return res.status(400).json({ message: "invalid tenantId" });
      }
      focusTenantOid = new mongoose.Types.ObjectId(tid);
      const exists = await Tenant.exists({ _id: focusTenantOid });
      if (!exists) {
        return res.status(404).json({ message: "tenant not found" });
      }
    }

    const globalCounts = Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ subscriptionStatus: "active" }),
      Tenant.countDocuments({ subscriptionStatus: "trial" }),
      Tenant.countDocuments({ subscriptionStatus: "expired" }),
      Order.countDocuments(),
      User.countDocuments({
        role: { $in: ["owner", "manager", "chef", "cashier"] },
      }),
      User.countDocuments({ role: "customer" }),
    ]);

    const tenantUsagePromise = focusTenantOid
      ? Promise.all([
          Order.countDocuments({ tenantId: focusTenantOid }),
          User.countDocuments({
            tenantId: focusTenantOid,
            role: { $in: ["owner", "manager", "chef", "cashier"] },
          }),
          User.countDocuments({ tenantId: focusTenantOid, role: "customer" }),
          Tenant.findById(focusTenantOid).select("businessName slug").lean(),
        ])
      : Promise.resolve(null);

    const [counts, tenantUsageRaw, tenants, subscriptions] = await Promise.all([
      globalCounts,
      tenantUsagePromise,
      Tenant.find()
        .sort({ createdAt: -1 })
        .limit(200)
        .populate({ path: "ownerId", select: "email username role" })
        .lean(),
      Subscription.find()
        .sort({ createdAt: -1 })
        .limit(100)
        .populate({
          path: "tenantId",
          select: "businessName slug subscriptionStatus plan expiresAt",
        })
        .lean(),
    ]);

    const [
      tenantCount,
      activeTenants,
      trialTenants,
      expiredTenants,
      orderCount,
      staffCount,
      customerCount,
    ] = counts;

    let tenantUsageFocus = null;
    if (tenantUsageRaw && focusTenantOid) {
      const [orderCountT, staffCountT, customerCountT, meta] = tenantUsageRaw;
      tenantUsageFocus = {
        tenantId: String(focusTenantOid),
        businessName: meta?.businessName ?? "",
        slug: meta?.slug ?? "",
        orderCount: orderCountT,
        staffCount: staffCountT,
        customerCount: customerCountT,
      };
    }

    res.status(200).json({
      summary: {
        tenantCount,
        activeTenants,
        trialTenants,
        expiredTenants,
        orderCount,
        staffCount,
        customerCount,
      },
      tenantUsageFocus,
      tenants,
      subscriptions,
    });
  } catch (error) {
    res.status(500).json({ message: "dashboard failed", error: error.message });
  }
};
