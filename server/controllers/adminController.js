import User, { STAFF_ROLES } from "../models/UserModel.js";
import Tenant from "../models/Tenant.js";
import Order from "../models/OrderModel.js";
import bcrypt from "bcryptjs";
import { getBusinessDayKey } from "../utils/orderNumbers.js";
import {
  uploadImageBuffer,
  destroyCloudinaryAsset,
  isCloudinaryConfigured,
} from "../utils/cloudinaryUpload.js";
import { signUserToken } from "../middlewares/authMiddleware.js";

const SECTRATE_KEY = process.env.SECTRATE_KEY;

/**
 * Staff JWT matches SaaS shape: { userId, tenantId, role, branchId?, email?, username? }.
 * Never trust tenant identifiers from JSON bodies — always `req.tenantId` from JWT on protected routes.
 */
function buildStaffTokenPayload(userDoc) {
  return {
    userId: String(userDoc._id),
    tenantId: String(userDoc.tenantId),
    role: userDoc.role,
    ...(userDoc.branchId
      ? { branchId: String(userDoc.branchId) }
      : {}),
    email: userDoc.email,
    username: userDoc.username,
  };
}

/** Owner/manager creates outlet staff accounts — forbidden from public deployment without auth */
export const adminCreate = async (req, res) => {
  try {
    if (!SECTRATE_KEY) {
      return res.status(503).json({ message: "Server authentication is not configured" });
    }

    const {
      email,
      username,
      password,
      role,
      profilePic,
      profilePicId,
      branchId,
      staffSinceAt: staffSinceRaw,
    } = req.body || {};

    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: "please fill all the fields" });
    }

    if (!STAFF_ROLES.includes(role) || role === "owner") {
      return res.status(400).json({
        message:
          "role must be one of manager, chef, barista, cashier (owner is created at tenant signup)",
      });
    }

    const tenantId = req.tenantId;
    if (!tenantId) return res.status(500).json({ message: "Tenant context missing" });

    const dup = await User.findOne({
      email: String(email).toLowerCase().trim(),
      tenantId,
    })
      .select("_id")
      .lean();

    if (dup) return res.status(400).json({ message: "user already exists for this restaurant" });

    let staffSinceAt = null;
    if (staffSinceRaw != null && String(staffSinceRaw).trim() !== "") {
      const parsed = new Date(staffSinceRaw);
      if (!Number.isNaN(parsed.getTime())) {
        staffSinceAt = parsed;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username,
      email: String(email).toLowerCase().trim(),
      password: hashedPassword,
      role,
      profilePic: profilePic || "",
      profilePicId: profilePicId || "",
      tenantId,
      ...(branchId ? { branchId } : {}),
      ...(staffSinceAt ? { staffSinceAt } : {}),
    });

    const token = signUserToken(buildStaffTokenPayload(newUser));

    const safe = newUser.toObject();
    delete safe.password;

    res.status(200).json({
      messasge: "staff user created successfully",
      admin: safe,
      token,
    });
  } catch (error) {
    console.error("ADMIN CREATE ERROR:", error);
    res.status(500).json({ message: `Failed to create staff user: ${error.message}` });
  }
};

export const adminLogin = async (req, res) => {
  try {
    if (!SECTRATE_KEY) {
      return res.status(503).json({ message: "Server authentication is not configured" });
    }

    const { email, password, tenantSlug } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        message: "please fill email and password",
      });
    }

    const normEmail = String(email).toLowerCase().trim();

    const candidates = await User.find({
      email: normEmail,
      role: { $in: STAFF_ROLES },
    });

    const matches = [];
    for (const u of candidates) {
      const ok = await bcrypt.compare(password, u.password);
      if (ok) matches.push(u);
    }

    if (matches.length === 0) {
      return res.status(400).json({ message: "invalid credentials" });
    }

    let user = matches[0];

    if (matches.length > 1) {
      if (!tenantSlug || !String(tenantSlug).trim()) {
        return res.status(400).json({
          code: "TENANT_REQUIRED",
          message:
            "This email is linked to multiple restaurants. Add your restaurant code (the same as your venue slug).",
        });
      }
      const t = await Tenant.findOne({ slug: String(tenantSlug).toLowerCase().trim() })
        .select("_id")
        .lean();
      if (!t) {
        return res.status(400).json({ message: "Restaurant not found" });
      }
      user = matches.find((m) => String(m.tenantId) === String(t._id));
      if (!user) {
        return res.status(400).json({ message: "invalid credentials for that restaurant" });
      }
    }

    const tenant = await Tenant.findById(user.tenantId)
      .select("slug businessName plan subscriptionStatus accountStatus")
      .lean();

    if (!tenant) {
      return res.status(400).json({ message: "Restaurant not found" });
    }

    if (tenant.accountStatus === "suspended") {
      return res.status(403).json({
        message: "This restaurant account is suspended. Contact support.",
      });
    }

    if (user.staffStatus === "suspended") {
      return res.status(403).json({
        message: "This account has been suspended. Contact your restaurant owner.",
      });
    }

    const token = signUserToken(buildStaffTokenPayload(user));

    const safe = user.toObject();
    delete safe.password;

    res.status(200).json({
      messasge: "staff login successfully",
      admin: safe,
      token,
      tenantId: user.tenantId,
      tenant: {
        _id: user.tenantId,
        slug: tenant.slug,
        name: tenant.businessName,
        plan: tenant.plan,
        subscriptionStatus: tenant.subscriptionStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to login", error: error.message });
  }
};

export const listStaff = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant ID missing" });
    }

    const staffList = await User.find({
      tenantId,
      role: { $in: STAFF_ROLES, $ne: "owner" },
    })
      .select("-password")
      .sort({ createdAt: -1 });

    const businessDay = getBusinessDayKey();
    const staffWithStats = await Promise.all(
      staffList.map(async (member) => {
        const completedToday = await Order.countDocuments({
          tenantId,
          completedBy: member._id,
          businessDay,
        });
        return {
          ...member.toObject(),
          completedToday,
        };
      })
    );

    res.status(200).json({
      message: "Staff retrieved successfully",
      staff: staffWithStats,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch staff", error: error.message });
  }
};

