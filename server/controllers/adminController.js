import User, { STAFF_ROLES } from "../models/UserModel.js";
import Tenant from "../models/Tenant.js";
import bcrypt from "bcryptjs";
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

    const { email, username, password, role, profilePic, profilePicId, branchId } = req.body || {};

    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: "please fill all the fields" });
    }

    if (!STAFF_ROLES.includes(role) || role === "owner") {
      return res.status(400).json({
        message: "role must be one of manager, chef, cashier (owner is created at tenant signup)",
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
      branchId: branchId || null,
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
    res.status(500).json({ message: "Failed to create staff user", error: error.message });
  }
};

export const adminLogin = async (req, res) => {
  try {
    if (!SECTRATE_KEY) {
      return res.status(503).json({ message: "Server authentication is not configured" });
    }

    const { email, password, tenantSlug } = req.body || {};

    if (!email || !password || !tenantSlug) {
      return res.status(400).json({
        message: "please fill all the fields (email, password, tenantSlug)",
      });
    }

    const tenant = await Tenant.findOne({ slug: String(tenantSlug).toLowerCase().trim() })
      .select("_id subscriptionStatus")
      .lean();

    if (!tenant) return res.status(400).json({ message: "Restaurant not found" });

    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
      tenantId: tenant._id,
      role: { $in: STAFF_ROLES },
    });

    if (!user) return res.status(400).json({ message: "Staff user not found for this restaurant" });

    if (user.staffStatus === "suspended") {
      return res.status(403).json({
        message: "This account has been suspended. Contact your restaurant owner.",
      });
    }

    const comparePass = await bcrypt.compare(password, user.password);

    if (!comparePass) return res.status(400).json({ message: "invalid credentials" });

    const token = signUserToken(buildStaffTokenPayload(user));

    const safe = user.toObject();
    delete safe.password;

    res.status(200).json({
      messasge: "staff login successfully",
      admin: safe,
      token,
      tenantId: tenant._id,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to login", error: error.message });
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

    res.status(200).json({ message: "admin fetch successfully", admin: safe });
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
