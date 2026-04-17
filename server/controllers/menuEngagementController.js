import mongoose from "mongoose";
import Menu from "../models/Menu.js";
import MenuVote from "../models/MenuVote.js";
import MenuComment from "../models/MenuComment.js";
import OrderItemReview from "../models/OrderItemReview.js";
import Order from "../models/OrderModel.js";
import { getMenuNameToIdMap, resolveLineMenuId } from "../utils/resolveMenuLine.js";

function toObjectId(id) {
  if (!id) return null;
  try {
    const s = String(id);
    return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : null;
  } catch {
    return null;
  }
}

/** True if this guest has ordered this dish (by id or resolved menu name on line items). */
async function customerPurchasedDish(guestToken, menuItemId) {
  if (!guestToken?.trim() || !menuItemId) return false;
  const mid = toObjectId(menuItemId);
  if (!mid) return false;
  const nameMap = await getMenuNameToIdMap();
  const orders = await Order.find({ guestToken: guestToken.trim() })
    .select("items")
    .lean();
  for (const o of orders) {
    for (const it of o.items || []) {
      const rid = resolveLineMenuId(it, nameMap);
      if (rid && String(rid) === String(mid)) return true;
    }
  }
  return false;
}

/** GET which menu items this guest has ordered (for client UI) */
export const getPurchasedMenuIds = async (req, res) => {
  try {
    const { guestToken } = req.params;
    if (!guestToken?.trim()) {
      return res.status(400).json({ message: "guestToken required" });
    }
    const nameMap = await getMenuNameToIdMap();
    const orders = await Order.find({ guestToken: guestToken.trim() })
      .select("items")
      .lean();
    const ids = new Set();
    for (const o of orders) {
      for (const it of o.items || []) {
        const rid = resolveLineMenuId(it, nameMap);
        if (rid) ids.add(String(rid));
      }
    }
    res.status(200).json({ menuItemIds: [...ids] });
  } catch (error) {
    res.status(500).json({ message: "Failed to load purchases", error: error.message });
  }
};

/** GET votes for menu items for one guest session */
export const getMyVotes = async (req, res) => {
  try {
    const { guestToken } = req.params;
    if (!guestToken?.trim()) {
      return res.status(400).json({ message: "guestToken required" });
    }
    const votes = await MenuVote.find({ guestToken: guestToken.trim() }).lean();
    const map = {};
    votes.forEach((v) => {
      map[String(v.menuItemId)] = v.vote;
    });
    res.status(200).json({ votes: map });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch votes", error: error.message });
  }
};