export const fetchAdmin = async (req, res) => {
  try {
    const id = req.params.id;

    const doc = await User.findOne({
      _id: id,
      tenantId: req.tenantId,
      role: { $in: STAFF_ROLES },
    });

    if (!doc) return res.status(404).json({ message: "User not find " });

    const safe = doc.toObject();
    delete safe.password;

    const tenant = await Tenant.findById(doc.tenantId)
      .select("businessName slug subscriptionStatus plan expiresAt")
      .lean();

    res.status(200).json({
      message: "admin fetch successfully",
      admin: safe,
      tenant: tenant
        ? { 
            businessName: tenant.businessName, 
            slug: tenant.slug,
            subscriptionStatus: tenant.subscriptionStatus,
            plan: tenant.plan,
            expiresAt: tenant.expiresAt 
          }
        : null,
    });
  } catch (error) {
    res.status(500).json({ message: "faild to fetch admin", error: error.message });
  }
};

export const updateProfilePic = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId || !req.file?.buffer) {
      return res.status(400).json({ message: "image file is required" });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        message:
          "Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET (or CLOUDE_NAME + CLOUD_API_KEY + CLOUD_API_SECRET).",
      });
    }

    const admin = await User.findOne({
      _id: userId,
      tenantId: req.tenantId,
      role: { $in: STAFF_ROLES },
    });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (admin.profilePicId) {
      await destroyCloudinaryAsset(admin.profilePicId);
    }

    const result = await uploadImageBuffer(
      req.file.buffer,
      req.file.mimetype,
      "tabletab/profiles/admin",
    );

    admin.profilePic = result.secure_url;
    admin.profilePicId = result.public_id;
    await admin.save();

    const safe = admin.toObject();
    delete safe.password;

    res.status(200).json({
      message: "Profile picture updated successfully",
      admin: safe,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to update profile picture",
      error: error.message,
    });
  }
};

export const getChefCompletedOrdersToday = async (req, res) => {
  try {
    const { chefId } = req.params;
    const tenantId = req.tenantId;
    const businessDay = getBusinessDayKey();

    const orders = await Order.find({
      tenantId,
      completedBy: chefId,
      businessDay,
    }).sort({ completedAt: -1 }).lean();

    res.status(200).json({
      message: "Completed orders retrieved successfully",
      orders,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch completed orders", error: error.message });
  }
};

export const updateStaffStatus = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { status } = req.body;
    const tenantId = req.tenantId;

    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const staffMember = await User.findOne({ _id: staffId, tenantId });
    if (!staffMember) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    if (String(staffMember._id) === String(req.user.userId)) {
      return res.status(400).json({ message: "You cannot change your own status" });
    }

    if (staffMember.role === "owner") {
      return res.status(403).json({ message: "You cannot change status of the restaurant owner" });
    }

    if (req.user.role === "manager" && (staffMember.role === "manager" || staffMember.role === "owner")) {
      return res.status(403).json({ message: "Managers cannot modify other managers or owners" });
    }

    staffMember.staffStatus = status;
    await staffMember.save();

    res.status(200).json({
      message: `Staff member is now ${status}`,
      staff: staffMember,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update staff status", error: error.message });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const tenantId = req.tenantId;

    const staffMember = await User.findOne({ _id: staffId, tenantId });
    if (!staffMember) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    if (String(staffMember._id) === String(req.user.userId)) {
      return res.status(400).json({ message: "You cannot delete yourself" });
    }

    if (staffMember.role === "owner") {
      return res.status(403).json({ message: "You cannot delete the restaurant owner" });
    }

    if (req.user.role === "manager" && (staffMember.role === "manager" || staffMember.role === "owner")) {
      return res.status(403).json({ message: "Managers cannot delete other managers or owners" });
    }

    await User.deleteOne({ _id: staffId, tenantId });

    res.status(200).json({
      message: "Staff member deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete staff member", error: error.message });
  }
};
