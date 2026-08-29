import Order from "../models/OrderModel.js";
import Menu from "../models/Menu.js";
import MenuVote from "../models/MenuVote.js";
import MenuComment from "../models/MenuComment.js";
import OrderItemReview from "../models/OrderItemReview.js";
import mongoose from "mongoose";

import { getIo } from "../socket/socket.js";
import { clearMenuCache } from "../utils/cache.js";
import { getTenantStripe } from "../utils/stripeClient.js";

import crypto from "crypto";
import { getMenuNameToIdMap, resolveLineMenuId } from "../utils/resolveMenuLine.js";
import { takeNextOrderNumbers } from "../utils/orderNumbers.js";

function tenantMatch(tenantId) {
  return { tenantId };
}

/**
 * Adds `engagement` to each order (admin history). All lookups are tenant-scoped.
 */
async function attachEngagementToOrders(orders, tenantId, branchHint = null) {
  if (!orders?.length) return;
  const nameMap = await getMenuNameToIdMap(tenantId, branchHint);
  const orderIds = orders.map((o) => o._id);

  const tid =
    tenantId instanceof mongoose.Types.ObjectId
      ? tenantId
      : new mongoose.Types.ObjectId(String(tenantId));

  const allReviews = await OrderItemReview.find({
    tenantId: tid,
    orderId: { $in: orderIds },
  }).lean();
  const reviewByOrderItem = {};
  for (const r of allReviews) {
    const k = `${String(r.orderId)}:${String(r.menuItemId)}`;
    reviewByOrderItem[k] = r;
  }

  const pairKeys = new Set();
  const pairList = [];
  const menuIdSet = new Set();
  for (const o of orders) {
    const gt = (o.guestToken || "").trim();
    for (const it of o.items || []) {
      const mid = resolveLineMenuId(it, nameMap);
      if (!mid) continue;
      const mStr = String(mid);
      menuIdSet.add(mStr);
      if (gt) {
        const pk = `${gt}::${mStr}`;
        if (!pairKeys.has(pk)) {
          pairKeys.add(pk);
          pairList.push({ guestToken: gt, menuItemId: mid });
        }
      }
    }
  }

  const menuOidList = [...menuIdSet]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const [menus, votes, comments] = await Promise.all([
    menuOidList.length
      ? Menu.find({ tenantId: tid, _id: { $in: menuOidList } })
          .select("name likeCount dislikeCount ratingSum ratingCount")
          .lean()
      : [],
    pairList.length
      ? MenuVote.find({
          tenantId: tid,
          $or: pairList.map((p) => ({
            guestToken: p.guestToken,
            menuItemId: p.menuItemId,
          })),
        }).lean()
      : [],
    pairList.length
      ? MenuComment.find({
          tenantId: tid,
          $or: pairList.map((p) => ({
            guestToken: p.guestToken,
            menuItemId: p.menuItemId,
          })),
        })
          .sort({ createdAt: -1 })
          .lean()
      : [],
  ]);

  const menuById = Object.fromEntries(menus.map((m) => [String(m._id), m]));

  const voteMap = {};
  for (const v of votes) {
    voteMap[`${v.guestToken}:${String(v.menuItemId)}`] = v.vote;
  }

  const commentMap = {};
  for (const c of comments) {
    const k = `${c.guestToken}:${String(c.menuItemId)}`;
    if (!commentMap[k]) commentMap[k] = c;
  }

  for (const o of orders) {
    const gt = (o.guestToken || "").trim();
    const lines = [];
    let hasFeedback = false;

    for (const it of o.items || []) {
      const mid = resolveLineMenuId(it, nameMap);
      if (!mid) continue;
      const mStr = String(mid);
      const menu = menuById[mStr] || {};
      const rc = menu.ratingCount || 0;
      const avg =
        rc > 0 && menu.ratingSum != null
          ? Math.round((menu.ratingSum / rc) * 10) / 10
          : null;

      const vk = gt ? `${gt}:${mStr}` : "";
      const customerVote = vk ? voteMap[vk] || null : null;

      const rk = `${String(o._id)}:${mStr}`;
      const rev = reviewByOrderItem[rk];

      const ck = gt ? `${gt}:${mStr}` : "";
      const note = ck ? commentMap[ck] : null;

      const dishName = (it.name || menu.name || "Item").slice(0, 120);

      const line = {
        dishName,
        menuItemId: mStr,
        menuLikes: menu.likeCount ?? 0,
        menuDislikes: menu.dislikeCount ?? 0,
        avgRating: avg,
        customerVote,
        review: rev
          ? {
              customerName: rev.customerName || "Guest",
              rating: rev.rating,
              comment: (rev.comment || "").trim(),
              createdAt: rev.createdAt,
            }
          : null,
        guestNote: note
          ? {
              customerName: note.customerName,
              text: (note.text || "").slice(0, 220),
              createdAt: note.createdAt,
            }
          : null,
      };

      const lineHas =
        customerVote ||
        line.review ||
        line.guestNote ||
        (line.menuLikes || 0) > 0 ||
        (line.menuDislikes || 0) > 0 ||
        rc > 0;

      if (lineHas) hasFeedback = true;
      lines.push(line);
    }

    o.engagement = { hasFeedback, items: lines };
  }
}

