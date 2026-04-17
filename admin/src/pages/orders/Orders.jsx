import React from "react";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import axios from "axios";
import {
  FaClock,
  FaUser,
  FaThumbsUp,
  FaThumbsDown,
  FaStar,
  FaMessage,
} from "react-icons/fa6";
import { MdOutlineTableRestaurant } from "react-icons/md";
import { HiOutlineTrash } from "react-icons/hi";

import "./Orders.css";

function normalizeStatusKey(status) {
  const s = String(status || "").toLowerCase();
  if (/(finish|done|complete|served)/.test(s)) return "done";
  if (s.includes("ready")) return "ready";
  if (/(cok|cook)/.test(s)) return "cooking";
  if (/(pending|new|placed|received)/.test(s)) return "pending";
  return "default";
}

function lineHasEngagement(line) {
  return !!(
    line.customerVote ||
    line.review ||
    line.guestNote ||
    (line.menuLikes || 0) > 0 ||
    (line.menuDislikes || 0) > 0 ||
    line.avgRating != null
  );
}

function fmtWhen(d) {
  if (!d) return "";
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? "" : t.toLocaleString();
}

function avatarLetter(name) {
  const s = (name || "?").trim();
  return (s[0] || "?").toUpperCase();
}

const Orders = () => {
  const { admin, URL } = useContext(AuthContext);

  const [allOrderList, setAllOrderList] = useState([]);
  /** Which FB-style threads are expanded: key → boolean */
  const [fbOpen, setFbOpen] = useState({});

  const fetchAllTimeOrder = async () => {
    try {
      let res;
      if (admin.role === "admin") {
        res = await axios.get(`${URL}/api/order/all-orders`);
        setAllOrderList(res.data.orders);
      } else {
        res = await axios.get(`${URL}/api/order/active-orders`);
        setAllOrderList(res.data.activeOrders);
      }

      console.log(res.data);
    } catch (error) {
      console.error("faild to fetch all order", error);
    }
  };

  const deleteHandler = async (id) => {
    try {
      const res = await axios.delete(`${URL}/api/order/delete-order/${id}`);

      alert(res.data.message);

      setAllOrderList((prev) => prev.filter((order) => order._id !== id));
    } catch (error) {
      console.error("Error deleting order: ", error);
      alert("failed to delete order");
    }
  };

  useEffect(() => {
    fetchAllTimeOrder();
  }, []);

  console.log("all list", allOrderList);
  return (
    <div className="orders-page">
      <div className="orders-container">
        <div className="orders-header">
          <h3 className="orders-title">All orders</h3>
          <span className="orders-count">{allOrderList.length}</span>
        </div>

        {allOrderList.length === 0 ? (
          <p className="orders-empty">No orders yet.</p>
        ) : (
          <div className="orders-list">
            <p className="orders-subline">
              Showing {allOrderList.length} order
              {allOrderList.length !== 1 ? "s" : ""}
            </p>

            {allOrderList.map((order) => {
              const statusKey = normalizeStatusKey(order.status);
              const engLines =
                order.engagement?.items?.filter(lineHasEngagement) ?? [];
              return (
                <article
                  key={order._id}
                  className="order-card"
                  data-status={statusKey}
                >
                  <header className="order-card__head">
                    <div className="order-card__id-block">
                      <span className="order-card__id-label">Today&apos;s order</span>
                      <span className="order-card__id">
                        #
                        {order.dailyOrderNumber != null
                          ? order.dailyOrderNumber
                          : order._id.slice(-6).toUpperCase()}
                      </span>
                      {order.businessDay ? (
                        <span className="order-card__bizday">
                          Day {order.businessDay}
                        </span>
                      ) : null}
                      <span className="order-card__id-label order-card__id-label--invoice">
                        Invoice
                      </span>
                      <span className="order-card__invoice-serial">
                        {order.invoiceSerial || "—"}
                      </span>
                    </div>
                    <span
                      className={`order-status order-status--${statusKey}`}
                    >
                      {order.status}
                    </span>
                  </header>

                  <div className="order-card__chips">
                    <span className="order-chip">
                      <FaUser aria-hidden className="order-chip__icon" />
                      <span className="order-chip__text">
                        {order.customerName || "Guest"}
                      </span>
                    </span>
                    <span className="order-chip order-chip--accent">
                      <MdOutlineTableRestaurant
                        aria-hidden
                        className="order-chip__icon"
                      />
                      <span className="order-chip__text">
                        Table {order.tableId}
                      </span>
                    </span>
                  </div>

                  <div className="order-card__total">
                    <span className="order-card__total-label">Total</span>
                    <div className="order-card__total-value">
                      <span className="order-card__amount">
                        {Number(order.totalPrice).toLocaleString()}
                      </span>
                      <span className="order-card__currency">SAR</span>
                    </div>
                  </div>

                  <div className="order-items">
                    <div className="order-items__head">Line items</div>
                    <ul className="order-items__list">
                      {order.items.map((item, i) => (
                        <li key={i} className="order-line">
                          <span className="order-line__name">{item.name}</span>
                          <span className="order-line__qty">
                            {item.quantity} × {item.price}
                          </span>
                          <span className="order-line__sum">
                            {item.quantity * item.price}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {admin.role === "admin" && engLines.length > 0 && (
                    <div className="order-engagement">
                      <div className="order-engagement__head">Guest feedback</div>
                      <ul className="order-engagement__list">
                        {engLines.map((line, idx) => (
                          <li
                            key={`${order._id}-${line.menuItemId}-${idx}`}
                            className="order-engagement__line"
                          >
                            <div className="order-engagement__dish">
                              {line.dishName}
                            </div>
                            <div className="order-engagement__stats">
                              <span
                                className="order-engagement__stat"
                                title="Likes on menu"
                              >
                                <FaThumbsUp aria-hidden />
                                {line.menuLikes ?? 0}
                              </span>
                              <span
                                className="order-engagement__stat"
                                title="Unlikes on menu"
                              >
                                <FaThumbsDown aria-hidden />
                                {line.menuDislikes ?? 0}
                              </span>
                              {line.avgRating != null && (
                                <span
                                  className="order-engagement__stat order-engagement__stat--rating"
                                  title="Average star rating (menu)"
                                >
                                  <FaStar aria-hidden />
                                  {line.avgRating}
                                </span>
                              )}
                              {line.customerVote && (
                                <span
                                  className={`order-engagement__vote order-engagement__vote--${line.customerVote}`}
                                >
                                  Guest:{" "}
                                  {line.customerVote === "like" ? "Liked" : "Unliked"}
                                </span>
                              )}
                            </div>
                            {line.review && (() => {
                              const rk = `rv-${order._id}-${idx}`;
                              const open = !!fbOpen[rk];
                              return (
                                <div className="fb-eng-thread">
                                  <button
                                    type="button"
                                    className="fb-eng-toggle"
                                    aria-expanded={open}
                                    onClick={() =>
                                      setFbOpen((p) => ({
                                        ...p,
                                        [rk]: !p[rk],
                                      }))
                                    }
                                  >
                                    <span
                                      className={`fb-eng-toggle__chev${open ? " fb-eng-toggle__chev--open" : ""}`}
                                      aria-hidden
                                    />
                                    <FaStar
                                      className="fb-eng-toggle__star"
                                      aria-hidden
                                    />
                                    <span className="fb-eng-toggle__label">
                                      Star review ·{" "}
                                      <strong>{line.review.customerName}</strong>
                                      <span className="fb-eng-toggle__stars-inline">
                                        {" "}
                                        {"★".repeat(line.review.rating)}
                                        {"☆".repeat(5 - line.review.rating)}
                                      </span>
                                    </span>
                                  </button>
                                  {open && (
                                    <div className="fb-comment">
                                      <div
                                        className="fb-comment__avatar"
                                        aria-hidden
                                      >
                                        {avatarLetter(line.review.customerName)}
                                      </div>
                                      <div className="fb-comment__col">
                                        <div className="fb-comment__bubble">
                                          <div className="fb-comment__bubble-head">
                                            <strong>
                                              {line.review.customerName}
                                            </strong>
                                            <span className="fb-comment__stars">
                                              {"★".repeat(line.review.rating)}
                                              {"☆".repeat(
                                                5 - line.review.rating,
                                              )}
                                            </span>
                                          </div>
                                          {line.review.comment ? (
                                            <p className="fb-comment__text">
                                              {line.review.comment}
                                            </p>
                                          ) : (
                                            <p className="fb-comment__text fb-comment__text--muted">
                                              No written comment.
                                            </p>
                                          )}
                                        </div>
                                        <div className="fb-comment__meta">
                                          <time
                                            dateTime={line.review.createdAt}
                                          >
                                            {fmtWhen(line.review.createdAt)}
                                          </time>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            {line.guestNote && (() => {
                              const nk = `nt-${order._id}-${idx}`;
                              const open = !!fbOpen[nk];
                              return (
                                <div className="fb-eng-thread">
                                  <button
                                    type="button"
                                    className="fb-eng-toggle"
                                    aria-expanded={open}
                                    onClick={() =>
                                      setFbOpen((p) => ({
                                        ...p,
                                        [nk]: !p[nk],
                                      }))
                                    }
                                  >
                                    <span
                                      className={`fb-eng-toggle__chev${open ? " fb-eng-toggle__chev--open" : ""}`}
                                      aria-hidden
                                    />
                                    <FaMessage
                                      className="fb-eng-toggle__msg"
                                      aria-hidden
                                    />
                                    <span className="fb-eng-toggle__label">
                                      Guest note ·{" "}
                                      <strong>{line.guestNote.customerName}</strong>
                                    </span>
                                  </button>
                                  {open && (
                                    <div className="fb-comment">
                                      <div
                                        className="fb-comment__avatar"
                                        aria-hidden
                                      >
                                        {avatarLetter(line.guestNote.customerName)}
                                      </div>
                                      <div className="fb-comment__col">
                                        <div className="fb-comment__bubble fb-comment__bubble--note">
                                          <div className="fb-comment__bubble-head">
                                            <strong>
                                              {line.guestNote.customerName}
                                            </strong>
                                          </div>
                                          <p className="fb-comment__text">
                                            {line.guestNote.text}
                                          </p>
                                        </div>
                                        <div className="fb-comment__meta">
                                          <time
                                            dateTime={line.guestNote.createdAt}
                                          >
                                            {fmtWhen(line.guestNote.createdAt)}
                                          </time>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <footer className="order-card__foot">
                    <span className="order-date">
                      <FaClock aria-hidden className="order-date__icon" />
                      {new Date(order.createdAt).toLocaleString()}
                    </span>
                    {admin.role === "admin" && (
                      <button
                        type="button"
                        onClick={() => deleteHandler(order._id)}
                        className="admin-btn-danger"
                        aria-label="Delete order"
                      >
                        <HiOutlineTrash aria-hidden />
                        Remove
                      </button>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
