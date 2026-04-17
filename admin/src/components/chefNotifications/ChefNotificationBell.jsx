import React, { useEffect, useRef, useState } from "react";
import { FaBell } from "react-icons/fa";
import {
  getChefNotificationsSnapshot,
  markAllChefNotificationsRead,
  subscribeChefNotifications,
} from "../../utils/chefNotificationStore.js";
import "./ChefNotificationBell.css";

function formatWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function ChefNotificationBell() {
  const [snap, setSnap] = useState(() => getChefNotificationsSnapshot());
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    return subscribeChefNotifications(() => {
      setSnap(getChefNotificationsSnapshot());
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setSnap(getChefNotificationsSnapshot());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      markAllChefNotificationsRead();
      setSnap(getChefNotificationsSnapshot());
    }
  };

  const { items, unreadCount } = snap;
  const badge =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <div className="chef-notify" ref={wrapRef}>
      <button
        type="button"
        className="chef-notify__trigger"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-label={
          badge
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
      >
        <FaBell className="chef-notify__icon" aria-hidden />
        {badge ? (
          <span className="chef-notify__badge">{badge}</span>
        ) : null}
      </button>

      {open ? (
        <div className="chef-notify__panel" role="dialog" aria-label="Order notifications">
          <div className="chef-notify__head">
            <span>Notifications</span>
            <span className="chef-notify__hint">Kept 24 hours</span>
          </div>
          {items.length === 0 ? (
            <p className="chef-notify__empty">No notifications yet.</p>
          ) : (
            <ul className="chef-notify__list">
              {items.map((n) => (
                <li key={n.id}>
                  <div
                    className={`chef-notify__row ${n.readAt ? "is-read" : ""}`}
                  >
                    <span className="chef-notify__title">{n.title}</span>
                    <span className="chef-notify__body">{n.body}</span>
                    <time className="chef-notify__time" dateTime={n.createdAt}>
                      {formatWhen(n.createdAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