async function normalizeOrderItems(raw, tenantId, branchHint) {
  if (!Array.isArray(raw)) return [];
  const nameMap = await getMenuNameToIdMap(tenantId, branchHint);
  return raw.map((i) => {
    const id = i._id || i.menuItemId;
    let menuItemId = null;
    if (id && mongoose.Types.ObjectId.isValid(String(id))) {
      menuItemId = new mongoose.Types.ObjectId(String(id));
    } else {
      const resolved = resolveLineMenuId({ name: i.name, menuItemId: null }, nameMap);
      if (resolved) {
        menuItemId = new mongoose.Types.ObjectId(String(resolved));
      }
    }
    return {
      menuItemId,
      name: i.name,
      price: Number(i.price),
      quantity: Math.max(1, Number(i.quantity) || 1),
    };
  });
}

export const createOrder = async (req, res) => {
  try {
    const io = getIo();
    const { customerName, totalPrice, tableId, userID, guestToken, paymentMethod, paymentIntentId, cashAmount, cardAmount } = req.body;

    let items = req.body.items;

    if (typeof items === "string") {
      items = JSON.parse(items);
    }

    const branchKey = req.branchKey || "default";
    const branchOid =
      req.branchId && mongoose.Types.ObjectId.isValid(String(req.branchId))
        ? req.branchId
        : null;

    items = await normalizeOrderItems(items, req.tenantId, branchOid);

    const trimmedGuest = typeof guestToken === "string" ? guestToken.trim() : "";
    let finalGuestToken = trimmedGuest;
    if (!finalGuestToken || finalGuestToken === "null" || finalGuestToken === "undefined") {
      finalGuestToken = crypto.randomBytes(10).toString("hex");
    }

    // Verify payment if card is selected
    let resolvedPaymentStatus = "unpaid";
    const finalPaymentMethod = paymentMethod === "split" ? "split" : (paymentMethod === "cash" ? "cash" : "card");

    if (finalPaymentMethod === "card") {
      if (paymentIntentId) {
        const { stripe } = await getTenantStripe(req.tenantId);
        if (stripe) {
          try {
            const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
            if (pi.status === "succeeded") {
              resolvedPaymentStatus = "paid";
            }
          } catch (e) {
            console.error("Stripe verify error", e);
          }
        }
      } else {
        // POS terminal / staff marked card payment as paid at counter
        resolvedPaymentStatus = req.body.paymentStatus === "unpaid" ? "unpaid" : "paid";
      }
    } else if (finalPaymentMethod === "split") {
      resolvedPaymentStatus = req.body.paymentStatus === "unpaid" ? "unpaid" : "paid";
    } else {
      resolvedPaymentStatus = req.body.paymentStatus === "paid" ? "paid" : "unpaid";
    }

    const initialStatus = req.body.status || (resolvedPaymentStatus === "paid" && (finalPaymentMethod === "cash" || finalPaymentMethod === "split") ? "Finished" : "pending");

    let savedOrder = null;
    let saveError = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const { businessDay, dailyOrderNumber, invoiceSerial } = await takeNextOrderNumbers(
        req.tenantId,
        branchKey,
      );

      const neworder = new Order({
        ...tenantMatch(req.tenantId),
        branchId: branchOid,
        branchKey,
        customerName,
        tableId,
        items,
        totalPrice,
        userID: userID || null,
        guestToken: finalGuestToken || null,
        businessDay,
        dailyOrderNumber,
        invoiceSerial,
        status: initialStatus,
        paymentMethod: finalPaymentMethod,
        cashAmount: Number(cashAmount) || 0,
        cardAmount: Number(cardAmount) || 0,
        paymentStatus: resolvedPaymentStatus,
        paymentIntentId: finalPaymentMethod === "card" ? paymentIntentId : null,
      });

      try {
        savedOrder = await neworder.save();
        saveError = null;
        break;
      } catch (err) {
        saveError = err;
        if (err.code === 11000 && attempt < 4) {
          console.warn("[createOrder] duplicate day/invoice key, retrying:", err.message);
          continue;
        }
        throw err;
      }
    }

    if (!savedOrder) {
      throw saveError || new Error("Could not save order with unique numbers");
    }

    await clearMenuCache(req.tenantId, branchOid);

    /** Emit only within this tenant’s Socket.IO room — prevents cross-tenant leakage */
    const tid = String(savedOrder.tenantId);
    io.to(`tenant:${tid}`).emit("newOrder", savedOrder.toObject());

    res.status(200).json({ message: " Order Created successfully", order: savedOrder });
  } catch (error) {
    res.status(500).json({ message: "Faild to create order", error: error.message });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const io = getIo();
    const { id } = req.params;
    const {
      customerName,
      totalPrice,
      tableId,
      items: rawItems,
      paymentMethod,
      cashAmount,
      cardAmount,
      paymentStatus,
      status,
    } = req.body;

    const existingOrder = await Order.findOne({ _id: id, tenantId: req.tenantId });
    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    const branchOid = existingOrder.branchId || null;
    let items = existingOrder.items;
    if (rawItems) {
      let parsed = typeof rawItems === "string" ? JSON.parse(rawItems) : rawItems;
      items = await normalizeOrderItems(parsed, req.tenantId, branchOid);
    }

    const updateFields = {};
    if (customerName !== undefined) updateFields.customerName = customerName;
    if (totalPrice !== undefined) updateFields.totalPrice = Number(totalPrice);
    if (tableId !== undefined) updateFields.tableId = tableId;
    if (items) updateFields.items = items;
    if (paymentMethod !== undefined) updateFields.paymentMethod = paymentMethod;
    if (cashAmount !== undefined) updateFields.cashAmount = Number(cashAmount);
    if (cardAmount !== undefined) updateFields.cardAmount = Number(cardAmount);
    if (paymentStatus !== undefined) updateFields.paymentStatus = paymentStatus;
    if (status !== undefined) {
      updateFields.status = status;
      const nextNorm = String(status).toLowerCase().replace(/\s+/g, "");
      if (nextNorm === "ready" && !existingOrder.readyAt) {
        updateFields.readyAt = new Date();
      }
      if (nextNorm === "ready" || nextNorm === "finished" || nextNorm === "finised") {
        updateFields.completedBy = req.user?.userId || null;
        updateFields.completedAt = new Date();
      }
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: id, tenantId: req.tenantId },
      updateFields,
      { new: true },
    );

    const tid = String(req.tenantId);
    io.to(`tenant:${tid}`).emit(
      "orderUpdated",
      updatedOrder?.toObject ? updatedOrder.toObject() : updatedOrder,
    );

    res.status(200).json({ message: "Order updated successfully", order: updatedOrder });
  } catch (error) {
    res.status(500).json({ message: "Failed to update order", error: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const io = getIo();
    const { id } = req.params;
    const { status } = req.body;

    const prev = await Order.findOne({ _id: id, tenantId: req.tenantId });
    if (!prev) {
      return res.status(404).json({ message: "Order not found" });
    }

    const updateData = { status };
    const nextNorm = String(status || "").toLowerCase().replace(/\s+/g, "");
    if (nextNorm === "ready" && !prev.readyAt) {
      updateData.readyAt = new Date();
    }

    if (nextNorm === "ready" || nextNorm === "finished" || nextNorm === "finised") {
      updateData.completedBy = req.user?.userId || null;
      updateData.completedAt = new Date();
    } else if (nextNorm === "pending" || nextNorm === "inprogress" || nextNorm === "coking") {
      updateData.completedBy = null;
      updateData.completedAt = null;
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: id, tenantId: req.tenantId },
      updateData,
      { new: true },
    );
    const tid = String(req.tenantId);
    io.to(`tenant:${tid}`).emit(
      "orderUpdated",
      updatedOrder?.toObject?.() ? updatedOrder.toObject() : updatedOrder,
    );

    const prevNorm = String(prev.status || "").toLowerCase().replace(/\s+/g, "");
    const isFin = (n) => n === "finished" || n === "finised";
    const becameFinished = isFin(nextNorm) && !isFin(prevNorm);

    if (status === "Finished" || status === "Finised") {
      io.to(`tenant:${tid}`).emit("orderRemoved", id);
    }

    if (becameFinished && updatedOrder?.items?.length) {
      const nameMap = await getMenuNameToIdMap(req.tenantId, prev.branchId || null);
      for (const line of updatedOrder.items) {
        const q = line.quantity || 0;
        if (q <= 0) continue;
        const menuId = resolveLineMenuId(line, nameMap);
        if (!menuId) continue;
        await Menu.findOneAndUpdate(
          { _id: menuId, tenantId: req.tenantId },
          { $inc: { soldCount: q } },
        );
      }
      await clearMenuCache(req.tenantId, prev.branchId || null);
    }

    res.status(200).json({ message: "Order updated", updatedOrder });
  } catch (error) {
    res.status(500).json({ message: "Failed to updated order", error: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const q = { tenantId: req.tenantId };
    if (req.branchId) q.branchId = req.branchId;

    const orders = await Order.find(q).sort({ createdAt: -1 }).lean();
    await attachEngagementToOrders(orders, req.tenantId, req.branchId || null);
    res.status(200).json({ message: "All orders", orders });
  } catch (error) {
    res.status(500).json({ message: "Faild to get orders", error: error.message });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "id not found" });

    const deleteOrderDoc = await Order.findOneAndDelete({
      _id: id,
      tenantId: req.tenantId,
    });

    res.status(200).json({ message: "order Deelted successfully", deleteOrder: deleteOrderDoc });
  } catch (error) {
    res.status(400).json({ message: "faild to delete order", error: error.message });
  }
};

