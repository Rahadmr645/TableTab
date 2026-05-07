import React, { useContext, useEffect, useCallback, useState } from "react";
import "./MyOrders.css";
import { AuthContext } from "../../context/CartContext";
import { api } from "../../utils/api.js";
import {
  SocketContext,
  ORDER_PREP_WINDOW_SECONDS,
} from "../../context/SocketContext.jsx";
import SaudiRiyalSymbol from "../../components/currency/SaudiRiyalSymbol.jsx";
import AsyncLoadingOverlay from "../../components/common/AsyncLoadingOverlay.jsx";
import ReceiptPreviewModal from "@shared/ReceiptPreviewModal.jsx";
import { FaFilePdf, FaThumbsDown, FaThumbsUp } from "react-icons/fa6";
import { FiShoppingBag, FiMessageCircle } from "react-icons/fi";
import "../../components/menu/MenuList.css";

function orderIsFinished(status) {
  const s = (status || "").toLowerCase().replace(/\s+/g, "");
  return s === "finished" || s === "finised";
}

/** Matches kitchen prep countdown: after 0:00 or when marked finished. */
function reviewSectionUnlocked(order, serverTimeOffsetMs) {
  if (orderIsFinished(order.status)) return true;
  return getPrepRemainingSeconds(order, serverTimeOffsetMs) <= 0;
}

function feedbackPanelKey(orderId, menuItemId) {
  return `${String(orderId)}::${String(menuItemId)}`;
}

function reviewKey(orderId, menuItemId) {
  return `${orderId}:${String(menuItemId)}`;
}

/** One row per distinct menu dish (reviews are per order + menu item). */
function aggregateReviewableLines(order) {
  const map = new Map();
  for (const it of order.items || []) {
    const mid = it.resolvedMenuItemId || it.menuItemId;
    if (!mid) continue;
    const k = String(mid);
    const q = Number(it.quantity) || 0;
    if (!map.has(k)) {
      map.set(k, {
        name: it.name,
        quantity: q,
        price: it.price,
        resolvedMenuItemId: mid,
        menuItemId: it.menuItemId,
      });
    } else {
      map.get(k).quantity += q;
    }
  }
  return [...map.values()];
}

function firstOrderLineForMenuId(order, menuItemId) {
  const s = String(menuItemId);
  return (order.items || []).find(
    (it) =>
      String(it.resolvedMenuItemId || it.menuItemId || "") === s,
  );
}

function statusPillClass(status) {
  const s = (status || "").toLowerCase().replace(/\s+/g, "");
  if (s === "pending") return "status-pill status-pill--pending";
  if (s === "inprogress") return "status-pill status-pill--progress";
  if (s === "ready") return "status-pill status-pill--ready";
  if (s === "finished" || s === "finised") return "status-pill status-pill--finished";
  return "status-pill";
}

/** Remaining seconds in the prep window, using server-synced clock from API headers. */
function getPrepRemainingSeconds(order, serverOffsetMs) {
  if (!order?.createdAt) return 0;
  const created = new Date(order.createdAt).getTime();
  if (!Number.isFinite(created)) return 0;
  const now = Date.now() + (Number(serverOffsetMs) || 0);
  const elapsed = Math.floor((now - created) / 1000);
  return Math.max(0, ORDER_PREP_WINDOW_SECONDS - elapsed);
}

