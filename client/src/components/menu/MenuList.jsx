import React, { useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useLocation, useParams } from "react-router-dom";
import { AuthContext } from "../../context/CartContext";
import { resolveAssetUrl } from "../../utils/mediaUrl.js";
import "./MenuList.css";
import { IoAddCircleOutline } from "react-icons/io5";
import { RxDividerHorizontal } from "react-icons/rx";
import { FaThumbsUp, FaThumbsDown } from "react-icons/fa6";
import { FiMessageCircle, FiShoppingBag } from "react-icons/fi";

const TABLE_PREFILL_KEY = "tabletab_prefill_table";

const MenuList = () => {
  const location = useLocation();
  const { tableId: tableFromRoute } = useParams();
  const { URL, quantities, setQuantities, setCart, handleRemove } = useContext(AuthContext);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [itemVotes, setItemVotes] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [commentsByItem, setCommentsByItem] = useState({});
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [voteBusy, setVoteBusy] = useState(null);
  const [commentBusy, setCommentBusy] = useState(null);
  const [purchasedIds, setPurchasedIds] = useState(() => new Set());
  const [pendingReviews, setPendingReviews] = useState([]);
  const [reviewOrderPick, setReviewOrderPick] = useState({});
  const [itemReviewDraft, setItemReviewDraft] = useState({});
  const [itemReviewSubmitting, setItemReviewSubmitting] = useState(null);

  const fetchMenus = useCallback(
    async (opts = {}) => {
      const silent = opts.silent === true;
      try {
        if (!silent) setLoading(true);
        const res = await axios.get(`${URL}/api/menu/menuList`);
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.MenuList)
            ? res.data.MenuList
            : [];
        setMenuItems(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching menu:", err);
        if (!silent) {
          setError("Failed to load menu. Please try again later.");
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [URL],
  );

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  useEffect(() => {
    if (tableFromRoute != null && String(tableFromRoute).trim() !== "") {
      localStorage.setItem(TABLE_PREFILL_KEY, String(tableFromRoute).trim());
    }
  }, [tableFromRoute]);

  useEffect(() => {
    const gt = localStorage.getItem("guestToken")?.trim();
    if (!gt) {
      setPurchasedIds(new Set());
      setItemVotes({});
      setPendingReviews([]);
      return;
    }
    const load = async () => {
      try {
        const [pRes, vRes, pendRes] = await Promise.all([
          axios.get(
            `${URL}/api/menu/purchased-dishes/${encodeURIComponent(gt)}`,
          ),
          axios.get(`${URL}/api/menu/my-votes/${encodeURIComponent(gt)}`),
          axios.get(
            `${URL}/api/menu/review-pending/${encodeURIComponent(gt)}`,
          ),
        ]);
        setPurchasedIds(new Set(pRes.data.menuItemIds || []));
        setItemVotes(vRes.data.votes || {});
        setPendingReviews(pendRes.data.pending || []);
      } catch {
        setPurchasedIds(new Set());
        setItemVotes({});
        setPendingReviews([]);
      }
    };
    load();
  }, [URL, location.pathname]);

  const categories = [
    "All",
    "Hot Drinks",
    "Cold Drinks",
    "Tea",
    "Arabic Coffee",
    "Desserts",
    "Snacks",
    "Cakes",
    "Others",
  ];

  const filteredItems =
    selectedCategory === "All"
      ? menuItems
      : menuItems.filter((item) => item.category === selectedCategory);

  const handleAdd = (item) => {
    setQuantities((prev) => ({
      ...prev,
      [item._id]: (prev[item._id] || 0) + 1,
    }));

    setCart((prevCart) => {
      const existing = prevCart.find((i) => i._id === item._id);
      if (existing) {
        return prevCart.map((i) =>
          i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  const handleVote = async (itemId, vote) => {
    const gt = localStorage.getItem("guestToken")?.trim();
    if (!gt) {
      alert("Place an order for this dish first—then you can like or unlike.");
      return;
    }
    if (!purchasedIds.has(String(itemId))) {
      alert("Only customers who ordered this dish can vote.");
      return;
    }
    if (voteBusy) return;
    setVoteBusy(itemId);
    try {
      const res = await axios.post(`${URL}/api/menu/vote`, {
        menuItemId: itemId,
        guestToken: gt,
        vote,
      });
      setItemVotes((prev) => ({ ...prev, [itemId]: vote }));
      setMenuItems((prev) =>
        prev.map((m) =>
          m._id === itemId
            ? {
                ...m,
                likeCount: res.data.likeCount,
                dislikeCount: res.data.dislikeCount,
              }
            : m,
        ),
      );
    } catch (e) {
      console.error(e);
      const msg =
        e.response?.data?.message ||
        "Could not save your vote. Try again.";
      alert(msg);
    } finally {
      setVoteBusy(null);
    }
  };

  const toggleComments = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    fetchMenus({ silent: true });
    if (!commentsByItem[id]) {
      try {
        const res = await axios.get(
          `${URL}/api/menu/comments/${id}?limit=15`,
        );
        setCommentsByItem((prev) => ({
          ...prev,
          [id]: res.data.comments || [],
        }));
      } catch (e) {
        console.error(e);
        setCommentsByItem((prev) => ({ ...prev, [id]: [] }));
      }
    }
  };

  const submitComment = async (e, menuItemId) => {
    e.preventDefault();
    const gt = localStorage.getItem("guestToken")?.trim();
    if (!gt) {
      alert("Place an order for this dish first—then you can comment.");
      return;
    }
    if (!purchasedIds.has(String(menuItemId))) {
      alert("Only customers who ordered this dish can comment.");
      return;
    }
    const name = commentName.trim();
    const text = commentText.trim();
    if (!name || !text) {
      alert("Add your name and a short comment.");
      return;
    }
    setCommentBusy(menuItemId);
    try {
      await axios.post(`${URL}/api/menu/comment`, {
        menuItemId,
        guestToken: gt,
        customerName: name,
        text,
      });
      setCommentText("");
      const res = await axios.get(
        `${URL}/api/menu/comments/${menuItemId}?limit=15`,
      );
      setCommentsByItem((prev) => ({
        ...prev,
        [menuItemId]: res.data.comments || [],
      }));
      setMenuItems((prev) =>
        prev.map((m) => {
          if (String(m._id) !== String(menuItemId)) return m;
          const commentCount = (m.commentCount || 0) + 1;
          return {
            ...m,
            commentCount,
            feedbackThreadCount:
              commentCount + (m.ratingCount || 0),
          };
        }),
      );
      fetchMenus({ silent: true });
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.message || "Could not post comment.";
      alert(msg);
    } finally {
      setCommentBusy(null);
    }
  };

  const setItemReviewField = (draftKey, patch) => {
    setItemReviewDraft((prev) => ({
      ...prev,
      [draftKey]: { ...prev[draftKey], ...patch },
    }));
  };

  const submitItemReview = async (menuItemId, orderId) => {
    const gt = localStorage.getItem("guestToken")?.trim();
    if (!gt) {
      alert("Sign in with your order session to leave a review.");
      return;
    }
    const dk = `${orderId}__${menuItemId}`;
    const d = itemReviewDraft[dk] || {};
    const rating = Number(d.rating) || 0;
    if (rating < 1 || rating > 5) {
      alert("Choose 1–5 stars for this dish.");
      return;
    }
    setItemReviewSubmitting(dk);
    try {
      const res = await axios.post(`${URL}/api/menu/order-review`, {
        menuItemId,
        orderId,
        guestToken: gt,
        rating,
        comment: (d.comment || "").trim(),
      });
      setPendingReviews((prev) =>
        prev.filter(
          (p) =>
            !(
              p.orderId === orderId &&
              p.menuItemId === String(menuItemId)
            ),
        ),
      );
      const avg = res.data.averageRating;
      const rc = res.data.ratingCount;
      if (avg != null || rc != null) {
        setMenuItems((prev) =>
          prev.map((m) => {
            if (String(m._id) !== String(menuItemId)) return m;
            const next = { ...m };
            if (avg != null) next.averageRating = avg;
            if (rc != null) {
              next.ratingCount = rc;
              next.feedbackThreadCount =
                rc + (next.commentCount ?? 0);
            }
            return next;
          }),
        );
      }
      fetchMenus({ silent: true });
      setItemReviewDraft((prev) => {
        const next = { ...prev };
        delete next[dk];
        return next;
      });
    } catch (err) {
      const msg = err.response?.data?.message || "Could not save review.";
      alert(msg);
    } finally {
      setItemReviewSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className="menu-list-container">
        <div className="menu-loading" role="status" aria-live="polite">
          <div className="menu-spinner" />
          <p>Preparing your menu…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="menu-list-container">
        <div className="menu-error" role="alert">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-list-container">
      {menuItems.length > 0 && (
        <nav className="menu-categories" aria-label="Filter menu by category">
          <div className="menu-category-pills" role="tablist">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={selectedCategory === cat}
                className={`menu-category-btn${
                  selectedCategory === cat ? " menu-category-btn--active" : ""
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </nav>
      )}

      <div className="menu-grid">
        {menuItems.length > 0 ? (
          filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const id = item._id;
            const sold = item.soldCount ?? 0;
            const likes = item.likeCount ?? 0;
            const dislikes = item.dislikeCount ?? 0;
            const commentsN = item.commentCount ?? 0;
            const reviewCount = item.ratingCount ?? 0;
            const feedbackThreadCount =
              item.feedbackThreadCount ?? commentsN + reviewCount;
            const avg = item.averageRating;
            const myVote = itemVotes[id];
            const canEngage = purchasedIds.has(String(id));
            const itemPending = pendingReviews.filter(
              (p) => p.menuItemId === String(id),
            );
            let pickOrderId = reviewOrderPick[id] || itemPending[0]?.orderId;
            if (
              itemPending.length &&
              pickOrderId &&
              !itemPending.some((p) => p.orderId === pickOrderId)
            ) {
              pickOrderId = itemPending[0].orderId;
            }
            const reviewDraftKey =
              pickOrderId && id ? `${pickOrderId}__${id}` : "";
            const reviewDraft = itemReviewDraft[reviewDraftKey] || {};

            return (
              <div className="menu-card" key={id}>
                <div className="menu-image-wrap">
                  <img
                    src={resolveAssetUrl(URL, item.image)}
                    alt={item.name}
                    className="menu-image"
                  />

                  {quantities[id] > 0 ? (
                    <div className="quantities-box">
                      <p
                        onClick={() => handleAdd(item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleAdd(item)
                        }
                      >
                        <IoAddCircleOutline />
                      </p>
                      {quantities[id]}
                      <p
                        onClick={() => handleRemove(id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleRemove(id)
                        }
                      >
                        <RxDividerHorizontal />
                      </p>
                    </div>
                  ) : (
                    <div className="adding-btn">
                      <p
                        onClick={() => handleAdd(item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleAdd(item)
                        }
                      >
                        <IoAddCircleOutline />
                      </p>
                    </div>
                  )}
                </div>

                <div className="menu-info">
                  <h4>{item.name}</h4>
                  <p>{item.description}</p>

                  <div className="menu-stats" aria-label="Popularity and feedback">
                    <span className="menu-stat" title="Times sold after orders are completed">
                      <FiShoppingBag aria-hidden />
                      <strong>{sold}</strong>
                    </span>
                    <span className="menu-stat menu-stat--likes" title="Likes from buyers">
                      <FaThumbsUp aria-hidden />
                      <strong>{likes}</strong>
                    </span>
                    <span
                      className="menu-stat menu-stat--dislikes"
                      title="Unlikes from buyers"
                    >
                      <FaThumbsDown aria-hidden />
                      <strong>{dislikes}</strong>
                    </span>
                    <span
                      className="menu-stat menu-stat--rating"
                      title={`Average ${avg != null ? avg : "—"} from ${reviewCount} star review${reviewCount === 1 ? "" : "s"} (after completed orders)`}
                    >
                      <span className="menu-stat-rating-star" aria-hidden>
                        ★
                      </span>
                      <strong>{avg != null ? avg : "—"}</strong>
                      <span className="menu-stat-rating-sep" aria-hidden>
                        ·
                      </span>
                      <strong>{reviewCount}</strong>
                    </span>
                    <span
                      className="menu-stat"
                      title="Short comments left by buyers on the menu"
                    >
                      <FiMessageCircle aria-hidden />
                      <strong>{commentsN}</strong>
                    </span>
                  </div>

                  {canEngage && (
                    <div className="menu-vote-row">
                      <button
                        type="button"
                        className={`menu-vote-btn ${myVote === "like" ? "is-on" : ""}`}
                        disabled={voteBusy === id}
                        onClick={() => handleVote(id, "like")}
                        aria-pressed={myVote === "like"}
                      >
                        <FaThumbsUp aria-hidden /> Like
                      </button>
                      <button
                        type="button"
                        className={`menu-vote-btn menu-vote-btn--down ${myVote === "dislike" ? "is-on" : ""}`}
                        disabled={voteBusy === id}
                        onClick={() => handleVote(id, "dislike")}
                        aria-pressed={myVote === "dislike"}
                      >
                        <FaThumbsDown aria-hidden /> Unlike
                      </button>
                    </div>
                  )}

                  {canEngage &&
                    itemPending.length > 0 &&
                    pickOrderId &&
                    reviewDraftKey && (
                      <div className="menu-item-review">
                        <p className="menu-item-review-title">
                          Review this dish
                        </p>
                        <p className="menu-item-review-sub">
                          1–5 stars count toward the menu average. One review per
                          order.
                        </p>
                        {itemPending.length > 1 && (
                          <label className="menu-review-order-pick">
                            <span>Order</span>
                            <select
                              value={pickOrderId}
                              onChange={(e) =>
                                setReviewOrderPick((prev) => ({
                                  ...prev,
                                  [id]: e.target.value,
                                }))
                              }
                            >
                              {itemPending.map((p) => (
                                <option key={p.orderId} value={p.orderId}>
                                  {new Date(p.createdAt).toLocaleString()}
                                  {p.itemName ? ` · ${p.itemName}` : ""}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <div
                          className="menu-item-review-stars"
                          role="group"
                          aria-label="Star rating"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              className={
                                (reviewDraft.rating || 0) >= n ? "is-on" : ""
                              }
                              onClick={() =>
                                setItemReviewField(reviewDraftKey, {
                                  rating: n,
                                })
                              }
                              aria-label={`${n} stars`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <textarea
                          className="menu-item-review-textarea"
                          rows={2}
                          maxLength={800}
                          placeholder="Optional: how was it?"
                          value={reviewDraft.comment || ""}
                          onChange={(e) =>
                            setItemReviewField(reviewDraftKey, {
                              comment: e.target.value,
                            })
                          }
                        />
                        <button
                          type="button"
                          className="menu-item-review-submit"
                          disabled={
                            itemReviewSubmitting === reviewDraftKey
                          }
                          onClick={() =>
                            submitItemReview(id, pickOrderId)
                          }
                        >
                          {itemReviewSubmitting === reviewDraftKey
                            ? "Saving…"
                            : "Submit review"}
                        </button>
                      </div>
                    )}

                  <button
                    type="button"
                    className="menu-comments-toggle"
                    onClick={() => toggleComments(id)}
                    aria-expanded={expandedId === id}
                    title={`${reviewCount} star reviews, ${commentsN} short notes (${feedbackThreadCount} total)`}
                  >
                    <FiMessageCircle
                      aria-hidden
                      className="menu-comments-toggle-icon"
                    />
                    <span className="menu-comments-toggle-inner">
                      <span className="menu-comments-toggle-line1">
                        {expandedId === id ? "Hide" : "Open"} feedback
                        <strong className="menu-comments-total">
                          {" "}
                          ({feedbackThreadCount})
                        </strong>
                      </span>
                      <span className="menu-comments-toggle-line2">
                        {reviewCount} star rating
                        {reviewCount === 1 ? "" : "s"} · {commentsN} note
                        {commentsN === 1 ? "" : "s"}
                      </span>
                    </span>
                  </button>

                  {expandedId === id && (
                    <div className="menu-comments-panel">
                      <ul className="menu-comment-list">
                        {(commentsByItem[id] || []).length === 0 ? (
                          <li className="menu-comment-empty">
                            {canEngage
                              ? "No comments yet—be the first."
                              : "No comments yet."}
                          </li>
                        ) : (
                          (commentsByItem[id] || []).map((c) => (
                            <li key={`${c.kind}-${c._id}`} className="menu-comment-item">
                              <div className="menu-comment-meta">
                                <strong>{c.customerName}</strong>
                                {c.rating != null && (
                                  <span className="menu-comment-stars">
                                    {"★".repeat(c.rating)}
                                    {"☆".repeat(5 - c.rating)}
                                  </span>
                                )}
                                <time dateTime={c.createdAt}>
                                  {new Date(c.createdAt).toLocaleDateString()}
                                </time>
                              </div>
                              <p>{c.text || "—"}</p>
                              {c.kind === "review" && (
                                <span className="menu-comment-badge">Order review</span>
                              )}
                            </li>
                          ))
                        )}
                      </ul>
                      {canEngage ? (
                        <form
                          className="menu-comment-form"
                          onSubmit={(e) => submitComment(e, id)}
                        >
                          <p className="menu-comment-hint">
                            Your note is visible to everyone browsing the menu
                          </p>
                          <input
                            type="text"
                            placeholder="Your name"
                            value={commentName}
                            onChange={(e) => setCommentName(e.target.value)}
                            maxLength={80}
                            className="menu-comment-input"
                          />
                          <textarea
                            placeholder="Was it good? Anything others should know?"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            maxLength={500}
                            rows={2}
                            className="menu-comment-textarea"
                          />
                          <button
                            type="submit"
                            className="menu-comment-submit"
                            disabled={commentBusy === id}
                          >
                            Post comment
                          </button>
                        </form>
                      ) : (
                        <p className="menu-comment-locked">
                          Comments are only for guests who ordered this dish on
                          this device.
                        </p>
                      )}
                    </div>
                  )}

                  <p className="menu-price">SAR {item.price}</p>
                  <span className="menu-category">{item.category}</span>
                </div>
              </div>
            );
          })
          ) : (
            <p className="menu-empty">No items in this category.</p>
          )
        ) : (
          <p className="menu-empty">No menu items yet.</p>
        )}
      </div>
    </div>
  );
};

export default MenuList;