export const activeOrders = async (req, res) => {
  try {
    const prepWindowSeconds = 600;
    const serverNow = Date.now();
    const q = {
      tenantId: req.tenantId,
      status: { $nin: ["Finished", "Finised", "Cancelled"] },
    };
    if (req.branchId) q.branchId = req.branchId;

    const activeOrder = await Order.find(q).sort({ createdAt: -1 }).lean();
    const activeOrdersList = activeOrder.map((order) => {
      const createdMs = new Date(order.createdAt).getTime();
      const countdownEndsAt = Number.isFinite(createdMs)
        ? new Date(createdMs + prepWindowSeconds * 1000).toISOString()
        : null;
      const remainingSeconds = Number.isFinite(createdMs)
        ? Math.max(0, Math.floor((createdMs + prepWindowSeconds * 1000 - serverNow) / 1000))
        : 0;
      return {
        ...order,
        countdownEndsAt,
        remainingSeconds,
      };
    });
    res.status(200).json({
      message: "fetching active user succesfully",
      activeOrders: activeOrdersList,
      serverNow,
      prepWindowSeconds,
    });
  } catch (error) {
    res.status(500).json({ message: "faild to get active users", error: error.message });
  }
};

export const getServerClock = async (_req, res) => {
  try {
    res.status(200).json({
      serverNow: Date.now(),
      prepWindowSeconds: 600,
    });
  } catch (error) {
    res.status(500).json({
      message: "failed to fetch server clock",
      error: error.message,
    });
  }
};