export const voteMenuItem = async (req, res) => {
  try {
    const { menuItemId, guestToken, vote } = req.body;
    if (!menuItemId || !guestToken?.trim()) {
      return res.status(400).json({ message: "menuItemId and guestToken are required" });
    }
    if (vote !== "like" && vote !== "dislike") {
      return res.status(400).json({ message: "vote must be like or dislike" });
    }

    const mid = toObjectId(menuItemId);
    if (!mid) return res.status(400).json({ message: "Invalid menuItemId" });

    const menu = await Menu.findById(mid);
    if (!menu) return res.status(404).json({ message: "Menu item not found" });

    const purchased = await customerPurchasedDish(guestToken, mid);
    if (!purchased) {
      return res.status(403).json({
        message: "Only customers who ordered this dish can like or unlike it",
      });
    }

    const gt = guestToken.trim();
    const existing = await MenuVote.findOne({ menuItemId: mid, guestToken: gt });

    if (!existing) {
      await MenuVote.create({ menuItemId: mid, guestToken: gt, vote });
      await Menu.findByIdAndUpdate(mid, {
        $inc: vote === "like" ? { likeCount: 1 } : { dislikeCount: 1 },
      });
    } else if (existing.vote !== vote) {
      await MenuVote.updateOne({ _id: existing._id }, { vote });
      const dec = existing.vote === "like" ? { likeCount: -1 } : { dislikeCount: -1 };
      const inc = vote === "like" ? { likeCount: 1 } : { dislikeCount: 1 };
      await Menu.findByIdAndUpdate(mid, { $inc: { ...dec, ...inc } });
    }

    const updated = await Menu.findById(mid).lean();
    res.status(200).json({
      message: "Vote saved",
      vote,
      likeCount: updated.likeCount,
      dislikeCount: updated.dislikeCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Vote failed", error: error.message });
  }
};

export const addPublicComment = async (req, res) => {
  try {
    const { menuItemId, guestToken, customerName, text } = req.body;
    if (!menuItemId || !guestToken?.trim() || !customerName?.trim() || !text?.trim()) {
      return res.status(400).json({
        message: "menuItemId, guestToken, customerName, text required",
      });
    }

    const mid = toObjectId(menuItemId);
    if (!mid) return res.status(400).json({ message: "Invalid menuItemId" });

    const menu = await Menu.findById(mid);
    if (!menu) return res.status(404).json({ message: "Menu item not found" });

    const purchased = await customerPurchasedDish(guestToken, mid);
    if (!purchased) {
      return res.status(403).json({
        message: "Only customers who ordered this dish can comment on it",
      });
    }

    const doc = await MenuComment.create({
      menuItemId: mid,
      guestToken: guestToken.trim(),
      customerName: customerName.trim(),
      text: text.trim(),
    });

    res.status(201).json({
      message: "Comment added",
      comment: doc,
    });
  } catch (error) {
    res.status(500).json({ message: "Comment failed", error: error.message });
  }
};

export const getCommentsForMenuItem = async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 12, 50);
    const mid = toObjectId(menuItemId);
    if (!mid) return res.status(400).json({ message: "Invalid menuItemId" });

    const [publicComments, orderReviews] = await Promise.all([
      MenuComment.find({ menuItemId: mid })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      OrderItemReview.find({ menuItemId: mid })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
    ]);

    const merged = [
      ...orderReviews.map((r) => ({
        kind: "review",
        _id: r._id,
        customerName: r.customerName || "Guest",
        text: r.comment || "",
        rating: r.rating,
        createdAt: r.createdAt,
      })),
      ...publicComments.map((c) => ({
        kind: "comment",
        _id: c._id,
        customerName: c.customerName,
        text: c.text,
        createdAt: c.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    res.status(200).json({ comments: merged });
  } catch (error) {
    res.status(500).json({ message: "Failed to load comments", error: error.message });
  }
};

function orderIsFinished(status) {
  const s = String(status || "").toLowerCase().replace(/\s+/g, "");
  return s === "finished" || s === "finised";
}

export const getMyOrderReviews = async (req, res) => {
  try {
    const { guestToken } = req.params;
    if (!guestToken?.trim()) {
      return res.status(400).json({ message: "guestToken required" });
    }
    const list = await OrderItemReview.find({
      guestToken: guestToken.trim(),
    })
      .select("orderId menuItemId")
      .lean();
    res.status(200).json({
      pairs: list.map((r) => ({
        orderId: String(r.orderId),
        menuItemId: String(r.menuItemId),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load reviews", error: error.message });
  }
};

/**
 * Finished orders where the guest bought a dish but has not submitted a star review yet.
 * Used on the menu so buyers can review a particular item.
 */
export const getPendingItemReviews = async (req, res) => {
  try {
    const { guestToken } = req.params;
    const gt = guestToken?.trim();
    if (!gt) {
      return res.status(400).json({ message: "guestToken required" });
    }

    const orders = await Order.find({ guestToken: gt })
      .sort({ createdAt: -1 })
      .lean();

    const nameMap = await getMenuNameToIdMap();

    const existing = await OrderItemReview.find({ guestToken: gt })
      .select("orderId menuItemId")
      .lean();
    const reviewed = new Set(
      existing.map((r) => `${String(r.orderId)}:${String(r.menuItemId)}`),
    );

    const pending = [];
    for (const o of orders) {
      if (!orderIsFinished(o.status)) continue;
      const oid = String(o._id);
      for (const it of o.items || []) {
        const resolved = resolveLineMenuId(it, nameMap);
        if (!resolved) continue;
        const mid = String(resolved);
        const key = `${oid}:${mid}`;
        if (!reviewed.has(key)) {
          pending.push({
            orderId: oid,
            menuItemId: mid,
            createdAt: o.createdAt,
            itemName: (it.name || "").slice(0, 80),
          });
        }
      }
    }

    res.status(200).json({ pending });
  } catch (error) {
    res.status(500).json({ message: "Failed to load pending reviews", error: error.message });
  }
};

export const addOrderItemReview = async (req, res) => {
  try {
    const { menuItemId, orderId, guestToken, rating, comment, customerName } = req.body;
    if (!menuItemId || !orderId || !guestToken?.trim()) {
      return res.status(400).json({ message: "menuItemId, orderId, guestToken required" });
    }
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      return res.status(400).json({ message: "rating must be 1–5" });
    }

    const mid = toObjectId(menuItemId);
    const oid = toObjectId(orderId);
    if (!mid || !oid) return res.status(400).json({ message: "Invalid ids" });

    const order = await Order.findById(oid);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.guestToken !== guestToken.trim()) {
      return res.status(403).json({ message: "Not your order" });
    }

    if (!orderIsFinished(order.status)) {
      return res.status(400).json({ message: "You can review after the order is finished" });
    }

    const nameMap = await getMenuNameToIdMap();
    const inOrder = order.items.some((it) => {
      const rid = resolveLineMenuId(it, nameMap);
      return rid && String(rid) === String(mid);
    });
    if (!inOrder) {
      return res.status(400).json({ message: "This item was not in that order" });
    }

    const existing = await OrderItemReview.findOne({
      orderId: oid,
      menuItemId: mid,
      guestToken: guestToken.trim(),
    });
    if (existing) {
      return res.status(409).json({ message: "You already reviewed this item for this order" });
    }

    const review = await OrderItemReview.create({
      menuItemId: mid,
      orderId: oid,
      guestToken: guestToken.trim(),
      customerName: (customerName || order.customerName || "").trim().slice(0, 80),
      rating: r,
      comment: (comment || "").trim().slice(0, 800),
    });

    await Menu.findByIdAndUpdate(mid, {
      $inc: { ratingSum: r, ratingCount: 1 },
    });

    const menu = await Menu.findById(mid).lean();
    res.status(201).json({
      message: "Review saved",
      review,
      averageRating:
        menu.ratingCount > 0 ? Math.round((menu.ratingSum / menu.ratingCount) * 10) / 10 : null,
      ratingCount: menu.ratingCount,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Already reviewed" });
    }
    res.status(500).json({ message: "Review failed", error: error.message });
  }
};
