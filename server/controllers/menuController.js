import Menu from "../models/Menu.js";
import MenuComment from "../models/MenuComment.js";
import OrderItemReview from "../models/OrderItemReview.js";
import { invalidateMenuNameMapCache } from "../utils/resolveMenuLine.js";
import {
  uploadImageBuffer,
  destroyCloudinaryAsset,
  isCloudinaryConfigured,
} from "../utils/cloudinaryUpload.js";

/** Form labels → legacy enum spellings in Menu schema */
const CATEGORY_ALIASES = {
  "Cold Drinks": "Cold Dirinks",
  Others: "Othres",
};

function normalizeCategory(cat) {
  if (!cat) return cat;
  return CATEGORY_ALIASES[cat] ?? cat;
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

// 01: new menu item (image → Cloudinary)
export const addMenu = async (req, res) => {
  try {
    const { name, price, description, category, options } = req.body;

    if (!name || !price || !description || !category) {
      return res.status(400).json({ message: "you must be fill all the field" });
    }

    let imageUrl = "";
    let imagePublicId = "";
    if (req.file?.buffer) {
      if (!isCloudinaryConfigured()) {
        return res.status(503).json({
          message:
            "Cloudinary is not configured. Cannot upload menu image.",
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

    const newItem = new Menu({
      name,
      price: Number(price),
      description,
      image: imageUrl || undefined,
      imagePublicId: imagePublicId || "",
      category: normalizeCategory(category),
      options: parseOptionsField(options),
    });
    await newItem.save();
    invalidateMenuNameMapCache();
    res.status(200).json({ message: "New item added successfully", newMenu: newItem });
  } catch (error) {
    res.status(500).json({ message: "fiald to add new item", error: error.message });
  }
};

// 02: all menu items list
export const getMenu = async (req, res) => {
  try {
    const menuItems = await Menu.find();
    const ids = menuItems.map((m) => m._id);

    const [commentAgg, starAgg] = await Promise.all([
      ids.length
        ? MenuComment.aggregate([
            { $match: { menuItemId: { $in: ids } } },
            { $group: { _id: "$menuItemId", n: { $sum: 1 } } },
          ])
        : [],
      ids.length
        ? OrderItemReview.aggregate([
            { $match: { menuItemId: { $in: ids } } },
            {
              $group: {
                _id: "$menuItemId",
                n: { $sum: 1 },
                sum: { $sum: "$rating" },
              },
            },
          ])
        : [],
    ]);

    const nMap = Object.fromEntries(commentAgg.map((c) => [String(c._id), c.n]));
    const starMap = Object.fromEntries(
      starAgg.map((r) => [
        String(r._id),
        { n: r.n, avg: r.n > 0 ? r.sum / r.n : 0 },
      ]),
    );

    const enriched = menuItems.map((m) => {
      const o = m.toObject();
      const idStr = String(m._id);

      o.commentCount = nMap[idStr] || 0;

      const stars = starMap[idStr];
      o.ratingCount = stars ? stars.n : 0;
      o.averageRating =
        stars && stars.n > 0 ? Math.round(stars.avg * 10) / 10 : null;

      o.feedbackThreadCount = o.commentCount + o.ratingCount;

      o.soldCount = o.soldCount ?? 0;
      o.likeCount = o.likeCount ?? 0;
      o.dislikeCount = o.dislikeCount ?? 0;
      return o;
    });

    res.status(200).json({
      mesasge: "Menu items fetched successfully",
      MenuList: enriched,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch menu items",
      error: error.messasge,
    });
  }
};

// 03: update menu item (optional new image → Cloudinary, old asset removed)
export const menuUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const menu = await Menu.findById(id);
    if (!menu) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    const b = req.body;
    if (b.name !== undefined) menu.name = b.name;
    if (b.price !== undefined) menu.price = Number(b.price);
    if (b.description !== undefined) menu.description = b.description;
    if (b.category !== undefined) menu.category = normalizeCategory(b.category);
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
    invalidateMenuNameMapCache();

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

// 04: delete menu item (+ Cloudinary image)
export const deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Menu.findById(id);

    if (!doc) {
      return res.status(400).json({ message: "Menu item not found" });
    }

    if (doc.imagePublicId) {
      await destroyCloudinaryAsset(doc.imagePublicId);
    }

    await Menu.findByIdAndDelete(id);
    invalidateMenuNameMapCache();

    res.status(200).json({
      message: "menu item delete successfully",
      data: doc,
    });
  } catch (error) {
    res.status(500).json({
      message: "fiald ot delete menuitem",
      error: error.mesasge,
    });
  }
};