async function enrichMyOrdersDocuments(orders, tenantId, branchHint) {
  const nameMap = await getMenuNameToIdMap(tenantId, branchHint);
  return orders.map((order) => {
    const obj = typeof order.toObject === "function" ? order.toObject() : { ...order };
    obj.items = (obj.items || []).map((it) => {
      const resolved = resolveLineMenuId(it, nameMap);
      return {
        ...it,
        resolvedMenuItemId: resolved ? String(resolved) : null,
      };
    });
    return obj;
  });
}

export const getOrdersByCustomerAccount = async (req, res) => {
  try {
    const userId = req.customerId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const q = {
      tenantId: req.tenantId,
      userID: userId,
    };

    const orders = await Order.find(q).sort({ createdAt: -1 });
    const enriched = await enrichMyOrdersDocuments(orders, req.tenantId, null);

    res.status(200).json({
      message: "Orders fetch successfully",
      orders: enriched,
    });
  } catch (error) {
    res.status(500).json({ message: "faild to fetch orders", error: error.message });
  }
};

export const getOrdersByUser = async (req, res) => {
  try {
    const { guestToken } = req.params;

    if (!guestToken || guestToken === "null" || guestToken === "undefined" || guestToken.trim() === "") {
      return res.status(200).json({ message: "No orders found", orders: [] });
    }

    const q = { tenantId: req.tenantId, guestToken };

    const orders = await Order.find(q).sort({ createdAt: -1 });

    if (orders.length === 0) return res.status(404).json({ message: "No order found for this token" });

    const enriched = await enrichMyOrdersDocuments(
      orders,
      req.tenantId,
      req.branchId || null,
    );

    res.status(200).json({ message: "Orders fetch successfully", orders: enriched });
  } catch (error) {
    res.status(500).json({ message: "faild to fetch orders", error: error.message });
  }
};

