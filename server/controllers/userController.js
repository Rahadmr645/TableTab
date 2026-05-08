import User from "../models/UserModel.js";
import Tenant from "../models/Tenant.js";
import bcrypt from "bcryptjs";
import {
  uploadImageBuffer,
  destroyCloudinaryAsset,
  isCloudinaryConfigured,
} from "../utils/cloudinaryUpload.js";
import { signUserToken } from "../middlewares/authMiddleware.js";

const SECTRATE_KEY = process.env.SECTRATE_KEY;

/** Keep cart payloads bounded and strip invalid lines */
function sanitizeSavedCart(body) {
  const cartIn = Array.isArray(body?.cart) ? body.cart : [];
  const cart = cartIn
    .slice(0, 200)
    .filter(
      (i) =>
        i &&
        typeof i === "object" &&
        i._id != null &&
        typeof i.quantity === "number" &&
        i.quantity > 0 &&
        i.quantity <= 999 &&
        typeof i.price === "number" &&
        Number.isFinite(i.price),
    );

  let quantities =
    body?.quantities &&
    typeof body.quantities === "object" &&
    !Array.isArray(body.quantities)
      ? { ...body.quantities }
      : {};
  for (const item of cart) {
    quantities[String(item._id)] = item.quantity;
  }
  return { cart, quantities };
}

function omitSavedCart(userObj) {
  if (!userObj || typeof userObj !== "object") return userObj;
  const { savedCart: _s, password: _p, ...rest } = userObj;
  return rest;
}

function jwtUnavailable(res) {
  return res.status(503).json({
    message: "Server authentication is not configured (missing SECTRATE_KEY).",
  });
}

function customerTokenPayload(userDoc) {
  return {
    userId: String(userDoc._id),
    tenantId: String(userDoc.tenantId),
    role: "customer",
    email: userDoc.email,
    username: userDoc.username,
  };
}

/** Current customer from JWT — `requireCustomerAuth` must run first. */
export const getMe = async (req, res) => {
  try {
    if (!SECTRATE_KEY) return jwtUnavailable(res);

    const user = await User.findOne({
      _id: req.customerId,
      tenantId: req.tenantId,
      role: "customer",
    })
      .select("-password -savedCart")
      .lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Failed to load profile", error: error.message });
  }
};

export const userCreate = async (req, res) => {
  try {
    if (!SECTRATE_KEY) return jwtUnavailable(res);

    const { username, email, password, profilePic, tenantSlug } = req.body || {};

    if (!username || !email || !password || !tenantSlug) {
      return res.status(400).json({
        message: "please fill username, email, password, tenantSlug",
      });
    }

    const tenant = await Tenant.findOne({
      slug: String(tenantSlug).toLowerCase().trim(),
    })
      .select("_id")
      .lean();

    if (!tenant) return res.status(404).json({ message: "Restaurant not found" });

    const isExist = await User.findOne({
      email: String(email).toLowerCase().trim(),
      tenantId: tenant._id,
    })
      .select("_id")
      .lean();

    if (isExist) return res.status(400).json({ message: "User already exists for this venue" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username,
      email: String(email).toLowerCase().trim(),
      password: hashedPassword,
      profilePic,
      tenantId: tenant._id,
      role: "customer",
    });

    const token = signUserToken(customerTokenPayload(newUser));

    const userObj = omitSavedCart(newUser.toObject());

    res.status(200).json({
      messasge: "user create susccessfully",
      user: userObj,
      token,
      tenantId: tenant._id,
    });
  } catch (error) {
    res.status(500).json({ message: "Faild to create user", error: error.message });
  }
};

export const userLogin = async (req, res) => {
  try {
    if (!SECTRATE_KEY) return jwtUnavailable(res);

    const { email, password, tenantSlug } = req.body || {};

    if (!email || !password || !tenantSlug) {
      return res.status(400).json({
        message: "please fill email, password, tenantSlug",
      });
    }

    const tenant = await Tenant.findOne({
      slug: String(tenantSlug).toLowerCase().trim(),
    })
      .select("_id")
      .lean();

    if (!tenant) return res.status(404).json({ message: "Restaurant not found" });

    const isExist = await User.findOne({
      email: String(email).toLowerCase().trim(),
      tenantId: tenant._id,
      role: "customer",
    });

    if (!isExist) {
      return res.status(400).json({ message: "User not exist for this venue" });
    }

    const comparePass = await bcrypt.compare(password, isExist.password);

    if (!comparePass) {
      return res.status(400).json({ message: "invalid credentials" });
    }

    const token = signUserToken(customerTokenPayload(isExist));

    const userObj = omitSavedCart(isExist.toObject());

    res.status(200).json({
      messasge: "user Login susccessfully",
      user: userObj,
      token,
      tenantId: tenant._id,
    });
  } catch (error) {
    res.status(500).json({ message: "Faild to Login user", error: error.message });
  }
};

export const updateProfilePic = async (req, res) => {
  try {
    const userId = req.customerId;
    if (!req.file?.buffer) {
      return res.status(400).json({ message: "Image file is required" });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        message:
          "Cloudinary is not configured. Set CLOUDINARY_URL or cloud name + API key + secret.",
      });
    }

    const user = await User.findOne({
      _id: userId,
      tenantId: req.tenantId,
      role: "customer",
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.profilePicId) {
      await destroyCloudinaryAsset(user.profilePicId);
    }

    const result = await uploadImageBuffer(
      req.file.buffer,
      req.file.mimetype,
      "tabletab/profiles/customers",
    );

    user.profilePic = result.secure_url;
    user.profilePicId = result.public_id;
    await user.save();

    const safe = omitSavedCart(user.toObject());

    res.status(200).json({ message: "Image updated successfully", user: safe });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to update profile picture",
      error: error.message,
    });
  }
};

export const getCustomerCart = async (req, res) => {
  try {
    if (!SECTRATE_KEY) return jwtUnavailable(res);
    const user = await User.findOne({
      _id: req.customerId,
      tenantId: req.tenantId,
      role: "customer",
    })
      .select("savedCart")
      .lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const raw = user.savedCart;
    const payload = sanitizeSavedCart({
      cart: Array.isArray(raw?.cart) ? raw.cart : [],
      quantities:
        raw?.quantities &&
        typeof raw.quantities === "object" &&
        !Array.isArray(raw.quantities)
          ? raw.quantities
          : {},
    });
    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load cart",
      error: error.message,
    });
  }
};

export const putCustomerCart = async (req, res) => {
  try {
    if (!SECTRATE_KEY) return jwtUnavailable(res);
    const payload = sanitizeSavedCart(req.body);
    await User.findOneAndUpdate(
      { _id: req.customerId, tenantId: req.tenantId, role: "customer" },
      { $set: { savedCart: payload } },
    );
    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({
      message: "Failed to save cart",
      error: error.message,
    });
  }
};