function OrderPrepWindow({ order, serverTimeOffset, formatTime }) {
  const finished = orderIsFinished(order.status);
  const remaining = finished
    ? 0
    : getPrepRemainingSeconds(order, serverTimeOffset);
  const pct = Math.min(
    1,
    finished ? 1 : remaining / ORDER_PREP_WINDOW_SECONDS,
  );
  const statusLower = (order.status || "").toLowerCase().replace(/\s+/g, "");
  const isReady = statusLower === "ready";

  let sub;
  if (finished) {
    sub = "Order complete — thanks for dining with us.";
  } else if (remaining <= 0) {
    sub =
      "Typical 5-minute window has passed; the kitchen may still be finishing.";
  } else if (isReady) {
    sub = "Marked ready — head to the pass when staff call your table.";
  } else {
    sub = "Time left in the usual prep window (restaurant clock).";
  }

  return (
    <div
      className={`order-window${finished ? " order-window--finished" : ""}${remaining <= 0 && !finished ? " order-window--over" : ""}`}
      aria-label="Preparation window countdown"
    >
      <span className="order-window__eyebrow">Window</span>
      <div
        className="order-window__ring"
        style={{ "--prep-pct": String(pct) }}
      >
        <div className="order-window__ring-inner">
          {finished ? (
            <span className="order-window__time order-window__time--done" aria-hidden>
              ✓
            </span>
          ) : (
            <span className="order-window__time">{formatTime(remaining)}</span>
          )}
        </div>
      </div>
      <p className="order-window__sub">{sub}</p>
    </div>
  );
}