export const getSummaryStats = async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const tid = req.tenantId;

    const orderMatch = { tenantId: tid };
    if (req.branchId) orderMatch.branchId = req.branchId;

    const menuMatch = { tenantId: tid };
    if (req.branchId) {
      menuMatch.$or = [{ branchId: null }, { branchId: req.branchId }];
    }

    const [orderFacet, menuAgg] = await Promise.all([
      Order.aggregate([
        { $match: orderMatch },
        {
          $facet: {
            overall: [
              {
                $group: {
                  _id: null,
                  orderCount: { $sum: 1 },
                  revenue: { $sum: "$totalPrice" },
                },
              },
            ],
            byStatus: [
              { $group: { _id: "$status", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ],
            last7Days: [
              {
                $match: { createdAt: { $gte: sevenDaysAgo } },
              },
              { $count: "count" },
            ],
            activeOrders: [
              {
                $match: {
                  status: { $nin: ["Finished", "Finised", "Cancelled"] },
                },
              },
              { $count: "count" },
            ],
          },
        },
      ]),
      Menu.aggregate([
        { $match: menuMatch },
        {
          $group: {
            _id: null,
            menuCount: { $sum: 1 },
            unitsSold: { $sum: "$soldCount" },
            totalLikes: { $sum: "$likeCount" },
            totalDislikes: { $sum: "$dislikeCount" },
            ratingSum: { $sum: "$ratingSum" },
            ratingCount: { $sum: "$ratingCount" },
          },
        },
      ]),
    ]);

    const facet = orderFacet[0] || {};
    const overall = facet.overall?.[0] || { orderCount: 0, revenue: 0 };
    const byStatus = (facet.byStatus || []).map((row) => ({
      status: row._id ?? "—",
      count: row.count,
    }));
    const last7Days = facet.last7Days?.[0]?.count ?? 0;
    const activeOrdersCount = facet.activeOrders?.[0]?.count ?? 0;

    const m = menuAgg[0] || {};
    const ratingCount = m.ratingCount || 0;
    const ratingSum = m.ratingSum || 0;
    const averageRating =
      ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null;

    res.status(200).json({
      orders: {
        total: overall.orderCount || 0,
        revenue: overall.revenue || 0,
        last7Days,
        active: activeOrdersCount,
        byStatus,
      },
      menu: {
        items: m.menuCount || 0,
        unitsSold: m.unitsSold || 0,
        likes: m.totalLikes || 0,
        dislikes: m.totalDislikes || 0,
        averageRating,
        totalRatings: ratingCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load summary",
      error: error.message,
    });
  }
};

export const markOrderAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findOneAndUpdate(
      { _id: id, tenantId: req.tenantId },
      { paymentStatus: "paid" },
      { new: true }
    );
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const io = getIo();
    const tid = String(req.tenantId);
    io.to(`tenant:${tid}`).emit("orderUpdated", order.toObject());
    res.status(200).json({ message: "Order marked as paid", order });
  } catch (error) {
    res.status(500).json({ message: "Failed to update payment status", error: error.message });
  }
};

