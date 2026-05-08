import mongoose from "mongoose";
import Menu from "../models/Menu.js";
import Category from "../models/Category.js";
import { invalidateMenuNameMapCache } from "../utils/resolveMenuLine.js";
import {
  uploadImageBuffer,
  destroyCloudinaryAsset,
  isCloudinaryConfigured,
} from "../utils/cloudinaryUpload.js";

/** Old DB/API typos → canonical category labels shown in admin + filters */
const LEGACY_CATEGORY_MAP = {
  "Cold Dirinks": "Cold Drinks",
  Othres: "Others",
};

function canonicalCategory(cat) {
  if (cat == null || cat === "") return cat;
  const s = String(cat).trim();
  return LEGACY_CATEGORY_MAP[s] ?? s;
}

function normalizeCategory(cat) {
  return canonicalCategory(cat);
}

function parseOptionsField(raw) {
  if (raw == null || raw === "") return undefined;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return undefined;
  }
}

function menuWriteBase(req) {
  return { tenantId: req.tenantId };
}

function menuReadFilter(req) {
  const base = { tenantId: req.tenantId };
  if (req.branchId) {
    base.$or = [{ branchId: null }, { branchId: req.branchId }];
  }
  return base;
}

async function loadCategoryLabels(tenantId) {
  const cats = await Category.find({ tenantId }).select("name").lean();
  return Object.fromEntries(cats.map((c) => [String(c._id), c.name]));
}

export const addMenu = async (req, res) => {
  try {
    const { name, price, description, category, categoryId, options } = req.body;

    if (!name || !price || !description) {
      return res.status(400).json({ message: "name, price, and description are required" });
    }

    let catOid = null;
    let legacyCat = null;

    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(String(categoryId))) {
        return res.status(400).json({ message: "Invalid categoryId" });
      }
      catOid = new mongoose.Types.ObjectId(String(categoryId));
      const cat = await Category.findOne({ _id: catOid, tenantId: req.tenantId })
        .select("_id")
        .lean();
      if (!cat) return res.status(400).json({ message: "categoryId not found for this tenant" });
    } else if (category) {
      legacyCat = normalizeCategory(category);
    } else {
      return res.status(400).json({ message: "Provide categoryId (preferred) or legacy category label" });
    }

    let imageUrl = "";
    let imagePublicId = "";
    if (req.file?.buffer) {
      if (!isCloudinaryConfigured()) {
        return res.status(503).json({
          message: "Cloudinary is not configured. Cannot upload menu image.",
        });
      }
      const r = await uploadImageBuffer(
        req.file.buffer,
        req.file.mimetype,
        "tabletab/menu_items",
      );
      imageUrl = r.secure_url;
      imagePublicId = r.public_id;
    }

    const branchField =
      req.branchId && mongoose.Types.ObjectId.isValid(String(req.branchId))
        ? req.branchId
        : null;

    const newItem = new Menu({
      ...menuWriteBase(req),
      branchId: branchField,
      name,
      price: Number(price),
      description,
      image: imageUrl || undefined,
      imagePublicId: imagePublicId || "",
      categoryId: catOid,
      category: legacyCat || "Others",
      options: parseOptionsField(options),
    });
    await newItem.save();
    invalidateMenuNameMapCache(req.tenantId, req.branchId || null);
    res.status(200).json({ message: "New item added successfully", newMenu: newItem });
  } catch (error) {
    res.status(500).json({ message: "fiald to add new item", error: error.message });
  }
};

export const getMenu = async (req, res) => {
  try {
    const filter = menuReadFilter(req);
    const menuItems = await Menu.find(filter)
      .select(
        "name price description image category categoryId branchId options soldCount likeCount dislikeCount commentCount ratingSum ratingCount",
      )
      .lean();

    const labels = await loadCategoryLabels(req.tenantId);

    const enriched = menuItems.map((o) => {
      const ratingCount = Number(o.ratingCount) || 0;
      const ratingSum = Number(o.ratingSum) || 0;
      const commentCount = Number(o.commentCount) || 0;
      const averageRating =
        ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null;
      const categoryLabel =
        (o.categoryId && labels[String(o.categoryId)]) ||
        canonicalCategory(o.category);
      return {
        ...o,
        soldCount: o.soldCount ?? 0,
        likeCount: o.likeCount ?? 0,
        dislikeCount: o.dislikeCount ?? 0,
        commentCount,
        ratingCount,
        averageRating,
        feedbackThreadCount: commentCount + ratingCount,
        categoryLabel,
        category: categoryLabel,
      };
    });

    res.status(200).json({
      mesasge: "Menu items fetched successfully",
      MenuList: enriched,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch menu items",
      error: error.message,
    });
  }
};

export const menuUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const menu = await Menu.findOne({ _id: id, ...menuWriteBase(req) });
    if (!menu) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    const b = req.body;
    if (b.name !== undefined) menu.name = b.name;
    if (b.price !== undefined) menu.price = Number(b.price);
    if (b.description !== undefined) menu.description = b.description;
    if (b.category !== undefined) menu.category = normalizeCategory(b.category);
    if (b.categoryId !== undefined && b.categoryId !== "") {
      if (!mongoose.Types.ObjectId.isValid(String(b.categoryId))) {
        return res.status(400).json({ message: "Invalid categoryId" });
      }
      const cid = new mongoose.Types.ObjectId(String(b.categoryId));
      const cat = await Category.findOne({ _id: cid, tenantId: req.tenantId }).select("_id").lean();
      if (!cat) return res.status(400).json({ message: "categoryId not found for this tenant" });
      menu.categoryId = cid;
    }
    if (b.options !== undefined) {
      const parsed = parseOptionsField(b.options);
      if (parsed !== undefined) menu.options = parsed;
    }

    if (req.file?.buffer) {
      if (!isCloudinaryConfigured()) {
        return res.status(503).json({
          message: "Cloudinary is not configured. Cannot upload image.",
        });
      }
      if (menu.imagePublicId) {
        await destroyCloudinaryAsset(menu.imagePublicId);
      }
      const r = await uploadImageBuffer(
        req.file.buffer,
        req.file.mimetype,
        "tabletab/menu_items",
      );
      menu.image = r.secure_url;
      menu.imagePublicId = r.public_id;
    }

    await menu.save();
    invalidateMenuNameMapCache(req.tenantId, req.branchId || null);

    res.status(200).json({
      message: "Menu items updated successfully",
      menu,
    });
  } catch (error) {
    res.status(500).json({
      message: "field to update your manu",
      error: error.message,
    });
  }
};

export const deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Menu.findOne({ _id: id, ...menuWriteBase(req) });

    if (!doc) {
      return res.status(400).json({ message: "Menu item not found" });
    }

    if (doc.imagePublicId) {
      await destroyCloudinaryAsset(doc.imagePublicId);
    }

    await Menu.deleteOne({ _id: id, tenantId: req.tenantId });
    invalidateMenuNameMapCache(req.tenantId, req.branchId || null);

    res.status(200).json({
      message: "menu item delete successfully",
      data: doc,
    });
  } catch (error) {
    res.status(500).json({
      message: "fiald ot delete menuitem",
      error: error.message,
    });
  }
};
