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

async function customerPurchasedDish(guestToken, menuItemId, tenantId, branchHint) {
  if (!guestToken?.trim() || !menuItemId) return false;
  const mid = toObjectId(menuItemId);
  if (!mid) return false;
  const nameMap = await getMenuNameToIdMap(tenantId, branchHint);
  const orders = await Order.find({
    tenantId,
    guestToken: guestToken.trim(),
  })
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

export const getPurchasedMenuIds = async (req, res) => {
  try {
    const { guestToken } = req.params;
    if (!guestToken?.trim()) {
      return res.status(400).json({ message: "guestToken required" });
    }
    const nameMap = await getMenuNameToIdMap(req.tenantId, req.branchId || null);
    const orders = await Order.find({
      tenantId: req.tenantId,
      guestToken: guestToken.trim(),
    })
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

export const getMyVotes = async (req, res) => {
  try {
    const { guestToken } = req.params;
    if (!guestToken?.trim()) {
      return res.status(400).json({ message: "guestToken required" });
    }
    const votes = await MenuVote.find({
      tenantId: req.tenantId,
      guestToken: guestToken.trim(),
    }).lean();
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

    const menu = await Menu.findOne({ _id: mid, tenantId: req.tenantId });
    if (!menu) return res.status(404).json({ message: "Menu item not found" });

    const purchased = await customerPurchasedDish(
      guestToken,
      mid,
      req.tenantId,
      req.branchId || null,
    );
    if (!purchased) {
      return res.status(403).json({
        message: "Only customers who ordered this dish can like or unlike it",
      });
    }

    const gt = guestToken.trim();
    const existing = await MenuVote.findOne({
      tenantId: req.tenantId,
      menuItemId: mid,
      guestToken: gt,
    });

    const branchOid =
      req.branchId && mongoose.Types.ObjectId.isValid(String(req.branchId))
        ? req.branchId
        : null;

    if (!existing) {
      await MenuVote.create({
        tenantId: req.tenantId,
        branchId: branchOid,
        menuItemId: mid,
        guestToken: gt,
        vote,
      });
      await Menu.findOneAndUpdate(
        { _id: mid, tenantId: req.tenantId },
        { $inc: vote === "like" ? { likeCount: 1 } : { dislikeCount: 1 } },
      );
    } else if (existing.vote !== vote) {
      await MenuVote.updateOne({ _id: existing._id }, { vote });
      const dec = existing.vote === "like" ? { likeCount: -1 } : { dislikeCount: -1 };
      const inc = vote === "like" ? { likeCount: 1 } : { dislikeCount: 1 };
      await Menu.findOneAndUpdate({ _id: mid, tenantId: req.tenantId }, { $inc: { ...dec, ...inc } });
    }

    const updated = await Menu.findOne({ _id: mid, tenantId: req.tenantId }).lean();
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

    const menu = await Menu.findOne({ _id: mid, tenantId: req.tenantId });
    if (!menu) return res.status(404).json({ message: "Menu item not found" });

    const purchased = await customerPurchasedDish(
      guestToken,
      mid,
      req.tenantId,
      req.branchId || null,
    );
    if (!purchased) {
      return res.status(403).json({
        message: "Only customers who ordered this dish can comment on it",
      });
    }

    const branchOid =
      req.branchId && mongoose.Types.ObjectId.isValid(String(req.branchId))
        ? req.branchId
        : null;

    const doc = await MenuComment.create({
      tenantId: req.tenantId,
      branchId: branchOid,
      menuItemId: mid,
      guestToken: guestToken.trim(),
      customerName: customerName.trim(),
      text: text.trim(),
    });

    await Menu.findOneAndUpdate({ _id: mid, tenantId: req.tenantId }, { $inc: { commentCount: 1 } });

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
      MenuComment.find({ tenantId: req.tenantId, menuItemId: mid })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      OrderItemReview.find({ tenantId: req.tenantId, menuItemId: mid })
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

export const ORDER_PREP_WINDOW_SECONDS = 600;

function orderIsFinished(status) {
  const s = String(status || "").toLowerCase().replace(/\s+/g, "");
  return s === "finished" || s === "finised";
}

function prepWindowElapsed(order) {
  if (!order?.createdAt) return false;
  const t = new Date(order.createdAt).getTime();
  if (!Number.isFinite(t)) return false;
  const elapsedSec = Math.floor((Date.now() - t) / 1000);
  return elapsedSec >= ORDER_PREP_WINDOW_SECONDS;
}

function orderAllowsItemReview(order) {
  return orderIsFinished(order.status) || prepWindowElapsed(order);
}

export const getMyOrderReviews = async (req, res) => {
  try {
    const { guestToken } = req.params;
    if (!guestToken?.trim()) {
      return res.status(400).json({ message: "guestToken required" });
    }
    const list = await OrderItemReview.find({
      tenantId: req.tenantId,
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

export const getPendingItemReviews = async (req, res) => {
  try {
    const { guestToken } = req.params;
    const gt = guestToken?.trim();
    if (!gt) {
      return res.status(400).json({ message: "guestToken required" });
    }

    const orders = await Order.find({
      tenantId: req.tenantId,
      guestToken: gt,
    })
      .sort({ createdAt: -1 })
      .lean();

    const nameMap = await getMenuNameToIdMap(req.tenantId, req.branchId || null);

    const existing = await OrderItemReview.find({
      tenantId: req.tenantId,
      guestToken: gt,
    })
      .select("orderId menuItemId")
      .lean();
    const reviewed = new Set(
      existing.map((r) => `${String(r.orderId)}:${String(r.menuItemId)}`),
    );

    const pending = [];
    for (const o of orders) {
      if (!orderAllowsItemReview(o)) continue;
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

    const order = await Order.findOne({ _id: oid, tenantId: req.tenantId });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.guestToken !== guestToken.trim()) {
      return res.status(403).json({ message: "Not your order" });
    }

    if (!orderAllowsItemReview(order)) {
      return res.status(400).json({
        message:
          "You can leave a dish review once your preparation countdown finishes or after the restaurant marks your order finished.",
      });
    }

    const nameMap = await getMenuNameToIdMap(req.tenantId, order.branchId || null);
    const inOrder = order.items.some((it) => {
      const rid = resolveLineMenuId(it, nameMap);
      return rid && String(rid) === String(mid);
    });
    if (!inOrder) {
      return res.status(400).json({ message: "This item was not in that order" });
    }

    const existing = await OrderItemReview.findOne({
      tenantId: req.tenantId,
      orderId: oid,
      menuItemId: mid,
      guestToken: guestToken.trim(),
    });
    if (existing) {
      return res.status(409).json({ message: "You already reviewed this item for this order" });
    }

    const branchOid = order.branchId || null;

    const review = await OrderItemReview.create({
      tenantId: req.tenantId,
      branchId: branchOid,
      menuItemId: mid,
      orderId: oid,
      guestToken: guestToken.trim(),
      customerName: (customerName || order.customerName || "").trim().slice(0, 80),
      rating: r,
      comment: (comment || "").trim().slice(0, 800),
    });

    await Menu.findOneAndUpdate(
      { _id: mid, tenantId: req.tenantId },
      { $inc: { ratingSum: r, ratingCount: 1 } },
    );

    const menu = await Menu.findOne({ _id: mid, tenantId: req.tenantId }).lean();
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
