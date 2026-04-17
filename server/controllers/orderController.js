
import Order from "../models/OrderModel.js";
import Menu from "../models/Menu.js";
import MenuVote from "../models/MenuVote.js";
import MenuComment from "../models/MenuComment.js";
import OrderItemReview from "../models/OrderItemReview.js";
import mongoose from "mongoose";

import { getIo } from '../socket/socket.js'

import crypto from 'crypto';
import { getMenuNameToIdMap, resolveLineMenuId } from "../utils/resolveMenuLine.js";
import { takeNextOrderNumbers } from "../utils/orderNumbers.js";

/**
 * Adds `engagement` to each order: per–line-item menu stats, this guest's vote,
 * star review on this order, and guest menu note — for admin order history.
 */
async function attachEngagementToOrders(orders) {
    if (!orders?.length) return;
    const nameMap = await getMenuNameToIdMap();
    const orderIds = orders.map((o) => o._id);

    const allReviews = await OrderItemReview.find({ orderId: { $in: orderIds } }).lean();
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
            ? Menu.find({ _id: { $in: menuOidList } })
                  .select("name likeCount dislikeCount ratingSum ratingCount")
                  .lean()
            : [],
        pairList.length
            ? MenuVote.find({
                  $or: pairList.map((p) => ({
                      guestToken: p.guestToken,
                      menuItemId: p.menuItemId,
                  })),
              }).lean()
            : [],
        pairList.length
            ? MenuComment.find({
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

async function normalizeOrderItems(raw) {
    if (!Array.isArray(raw)) return [];
    const nameMap = await getMenuNameToIdMap();
    return raw.map((i) => {
        const id = i._id || i.menuItemId;
        let menuItemId = null;
        if (id && mongoose.Types.ObjectId.isValid(String(id))) {
            menuItemId = new mongoose.Types.ObjectId(String(id));
        } else {
            const resolved = resolveLineMenuId(
                { name: i.name, menuItemId: null },
                nameMap,
            );
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

// 01: create order
export const createOrder = async (req, res) => {

    try {

        console.log("request body", req.body)

        const io = getIo();
        const { customerName, totalPrice, tableId, userID, guestToken } = req.body;

        let items = req.body.items;

        // if item is a string formdata parse it 
        if (typeof items === "string") {
            items = JSON.parse(items);
        }
        items = await normalizeOrderItems(items);



        // Guest session token for "My Orders" (used for guests and as a fallback when logged in)
        const trimmedGuest = typeof guestToken === "string" ? guestToken.trim() : "";
        let finalGuestToken = trimmedGuest || crypto.randomBytes(10).toString("hex");
        console.log("final token", finalGuestToken);

        let savedOrder = null;
        let saveError = null;
        for (let attempt = 0; attempt < 5; attempt++) {
            const { businessDay, dailyOrderNumber, invoiceSerial } =
                await takeNextOrderNumbers();

            const neworder = new Order({
                customerName,
                tableId,
                items,
                totalPrice,
                userID: userID || null,
                guestToken: finalGuestToken || null,
                businessDay,
                dailyOrderNumber,
                invoiceSerial,
            });

            try {
                savedOrder = await neworder.save();
                saveError = null;
                break;
            } catch (err) {
                saveError = err;
                if (err.code === 11000 && attempt < 4) {
                    console.warn(
                        "[createOrder] duplicate day/invoice key, retrying:",
                        err.message,
                    );
                    continue;
                }
                throw err;
            }
        }

        if (!savedOrder) {
            throw saveError || new Error("Could not save order with unique numbers");
        }

        // emit new order to all cleint (plain object so clients always get dailyOrderNumber, businessDay, invoiceSerial)


        io.emit("newOrder", savedOrder.toObject());

        // console.log("emmiting suceesss", neworder)

        res.status(200).json({ message: " Order Created successfully", order: savedOrder });
        console.log(savedOrder.guestToken)
    } catch (error) {
        res.status(500).json({ message: "Faild to create order", error: error.message })
    }
}



// 02 : update orders

export const updateOrderStatus = async (req, res) => {
    try {
        const io = getIo();
        const { id } = req.params;
        const { status } = req.body;

        const prev = await Order.findById(id);
        if (!prev) {
            return res.status(404).json({ message: "Order not found" });
        }

        const updatedOrder = await Order.findByIdAndUpdate(id, { status }, { new: true }
        );
        io.emit(
            "orderUpdated",
            updatedOrder?.toObject?.() ? updatedOrder.toObject() : updatedOrder,
        );

        const prevNorm = String(prev.status || "").toLowerCase().replace(/\s+/g, "");
        const nextNorm = String(status || "").toLowerCase().replace(/\s+/g, "");
        const isFin = (n) => n === "finished" || n === "finised";
        const becameFinished = isFin(nextNorm) && !isFin(prevNorm);

        // if status is finished, notify kitchen list
        if (status === "Finished" || status === "Finised") {
            io.emit("orderRemoved", id);
        }

        if (becameFinished && updatedOrder?.items?.length) {
            const nameMap = await getMenuNameToIdMap();
            for (const line of updatedOrder.items) {
                const q = line.quantity || 0;
                if (q <= 0) continue;
                const menuId = resolveLineMenuId(line, nameMap);
                if (!menuId) continue;
                await Menu.findByIdAndUpdate(menuId, {
                    $inc: { soldCount: q },
                });
            }
        }

        res.status(200).json({ message: "Order updated", updatedOrder });
    } catch (error) {
        res.status(500).json({ message: 'Failed to updated order', error: error.message })
    }
}


// 03: get all orders for kitchen

export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 }).lean();
        await attachEngagementToOrders(orders);
        res.status(200).json({ message: "All orders", orders });
    } catch (error) {
        res.status(500).json({ message: "Faild to get orders", error: error.message })

    }
}





// 04:  delete order 
export const deleteOrder = async (req, res) => {

    try {

        const { id } = req.params;

        if (!id) return res.status(400).json({ message: "id not found" });

        const deleteOrder = await Order.findByIdAndDelete(id);

        res.status(200).json({ message: "order Deelted successfully", deleteOrder });
    } catch (error) {
        res.status(400).json({ message: 'faild to delete order', error: error.message })
    }

}


// 05: get order thos's status are not complete

export const activeOrders = async (req, res) => {

    try {
        const activeOrder = await Order.find({
            status: { $nin: ["Finished", "Finised"] },
        })
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).json({ message: 'fetching active user succesfully', activeOrders: activeOrder })
    } catch (error) {
        res.status(500).json({ message: "faild to get active users", error: error.message })
    }
}


// 06: get orders by userID
export const getOrdersByUser = async (req, res) => {

    try {
        const { guestToken } = req.params;

        if (!guestToken) {
            return res.status(400).json({ message: "token is requried" });
        }


        const orders = await Order.find({ guestToken }).sort({ createdAt: -1 });


        if (orders.length === 0) return res.status(404).json({ message: 'No order found for this order' });

        const nameMap = await getMenuNameToIdMap();
        const enriched = orders.map((order) => {
            const obj = order.toObject();
            obj.items = (obj.items || []).map((it) => {
                const resolved = resolveLineMenuId(it, nameMap);
                return {
                    ...it,
                    resolvedMenuItemId: resolved ? String(resolved) : null,
                };
            });
            return obj;
        });

        res.status(200).json({ message: 'Orders fetch successfully', orders: enriched });

    } catch (error) {
        res.status(500).json({ message: "faild to fetch orders", error: error.message })
    }
}

/** Aggregated stats for admin dashboard (orders + menu engagement). */
export const getSummaryStats = async (req, res) => {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const [orderFacet, menuAgg] = await Promise.all([
            Order.aggregate([
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
                                    status: { $nin: ["Finished", "Finised"] },
                                },
                            },
                            { $count: "count" },
                        ],
                    },
                },
            ]),
            Menu.aggregate([
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
        const activeOrders = facet.activeOrders?.[0]?.count ?? 0;

        const m = menuAgg[0] || {};
        const ratingCount = m.ratingCount || 0;
        const ratingSum = m.ratingSum || 0;
        const averageRating =
            ratingCount > 0
                ? Math.round((ratingSum / ratingCount) * 10) / 10
                : null;

        res.status(200).json({
            orders: {
                total: overall.orderCount || 0,
                revenue: overall.revenue || 0,
                last7Days,
                active: activeOrders,
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