const MyOrders = () => {
  const { myOrders, setMyOrders, user } = useContext(AuthContext);
  const {
    formatTime,
    socket,
    serverTimeOffset,
    syncServerTimeFromApiResponse,
  } = useContext(SocketContext);
  const [, setCountdownTick] = useState(0);

  const [reviewedKeys, setReviewedKeys] = useState(() => new Set());
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [reviewSubmitting, setReviewSubmitting] = useState(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [previewPack, setPreviewPack] = useState(null);
  const [menuMetaById, setMenuMetaById] = useState({});
  const [guestVotes, setGuestVotes] = useState({});
  const [expandedFeedbackKey, setExpandedFeedbackKey] = useState(null);
  const [commentsCache, setCommentsCache] = useState({});
  const [voteBusyMid, setVoteBusyMid] = useState(null);
  const [commentBusyKey, setCommentBusyKey] = useState(null);
  const [commentDraftByKey, setCommentDraftByKey] = useState({});
  /** Per order: undefined = prompt, "list" = pick dish, else menuItemId = detail */
  const [dishReviewWizard, setDishReviewWizard] = useState({});

  const refreshMenuSnapshot = useCallback(async () => {
    try {
      const res = await api.get("/api/menu/menuList");
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.MenuList)
          ? res.data.MenuList
          : [];
      const map = Object.fromEntries(
        list.map((m) => [
          String(m._id),
          {
            soldCount: m.soldCount ?? 0,
            likeCount: m.likeCount ?? 0,
            dislikeCount: m.dislikeCount ?? 0,
            commentCount: m.commentCount ?? 0,
            ratingCount: m.ratingCount ?? 0,
            averageRating: m.averageRating ?? null,
          },
        ]),
      );
      setMenuMetaById(map);
    } catch {
      /* keep previous */
    }
  }, []);

  useEffect(() => {
    if ((myOrders || []).length === 0) return undefined;
    let cancelled = false;
    refreshMenuSnapshot().then(() => {
      if (!cancelled) {
        /* loaded */
      }
    });
    return () => {
      cancelled = true;
    };
  }, [myOrders, refreshMenuSnapshot]);

  useEffect(() => {
    const tokens = new Set();
    const storedGt = localStorage.getItem("guestToken")?.trim();
    if (storedGt) tokens.add(storedGt);
    (myOrders || []).forEach((o) => {
      const t = (o.guestToken || "").trim();
      if (t) tokens.add(t);
    });
    if (tokens.size === 0) return undefined;

    let cancelled = false;
    Promise.all(
      [...tokens].map((t) =>
        Promise.all([
          api
            .get(`/api/menu/my-reviews/${encodeURIComponent(t)}`)
            .then((res) => res.data?.pairs || [])
            .catch(() => []),
          api
            .get(`/api/menu/my-votes/${encodeURIComponent(t)}`)
            .then((res) => res.data?.votes || {})
            .catch(() => ({})),
        ]),
      ),
    ).then((rows) => {
      if (cancelled) return;
      const pairs = [];
      const voteMerged = {};
      for (const [pr, vm] of rows) {
        pairs.push(...pr);
        Object.assign(voteMerged, vm);
      }
      setReviewedKeys(
        new Set(pairs.map((p) => reviewKey(p.orderId, p.menuItemId))),
      );
      setGuestVotes(voteMerged);
    });
    return () => {
      cancelled = true;
    };
  }, [myOrders]);

  const fetchMyOrders = useCallback(
    async (opts = {}) => {
      const silent = Boolean(opts.silent);
      if (!silent) setOrdersLoading(true);
      try {
        const authToken = localStorage.getItem("token")?.trim();
        if (authToken) {
          const res = await api.get("/api/order/my-orders-for-account");
          syncServerTimeFromApiResponse(res);
          setMyOrders(
            Array.isArray(res.data?.orders) ? res.data.orders : [],
          );
          return;
        }
        const guestToken = localStorage.getItem("guestToken")?.trim();
        if (!guestToken) {
          setMyOrders([]);
          return;
        }
        const res = await api.get(
          `/api/order/my-orders/${encodeURIComponent(guestToken)}`,
        );
        syncServerTimeFromApiResponse(res);
        setMyOrders(
          Array.isArray(res.data?.orders) ? res.data.orders : [],
        );
      } catch (error) {
        console.log("Failed to fetch orders:", error.message);
      } finally {
        if (!silent) setOrdersLoading(false);
      }
    },
    [setMyOrders, syncServerTimeFromApiResponse],
  );

  useEffect(() => {
    fetchMyOrders();
  }, [fetchMyOrders, user?._id]);

  useEffect(() => {
    if (!myOrders || myOrders.length === 0) return undefined;
    const id = setInterval(() => setCountdownTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [myOrders]);

  useEffect(() => {
    if (!socket) return;
    const onUpdated = () => {
      fetchMyOrders({ silent: true });
    };
    socket.on("orderUpdated", onUpdated);
    return () => socket.off("orderUpdated", onUpdated);
  }, [socket, fetchMyOrders]);

  useEffect(() => {
    if (!socket) return;
    const onNew = (order) => {
      const authToken = localStorage.getItem("token")?.trim();
      if (authToken) {
        fetchMyOrders({ silent: true });
        return;
      }
      const guestToken = localStorage.getItem("guestToken")?.trim();
      if (!guestToken || order.guestToken !== guestToken) return;
      fetchMyOrders({ silent: true });
    };
    socket.on("newOrder", onNew);
    return () => socket.off("newOrder", onNew);
  }, [socket, fetchMyOrders]);

  const guestTokenStored = Boolean(localStorage.getItem("guestToken")?.trim());
  const customerJwtStored = Boolean(localStorage.getItem("token")?.trim());

  const setDraft = (key, patch) => {
    setReviewDrafts((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  const submitOrderReview = async (order, item) => {
    const mid = item.resolvedMenuItemId || item.menuItemId;
    if (!mid) {
      alert(
        "Could not match this line to a menu dish. Try again after refreshing the page.",
      );
      return;
    }
    const key = reviewKey(order._id, mid);
    const guestToken =
      (order.guestToken || "").trim() ||
      localStorage.getItem("guestToken")?.trim();
    const d = reviewDrafts[key] || {};
    const rating = Number(d.rating) || 0;
    if (rating < 1 || rating > 5) {
      alert("Pick a star rating from 1 to 5.");
      return;
    }
    if (!guestToken) {
      alert(
        "This order has no guest session id on file; reviews must use the same browser session as checkout, or contact support.",
      );
      return;
    }
    setReviewSubmitting(key);
    try {
      const res = await api.post("/api/menu/order-review", {
        menuItemId: String(mid),
        orderId: order._id,
        guestToken,
        rating,
        comment: (d.comment || "").trim(),
        customerName: order.customerName,
      });
      setReviewedKeys((prev) => new Set([...prev, key]));
      const n = res.data?.ratingCount;
      const avgOut = res.data?.averageRating;
      const midStr = String(mid);
      if (n != null || avgOut != null) {
        setMenuMetaById((prev) => ({
          ...prev,
          [midStr]: {
            ...(prev[midStr] || {}),
            ...(n != null ? { ratingCount: n } : {}),
            ...(avgOut != null ? { averageRating: avgOut } : {}),
          },
        }));
      }
      await refreshMenuSnapshot();
      if (n != null && avgOut != null) {
        alert(
          `Thanks! This dish is now ${avgOut}★ from ${n} review${n === 1 ? "" : "s"} on the menu.`,
        );
      } else {
        alert("Thanks for your review!");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Could not save review.";
      alert(msg);
    } finally {
      setReviewSubmitting(null);
    }
  };

  const handleLineVote = async (mid, guestToken, vote) => {
    const gt = String(guestToken || "").trim();
    if (!mid || !gt) {
      alert("Use the same device session as checkout to vote.");
      return;
    }
    const idStr = String(mid);
    if (voteBusyMid) return;
    setVoteBusyMid(idStr);
    try {
      const res = await api.post("/api/menu/vote", {
        menuItemId: idStr,
        guestToken: gt,
        vote,
      });
      setGuestVotes((prev) => ({ ...prev, [idStr]: vote }));
      setMenuMetaById((prev) => ({
        ...prev,
        [idStr]: {
          ...(prev[idStr] || {}),
          likeCount: res.data.likeCount,
          dislikeCount: res.data.dislikeCount,
        },
      }));
    } catch (e) {
      const msg =
        e.response?.data?.message || "Could not save your vote. Try again.";
      alert(msg);
    } finally {
      setVoteBusyMid(null);
    }
  };

  const toggleLineComments = async (order, fk, menuItemId) => {
    if (!fk || !menuItemId) return;
    if (expandedFeedbackKey === fk) {
      setExpandedFeedbackKey(null);
      return;
    }
    setExpandedFeedbackKey(fk);
    setCommentDraftByKey((prev) =>
      prev[fk]
        ? prev
        : {
            ...prev,
            [fk]: {
              name: String(order.customerName || "").trim(),
              text: "",
            },
          },
    );
    const midStr = String(menuItemId);
    try {
      const res = await api.get(
        `/api/menu/comments/${encodeURIComponent(midStr)}?limit=15`,
      );
      setCommentsCache((prev) => ({
        ...prev,
        [midStr]: res.data?.comments || [],
      }));
    } catch (err) {
      console.error(err);
      setCommentsCache((prev) => ({ ...prev, [midStr]: [] }));
    }
  };

  const setReviewWizardStep = useCallback((orderId, step) => {
    const k = String(orderId);
    setDishReviewWizard((prev) => {
      if (step === undefined) {
        const next = { ...prev };
        delete next[k];
        return next;
      }
      return { ...prev, [k]: step };
    });
    setExpandedFeedbackKey(null);
  }, []);

  const submitLineComment = async (e, order, mid, fk) => {
    e.preventDefault();
    const gt =
      String(order.guestToken || "").trim() ||
      localStorage.getItem("guestToken")?.trim();
    if (!gt) {
      alert("Session missing; cannot comment.");
      return;
    }
    const d = commentDraftByKey[fk] || { name: "", text: "" };
    const customerNameIn = String(d.name || "").trim();
    const text = String(d.text || "").trim();
    if (!customerNameIn || !text) {
      alert("Enter your name and a short comment.");
      return;
    }
    const midStr = String(mid);
    setCommentBusyKey(fk);
    try {
      await api.post("/api/menu/comment", {
        menuItemId: midStr,
        guestToken: gt,
        customerName: customerNameIn,
        text,
      });
      setCommentDraftByKey((prev) => ({
        ...prev,
        [fk]: { ...prev[fk], text: "", name: prev[fk]?.name ?? customerNameIn },
      }));
      const res = await api.get(
        `/api/menu/comments/${encodeURIComponent(midStr)}?limit=15`,
      );
      setCommentsCache((prev) => ({
        ...prev,
        [midStr]: res.data?.comments || [],
      }));
      await refreshMenuSnapshot();
    } catch (err) {
      const msg = err.response?.data?.message || "Could not post comment.";
      alert(msg);
    } finally {
      setCommentBusyKey(null);
    }
  };

  return (
    <div className="my-orders-page">
      <AsyncLoadingOverlay
        open={ordersLoading || Boolean(reviewSubmitting)}
        message={
          ordersLoading
            ? "Loading your orders…"
            : reviewSubmitting
              ? "Saving your review…"
              : "Please wait…"
        }
      />
      <header className="my-orders-hero">
        <h1>My orders</h1>
        <p>
          Track preparation in real time. <strong>Order #</strong> is
          today&apos;s restaurant serial—the same number the kitchen uses, not
          “your 2nd order ever.” When your prep countdown ends (or when the
          kitchen marks your order finished), you can like, comment, and
          star-review only the dishes from that order—they show on the menu for
          everyone.
        </p>
      </header>

      <div className="my-orders-container">
        {myOrders && myOrders.length > 0 ? (
          myOrders.map((order) => {
            const reviewGuestToken =
              (order.guestToken || "").trim() ||
              localStorage.getItem("guestToken")?.trim();
            const oidStr = String(order._id);
            const reviewWindowOpen =
              reviewSectionUnlocked(order, serverTimeOffset) &&
              Boolean(reviewGuestToken);
            const reviewLinesAggregated = aggregateReviewableLines(order);
            const wizardStep = dishReviewWizard[oidStr];
            const allDishesStarReviewed =
              reviewLinesAggregated.length > 0 &&
              reviewLinesAggregated.every((line) => {
                const id = line.resolvedMenuItemId || line.menuItemId;
                return id && reviewedKeys.has(reviewKey(order._id, id));
              });
            return (
            <article className="my-order-card" key={order._id}>
              <div className="order-ticket-strip">
                <div className="order-serial-block">
                  <span className="order-serial-kicker">
                    Today&apos;s restaurant order
                  </span>
                  <span className="order-serial-value">
                    #
                    {order.dailyOrderNumber != null
                      ? order.dailyOrderNumber
                      : "—"}
                  </span>
                  {order.businessDay ? (
                    <span className="order-serial-day">{order.businessDay}</span>
                  ) : null}
                  <p className="order-serial-hint">
                    Same # as the kitchen queue and live board for today.
                  </p>
                </div>
                <span className={statusPillClass(order.status)}>
                  {order.status}
                </span>
              </div>

              <div className="order-header">
                <div className="order-meta">
                  <p className="order-meta-line order-meta-line--primary">
                    <span className="meta-value">{order.customerName}</span>
                    <span className="order-meta-dot" aria-hidden>
                      ·
                    </span>
                    <span className="order-meta-table">
                      Table{" "}
                      <span className="meta-value">{order.tableId}</span>
                    </span>
                  </p>
                  {order.invoiceSerial ? (
                    <p className="my-order-nums">
                      Invoice {order.invoiceSerial}
                    </p>
                  ) : null}
                  <p className="order-meta-placed">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                  <p className="my-order-pdf-row">
                    <button
                      type="button"
                      className="my-order-pdf-btn"
                      onClick={() =>
                        setPreviewPack({ order, k: Date.now() })
                      }
                      aria-label="Preview receipt slip"
                    >
                      <FaFilePdf aria-hidden />
                      Preview slip
                    </button>
                  </p>
                </div>

                <OrderPrepWindow
                  order={order}
                  serverTimeOffset={serverTimeOffset}
                  formatTime={formatTime}
                />
              </div>

              <div className="order-items">
                <strong>Items</strong>
                {order.items.map((item, i) => (
                  <div className="order-item-block" key={i}>
                    <div className="order-item">
                      <span>{item.name}</span>
                      <span>×{item.quantity}</span>
                      <span className="order-price-sar">
                        {item.price}
                        <SaudiRiyalSymbol />
                      </span>
                    </div>
                  </div>
                ))}
                <div className="total">
                  <strong className="order-total-sar">
                    Total: {order.totalPrice}
                    <SaudiRiyalSymbol />
                  </strong>
                </div>

                {reviewWindowOpen && reviewLinesAggregated.length > 0 ? (
                  <div className="order-dish-review-wizard">
                    {allDishesStarReviewed ? (
                      <p className="order-dish-review-all-done">
                        You&apos;ve reviewed every dish from this order. Star
                        ratings and comments appear on the menu so other guests
                        can pick the best dishes — thank you.
                      </p>
                    ) : wizardStep == null ? (
                      <>
                        <p className="order-feedback-banner">
                          Prep window done — you can vote, comment, and rate each
                          dish you bought. Only those dishes are unlocked for
                          this order.
                        </p>
                        <p className="order-dish-review-prompt">
                          Want to leave feedback on what you ordered?
                        </p>
                        <button
                          type="button"
                          className="order-dish-review-yes"
                          onClick={() => setReviewWizardStep(oidStr, "list")}
                        >
                          Yes — review my dishes
                        </button>
                      </>
                    ) : wizardStep === "list" ? (
                      <>
                        <div className="order-dish-review-toolbar">
                          <button
                            type="button"
                            className="order-dish-review-back"
                            onClick={() => setReviewWizardStep(oidStr, undefined)}
                          >
                            ← Back
                          </button>
                          <p className="order-dish-review-list-hint">
                            Choose a dish. Likes, comments, and your star rating
                            show on the menu for everyone.
                          </p>
                        </div>
                        <ul className="order-dish-review-list" role="list">
                          {reviewLinesAggregated.map((agg) => {
                            const mid =
                              agg.resolvedMenuItemId || agg.menuItemId;
                            const rk = reviewKey(order._id, mid);
                            const starred = reviewedKeys.has(rk);
                            return (
                              <li key={String(mid)}>
                                <button
                                  type="button"
                                  className="order-dish-review-picker"
                                  onClick={() =>
                                    setReviewWizardStep(oidStr, String(mid))
                                  }
                                >
                                  <span className="order-dish-review-picker-main">
                                    <span className="order-dish-review-picker-name">
                                      {agg.name}
                                    </span>
                                    <span className="order-dish-review-picker-meta">
                                      ×{agg.quantity}
                                      <span className="order-dish-review-picker-price">
                                        {agg.price}
                                        <SaudiRiyalSymbol />
                                      </span>
                                    </span>
                                  </span>
                                  {starred ? (
                                    <span className="order-dish-review-picker-badge">
                                      Star review sent
                                    </span>
                                  ) : (
                                    <span className="order-dish-review-picker-chevron" aria-hidden>
                                      ›
                                    </span>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    ) : (() => {
                      const detailMid = wizardStep;
                      const aggLine = reviewLinesAggregated.find(
                        (a) =>
                          String(a.resolvedMenuItemId || a.menuItemId) ===
                          detailMid,
                      );
                      const lineItem =
                        firstOrderLineForMenuId(order, detailMid) || aggLine;
                      if (!aggLine || !lineItem) return null;
                      const mid = aggLine.resolvedMenuItemId || aggLine.menuItemId;
                      const fk = feedbackPanelKey(order._id, mid);
                      const rk = reviewKey(order._id, mid);
                      const done = reviewedKeys.has(rk);
                      const draft = reviewDrafts[rk] || {};
                      const meta = menuMetaById[String(mid)];
                      const sold = meta?.soldCount ?? 0;
                      const likes = meta?.likeCount ?? 0;
                      const dislikes = meta?.dislikeCount ?? 0;
                      const commentsN = meta?.commentCount ?? 0;
                      const reviewCount = meta?.ratingCount ?? 0;
                      const avg = meta?.averageRating;
                      const myVote = guestVotes[String(mid)];
                      return (
                        <>
                          <div className="order-dish-review-toolbar">
                            <button
                              type="button"
                              className="order-dish-review-back"
                              onClick={() =>
                                setReviewWizardStep(oidStr, "list")
                              }
                            >
                              ← All dishes in this order
                            </button>
                          </div>
                          <div className="order-dish-review-detail-head">
                            <h3 className="order-dish-review-detail-title">
                              {aggLine.name}
                            </h3>
                            <p className="order-dish-review-detail-meta">
                              ×{aggLine.quantity}{" "}
                              <span className="order-price-sar">
                                {aggLine.price}
                                <SaudiRiyalSymbol />
                              </span>
                            </p>
                          </div>
                          <div className="order-feedback-slot">
                            <div
                              className="menu-stats"
                              aria-label="How this dish looks on the menu"
                            >
                              <span className="menu-stat" title="Times sold">
                                <FiShoppingBag aria-hidden />
                                <strong>{sold}</strong>
                              </span>
                              <span
                                className="menu-stat menu-stat--likes"
                                title="Likes"
                              >
                                <FaThumbsUp aria-hidden />
                                <strong>{likes}</strong>
                              </span>
                              <span
                                className="menu-stat menu-stat--dislikes"
                                title="Unlikes"
                              >
                                <FaThumbsDown aria-hidden />
                                <strong>{dislikes}</strong>
                              </span>
                              <span
                                className="menu-stat menu-stat--rating"
                                title="Average rating"
                              >
                                <span
                                  className="menu-stat-rating-star"
                                  aria-hidden
                                >
                                  ★
                                </span>
                                <strong>{avg != null ? avg : "—"}</strong>
                                <span
                                  className="menu-stat-rating-sep"
                                  aria-hidden
                                >
                                  ·
                                </span>
                                <strong>{reviewCount}</strong>
                              </span>
                              <button
                                type="button"
                                className={`menu-stat menu-stat--comments-btn${expandedFeedbackKey === fk ? " menu-stat--comments-open" : ""}`}
                                aria-expanded={expandedFeedbackKey === fk}
                                onClick={() =>
                                  toggleLineComments(order, fk, mid)
                                }
                                aria-label={`Comments: ${commentsN}`}
                              >
                                <FiMessageCircle aria-hidden />
                                <strong>{commentsN}</strong>
                              </button>
                            </div>

                            <div className="menu-vote-row">
                              <button
                                type="button"
                                className={`menu-vote-btn ${myVote === "like" ? "is-on" : ""}`}
                                disabled={voteBusyMid === String(mid)}
                                onClick={() =>
                                  reviewGuestToken &&
                                  handleLineVote(
                                    mid,
                                    reviewGuestToken,
                                    "like",
                                  )
                                }
                                aria-pressed={myVote === "like"}
                              >
                                <FaThumbsUp aria-hidden /> Like
                              </button>
                              <button
                                type="button"
                                className={`menu-vote-btn menu-vote-btn--down ${myVote === "dislike" ? "is-on" : ""}`}
                                disabled={voteBusyMid === String(mid)}
                                onClick={() =>
                                  reviewGuestToken &&
                                  handleLineVote(
                                    mid,
                                    reviewGuestToken,
                                    "dislike",
                                  )
                                }
                                aria-pressed={myVote === "dislike"}
                              >
                                <FaThumbsDown aria-hidden /> Unlike
                              </button>
                            </div>

                            {expandedFeedbackKey === fk ? (
                              <div className="menu-comments-panel">
                                <ul className="menu-comment-list">
                                  {(commentsCache[String(mid)] || [])
                                    .length === 0 ? (
                                    <li className="menu-comment-empty">
                                      No notes yet—you can add one below.
                                    </li>
                                  ) : (
                                    (commentsCache[String(mid)] || []).map(
                                      (c) => (
                                        <li
                                          key={`${c.kind}-${String(c._id)}`}
                                          className="menu-comment-item"
                                        >
                                          <div className="menu-comment-meta">
                                            <strong>{c.customerName}</strong>
                                            {c.rating != null ? (
                                              <span className="menu-comment-stars">
                                                {"★".repeat(c.rating)}
                                                {"☆".repeat(5 - c.rating)}
                                              </span>
                                            ) : null}
                                            <time dateTime={c.createdAt}>
                                              {new Date(
                                                c.createdAt,
                                              ).toLocaleDateString()}
                                            </time>
                                          </div>
                                          <p>{c.text || "—"}</p>
                                          {c.kind === "review" ? (
                                            <span className="menu-comment-badge">
                                              Star review
                                            </span>
                                          ) : null}
                                        </li>
                                      ),
                                    )
                                  )}
                                </ul>
                                <form
                                  className="menu-comment-form"
                                  onSubmit={(e) =>
                                    submitLineComment(e, order, mid, fk)
                                  }
                                >
                                  <p className="menu-comment-hint">
                                    Visible to everyone on the menu thread
                                  </p>
                                  <input
                                    type="text"
                                    placeholder="Your name"
                                    value={
                                      commentDraftByKey[fk]?.name ?? ""
                                    }
                                    onChange={(e) =>
                                      setCommentDraftByKey((prev) => ({
                                        ...prev,
                                        [fk]: {
                                          name: e.target.value,
                                          text: prev[fk]?.text ?? "",
                                        },
                                      }))
                                    }
                                    maxLength={80}
                                    className="menu-comment-input"
                                  />
                                  <textarea
                                    placeholder="Anything others should know?"
                                    value={
                                      commentDraftByKey[fk]?.text ?? ""
                                    }
                                    onChange={(e) =>
                                      setCommentDraftByKey((prev) => ({
                                        ...prev,
                                        [fk]: {
                                          name:
                                            prev[fk]?.name ?? "",
                                          text: e.target.value,
                                        },
                                      }))
                                    }
                                    maxLength={500}
                                    rows={2}
                                    className="menu-comment-textarea"
                                  />
                                  <button
                                    type="submit"
                                    className="menu-comment-submit"
                                    disabled={commentBusyKey === fk}
                                  >
                                    {commentBusyKey === fk
                                      ? "Posting…"
                                      : "Post comment"}
                                  </button>
                                </form>
                              </div>
                            ) : null}

                            <div className="order-review-slot order-review-slot--in-feedback">
                              {done ? (
                                <p className="order-review-done">
                                  You left a star review for this dish on this
                                  order — thanks. It counts toward the average on
                                  the menu.
                                </p>
                              ) : (
                                <>
                                  <p className="order-review-title">
                                    Star rating (counts toward menu average · one
                                    per dish per order)
                                  </p>
                                  <div
                                    className="order-review-stars"
                                    role="group"
                                    aria-label="Star rating"
                                  >
                                    {[1, 2, 3, 4, 5].map((n) => (
                                      <button
                                        key={n}
                                        type="button"
                                        className={
                                          (draft.rating || 0) >= n
                                            ? "is-active"
                                            : ""
                                        }
                                        onClick={() =>
                                          rk && setDraft(rk, { rating: n })
                                        }
                                        aria-label={`${n} stars`}
                                      >
                                        ★
                                      </button>
                                    ))}
                                  </div>
                                  <textarea
                                    className="order-review-textarea"
                                    rows={2}
                                    maxLength={800}
                                    placeholder="Optional comment for other guests…"
                                    value={draft.comment || ""}
                                    onChange={(e) =>
                                      rk &&
                                      setDraft(rk, {
                                        comment: e.target.value,
                                      })
                                    }
                                  />
                                  <button
                                    type="button"
                                    className="order-review-submit"
                                    disabled={reviewSubmitting === rk}
                                    onClick={() =>
                                      submitOrderReview(order, lineItem)
                                    }
                                  >
                                    {reviewSubmitting === rk
                                      ? "Saving…"
                                      : "Submit star review"}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : null}
              </div>
            </article>
            );
          })
        ) : (
          <p className="no-orders">
            {customerJwtStored
              ? "No orders on your account yet."
              : guestTokenStored
                ? "No orders found for this device yet."
                : "Place an order to see it here. Your session is saved after checkout."}
            <span className="no-orders-hint">
              {customerJwtStored
                ? "Sign in on any device with this account to see the same order history after you place an order while logged in."
                : guestTokenStored
                  ? "When you order again, it will appear in this list."
                  : "Complete a purchase once to link this browser to your orders."}
            </span>
          </p>
        )}
      </div>
      {previewPack ? (
        <ReceiptPreviewModal
          key={previewPack.k}
          order={previewPack.order}
          onClose={() => setPreviewPack(null)}
        />
      ) : null}
    </div>
  );
};

export default MyOrders;
