import React, { useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import {
  FaChartLine,
  FaReceipt,
  FaClock,
  FaBowlFood,
  FaThumbsUp,
  FaThumbsDown,
  FaStar,
  FaBagShopping,
} from "react-icons/fa6";
import "./Summary.css";

const fmtMoney = (n) => {
  const x = Number(n) || 0;
  return x.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const Summary = () => {
  const { admin, URL } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${URL}/api/order/summary-stats`);
      setData(res.data);
    } catch (e) {
      console.error(e);
      setError(
        e.response?.data?.message ||
          e.message ||
          "Could not load summary.",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [URL]);

  useEffect(() => {
    if (admin?.role === "admin") load();
    else {
      setLoading(false);
      setData(null);
      setError(null);
    }
  }, [admin, load]);

  if (!admin || admin.role !== "admin") {
    return (
      <div className="summary-page">
        <div className="summary-container summary-container--narrow">
          <p className="summary-gate">
            Summary is available to administrators only.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="summary-page">
        <div className="summary-container summary-container--narrow">
          <p className="summary-loading" role="status">
            Loading summary…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="summary-page">
        <div className="summary-container">
          <div className="summary-error" role="alert">
            <p>{error}</p>
            <button type="button" className="summary-retry" onClick={load}>
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const o = data?.orders || {};
  const m = data?.menu || {};

  return (
    <div className="summary-page">
      <div className="summary-container">
        <header className="summary-header">
          <div className="summary-title-row">
            <FaChartLine className="summary-title-icon" aria-hidden />
            <div>
              <h1 className="summary-title">Summary</h1>
              <p className="summary-sub">
                Orders, revenue, and menu engagement at a glance.
              </p>
            </div>
          </div>
          <button type="button" className="summary-refresh" onClick={load}>
            Refresh
          </button>
        </header>

        <section className="summary-grid" aria-label="Key metrics">
          <article className="summary-card">
            <FaReceipt className="summary-card-icon" aria-hidden />
            <span className="summary-card-label">Total orders</span>
            <strong className="summary-card-value">{o.total ?? 0}</strong>
          </article>
          <article className="summary-card summary-card--accent">
            <span className="summary-card-currency">SAR</span>
            <span className="summary-card-label">Total revenue</span>
            <strong className="summary-card-value">{fmtMoney(o.revenue)}</strong>
          </article>
          <article className="summary-card">
            <FaClock className="summary-card-icon" aria-hidden />
            <span className="summary-card-label">Orders (last 7 days)</span>
            <strong className="summary-card-value">{o.last7Days ?? 0}</strong>
          </article>
          <article className="summary-card">
            <FaBagShopping className="summary-card-icon" aria-hidden />
            <span className="summary-card-label">Active orders</span>
            <strong className="summary-card-value">{o.active ?? 0}</strong>
          </article>
          <article className="summary-card">
            <FaBowlFood className="summary-card-icon" aria-hidden />
            <span className="summary-card-label">Menu items</span>
            <strong className="summary-card-value">{m.items ?? 0}</strong>
          </article>
          <article className="summary-card">
            <FaChartLine className="summary-card-icon" aria-hidden />
            <span className="summary-card-label">Units sold (menu)</span>
            <strong className="summary-card-value">{m.unitsSold ?? 0}</strong>
          </article>
          <article className="summary-card summary-card--likes">
            <FaThumbsUp className="summary-card-icon" aria-hidden />
            <span className="summary-card-label">Total likes</span>
            <strong className="summary-card-value">{m.likes ?? 0}</strong>
          </article>
          <article className="summary-card summary-card--dislikes">
            <FaThumbsDown className="summary-card-icon" aria-hidden />
            <span className="summary-card-label">Total unlikes</span>
            <strong className="summary-card-value">{m.dislikes ?? 0}</strong>
          </article>
          <article className="summary-card summary-card--stars">
            <FaStar className="summary-card-icon" aria-hidden />
            <span className="summary-card-label">Avg. dish rating</span>
            <strong className="summary-card-value">
              {m.averageRating != null ? m.averageRating : "—"}
            </strong>
            <span className="summary-card-hint">
              {m.totalRatings ?? 0} rating{(m.totalRatings || 0) === 1 ? "" : "s"}
            </span>
          </article>
        </section>

        {(o.byStatus?.length ?? 0) > 0 && (
          <section className="summary-status" aria-label="Orders by status">
            <h2 className="summary-section-title">Orders by status</h2>
            <ul className="summary-status-list">
              {o.byStatus.map((row) => (
                <li key={String(row.status)} className="summary-status-row">
                  <span className="summary-status-name">{row.status}</span>
                  <span className="summary-status-count">{row.count}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

export default Summary;