export const requestCancellation = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemsToCancel, cancelReason, guestToken } = req.body;

    const order = await Order.findOne({ _id: id, tenantId: req.tenantId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!order.cancellationRequests) {
      order.cancellationRequests = [];
    }

    // Determine requester
    const isStaff = req.user && ["owner", "manager", "chef", "barista", "cashier"].includes(req.user.role);
    let requestedBy = "staff";

    if (!isStaff) {
      // Must be customer/guest
      requestedBy = "customer";
      let hasAccess = false;
      const reqCustomerId = req.user?.userId;
      if (reqCustomerId && String(order.userID) === String(reqCustomerId)) {
        hasAccess = true;
      } else if (guestToken && order.guestToken === guestToken) {
        hasAccess = true;
      }

      if (!hasAccess) {
        return res.status(403).json({ message: "You do not have permission to cancel this order" });
      }

      // Customers can only request cancellation on pending orders
      const normalizedStatus = String(order.status || "").toLowerCase().replace(/\s+/g, "");
      if (normalizedStatus !== "pending") {
        return res.status(400).json({
          message: "Order has already been prepared or served and cannot be cancelled.",
        });
      }
    }

    // Check if there's already a pending request from the same side
    const pendingReq = order.cancellationRequests.find(
      (r) => r.status === "pending" && r.requestedBy === requestedBy
    );
    if (pendingReq) {
      return res.status(400).json({
        message: "You already have a pending cancellation request for this order.",
      });
    }

    // Prepare requested items
    let reqItems = [];
    if (!itemsToCancel || itemsToCancel.length === 0) {
      // Full cancel: add all remaining active items to request
      reqItems = order.items
        .filter((it) => it.quantity > 0)
        .map((it) => ({
          menuItemId: it.menuItemId || null,
          name: it.name,
          quantityToCancel: it.quantity,
        }));
    } else {
      // Partial cancel
      for (const reqItem of itemsToCancel) {
        const item = order.items.find(
          (it) => {
            const idMatch = it.menuItemId && reqItem.menuItemId && String(it.menuItemId) === String(reqItem.menuItemId);
            const nameMatch = it.name === reqItem.name;
            return idMatch || nameMatch;
          }
        );
        if (item) {
          const qty = Math.min(item.quantity, Number(reqItem.quantityToCancel) || 0);
          if (qty > 0) {
            reqItems.push({
              menuItemId: item.menuItemId || null,
              name: item.name,
              quantityToCancel: qty,
            });
          }
        }
      }
    }

    if (reqItems.length === 0) {
      return res.status(400).json({ message: "No active items selected for cancellation request." });
    }

    // Add request
    order.cancellationRequests.push({
      requestedBy,
      requestedAt: new Date(),
      items: reqItems,
      cancelReason: cancelReason || `Cancellation requested by ${requestedBy}`,
      status: "pending",
    });

    order.markModified("cancellationRequests");
    const savedOrder = await order.save();

    // Broadcast socket update
    const io = getIo();
    const tid = String(req.tenantId);
    io.to(`tenant:${tid}`).emit("orderUpdated", savedOrder.toObject());

    res.status(200).json({
      message: "Cancellation request submitted successfully.",
      order: savedOrder,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to request cancellation", error: error.message });
  }
};

export const resolveCancellationRequest = async (req, res) => {
  try {
    const { id, requestId } = req.params;
    const { action, guestToken } = req.body; // action: "accept" or "reject"

    const order = await Order.findOne({ _id: id, tenantId: req.tenantId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!order.cancellationRequests) {
      order.cancellationRequests = [];
    }

    const request = order.cancellationRequests.id 
      ? order.cancellationRequests.id(requestId)
      : order.cancellationRequests.find((r) => String(r._id) === String(requestId));

    if (!request) {
      return res.status(404).json({ message: "Cancellation request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "This request has already been resolved." });
    }

    // Authorization checks
    const isStaff = req.user && ["owner", "manager", "chef", "barista", "cashier"].includes(req.user.role);

    if (request.requestedBy === "customer") {
      if (!isStaff) {
        return res.status(403).json({ message: "Only staff can resolve customer cancellation requests." });
      }
    } else {
      // requested by staff, must be customer to resolve
      let isCustomerOwner = false;
      const reqCustomerId = req.user?.userId;
      if (reqCustomerId && String(order.userID) === String(reqCustomerId)) {
        isCustomerOwner = true;
      } else if (guestToken && order.guestToken === guestToken) {
        isCustomerOwner = true;
      }

      if (!isCustomerOwner) {
        return res.status(403).json({ message: "Only the customer can resolve staff cancellation requests." });
      }
    }

    // Resolve the request
    request.status = action === "accept" ? "accepted" : "rejected";
    request.resolvedAt = new Date();
    if (isStaff) {
      request.resolvedBy = req.user.userId;
    }

    let refundResult = { status: "none", message: "No refund required" };

    if (action === "accept") {
      const prevTotalPrice = order.totalPrice;

      // Apply the cancellation to items
      for (const reqItem of request.items) {
        const item = order.items.find(
          (it) => {
            const idMatch = it.menuItemId && reqItem.menuItemId && String(it.menuItemId) === String(reqItem.menuItemId);
            const nameMatch = it.name === reqItem.name;
            return idMatch || nameMatch;
          }
        );
        if (item) {
          const qtyToCancel = Math.min(item.quantity, reqItem.quantityToCancel);
          if (qtyToCancel > 0) {
            item.quantity -= qtyToCancel;
            item.cancelledQuantity = (item.cancelledQuantity || 0) + qtyToCancel;
            item.cancelReason = request.cancelReason || "Accepted cancellation request";
          }
        }
      }

      // Recalculate totalPrice
      order.totalPrice = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // If all active items are now 0, mark full order status as Cancelled
      const activeItemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      if (activeItemCount === 0) {
        order.status = "Cancelled";
      }

      // Trigger Stripe refund if payment was card + paid
      const refundAmount = prevTotalPrice - order.totalPrice;
      if (
        refundAmount > 0 &&
        order.paymentStatus === "paid" &&
        order.paymentMethod === "card" &&
        order.paymentIntentId
      ) {
        try {
          order.refundStatus = "pending";
          const { stripe } = await getTenantStripe(req.tenantId);
          if (stripe) {
            const refund = await stripe.refunds.create({
              payment_intent: order.paymentIntentId,
              amount: Math.round(refundAmount * 100),
            });
            if (refund.status === "succeeded" || refund.status === "pending") {
              order.refundStatus = "succeeded";
              order.refundedAmount = (order.refundedAmount || 0) + refundAmount;
              refundResult = { status: "succeeded", refundId: refund.id };
            } else {
              order.refundStatus = "failed";
              refundResult = { status: "failed", message: `Stripe status: ${refund.status}` };
            }
          } else {
            order.refundStatus = "failed";
            refundResult = { status: "failed", message: "Stripe client not configured" };
          }
        } catch (stripeErr) {
          console.error("Stripe refund error:", stripeErr);
          order.refundStatus = "failed";
          refundResult = { status: "failed", error: stripeErr.message };
        }
      }

      // Set cancellation logs on the main order if it becomes fully Cancelled
      if (order.status === "Cancelled") {
        order.cancelledAt = new Date();
        order.cancelledBy = isStaff ? req.user.userId : null;
        order.cancelReason = request.cancelReason || "Fully cancelled via request";
      }
    }

    order.markModified("items");
    order.markModified("cancellationRequests");
    const savedOrder = await order.save();

    await clearMenuCache(req.tenantId, order.branchId || null);

    // Emit Socket.io notifications
    const io = getIo();
    const tid = String(req.tenantId);
    io.to(`tenant:${tid}`).emit("orderUpdated", savedOrder.toObject());
    if (savedOrder.status === "Cancelled") {
      io.to(`tenant:${tid}`).emit("orderRemoved", id);
    }

    res.status(200).json({
      message: `Cancellation request ${action === "accept" ? "accepted" : "rejected"} successfully.`,
      order: savedOrder,
      refundResult,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to resolve cancellation request", error: error.message });
  }
};
