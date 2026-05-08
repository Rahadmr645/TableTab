import bcrypt from "bcryptjs";
import Tenant from "../models/Tenant.js";
import User from "../models/UserModel.js";
import Branch from "../models/Branch.js";
import Category from "../models/Category.js";
import Subscription from "../models/Subscription.js";
import {
  signUserToken,
  verifyTrialEnrollmentToken,
} from "../middlewares/authMiddleware.js";
import { getStripe } from "../utils/stripeClient.js";
import { getGmailFieldError } from "../utils/gmailValidation.js";

const DEFAULT_CATEGORIES = [
  "Hot Drinks",
  "Cold Drinks",
  "Tea",
  "Arabic Coffee",
  "Desserts",
  "Snacks",
  "Cakes",
  "Others",
];

/** New-tenant trial length (matches subscription plans UI: one month). */
const TRIAL_DAYS = 30;

function baseSlugFromName(name) {
  let s = String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (s.length < 2) s = "restaurant";
  if (s.length > 40) s = s.slice(0, 40);
  return s;
}

async function uniqueSlugFromBusinessName(businessName) {
  let base = baseSlugFromName(businessName);
  let candidate = base;
  let n = 0;
  while (await Tenant.findOne({ slug: candidate }).select("_id").lean()) {
    n += 1;
    candidate = `${base.slice(0, 32)}-${n}`;
  }
  return candidate;
}

/**
 * @param {{ businessName: string, slug: string, owner: { username: string, email: string, password: string } }} params
 */
export async function createTenantCore({ businessName, slug, owner }) {
  const slugNorm = String(slug).toLowerCase().trim();
  const exists = await Tenant.findOne({ slug: slugNorm }).select("_id").lean();
  if (exists) {
    const err = new Error("That slug is already registered");
    err.code = "SLUG_TAKEN";
    throw err;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(owner.password, salt);

  const tenant = await Tenant.create({
    businessName: String(businessName).trim(),
    slug: slugNorm,
    subscriptionStatus: "trial",
    plan: "trial",
    expiresAt: new Date(Date.now() + TRIAL_DAYS * 864e5),
  });

  const ownerUser = await User.create({
    username: owner.username,
    email: String(owner.email).toLowerCase().trim(),
    password: hashedPassword,
    tenantId: tenant._id,
    role: "owner",
    branchId: null,
  });

  tenant.ownerId = ownerUser._id;
  await tenant.save();

  const branch = await Branch.create({
    tenantId: tenant._id,
    name: "Main",
    location: "",
  });

  await Category.insertMany(
    DEFAULT_CATEGORIES.map((name, i) => ({
      tenantId: tenant._id,
      branchId: null,
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      sortOrder: i,
    })),
  );

  const start = new Date();
  const end = new Date(Date.now() + TRIAL_DAYS * 864e5);
  await Subscription.create({
    tenantId: tenant._id,
    plan: "trial",
    price: 0,
    startDate: start,
    endDate: end,
    status: "trialing",
  });

  const token = signUserToken({
    userId: String(ownerUser._id),
    tenantId: String(tenant._id),
    role: "owner",
    email: ownerUser.email,
    username: ownerUser.username,
  });

  const safeUser = ownerUser.toObject();
  delete safeUser.password;

  return { tenant, branch, token, user: safeUser };
}

/**
 * Bootstrap a new restaurant tenant with owner user, default outlet, seeded categories, and trial subscription.
 * Returns a staff JWT (`userId`, `tenantId`, `role`) for immediate API access.
 */
export async function registerTenant(req, res) {
  try {
    const { businessName, slug, owner } = req.body || {};
    if (!businessName || !slug || !owner?.username || !owner?.email || !owner?.password) {
      return res.status(400).json({
        message: "businessName, slug, owner.username, owner.email, owner.password are required",
      });
    }

    const result = await createTenantCore({
      businessName,
      slug,
      owner,
    });

    res.status(201).json({
      message: "Tenant registered",
      tenant: result.tenant,
      defaultBranch: result.branch,
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    if (error.code === "SLUG_TAKEN") {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: "Tenant registration failed", error: error.message });
  }
}

/**
 * After public trial card + enrollment JWT — create tenant; email is fixed from token.
 */
export async function registerTrialEnrollment(req, res) {
  try {
    const { enrollmentToken, username, businessName, password } = req.body || {};
    if (!enrollmentToken || !username || !businessName || !password) {
      return res.status(400).json({
        message:
          "enrollmentToken, username, businessName, and password are required",
      });
    }

    let email;
    let setupIntentId;
    try {
      ({ email, setupIntentId } = verifyTrialEnrollmentToken(enrollmentToken));
    } catch {
      return res.status(401).json({
        message: "Invalid or expired enrollment link. Start again from subscription plans.",
      });
    }

    if (getGmailFieldError(email)) {
      return res.status(400).json({ message: "Invalid enrollment email" });
    }

    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ message: "Payment service not configured" });
    }

    const si = await stripe.setupIntents.retrieve(String(setupIntentId));
    if (si.status !== "succeeded") {
      return res.status(400).json({
        message: "Card setup is not complete. Complete the trial card step first.",
      });
    }
    const meta = si.metadata || {};
    if (meta.source !== "admin_public_trial") {
      return res.status(400).json({ message: "Invalid enrollment record" });
    }
    if (
      String(meta.receiptGmail || "").toLowerCase().trim() !==
      String(email).toLowerCase().trim()
    ) {
      return res.status(400).json({ message: "Enrollment email mismatch" });
    }

    const slug = await uniqueSlugFromBusinessName(businessName);

    const result = await createTenantCore({
      businessName,
      slug,
      owner: {
        username: String(username).trim(),
        email,
        password: String(password),
      },
    });

    res.status(201).json({
      message: "Account created",
      token: result.token,
      tenant: {
        _id: result.tenant._id,
        businessName: result.tenant.businessName,
        slug: result.tenant.slug,
      },
      user: result.user,
    });
  } catch (error) {
    if (error.code === "SLUG_TAKEN") {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
}

/** Public lookup used by client login screens — returns non-sensitive metadata only */
export async function getTenantBySlug(req, res) {
  try {
    const slug = String(req.params.slug || "").toLowerCase().trim();
    if (!slug) return res.status(400).json({ message: "slug required" });

    const tenant = await Tenant.findOne({ slug })
      .select("businessName slug subscriptionStatus plan")
      .lean();

    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    res.status(200).json({ tenant });
  } catch (error) {
    res.status(500).json({ message: "Lookup failed", error: error.message });
  }
}

/** Resolve Mongo id from slug — internal helper for diagnostics */
export async function resolveTenantIdBySlug(req, res) {
  try {
    const slug = String(req.params.slug || "").toLowerCase().trim();
    const t = await Tenant.findOne({ slug }).select("_id businessName").lean();
    if (!t) return res.status(404).json({ message: "Tenant not found" });
    res.status(200).json({ tenantId: t._id, businessName: t.businessName });
  } catch (error) {
    res.status(500).json({ message: "Resolve failed", error: error.message });
  }
}
