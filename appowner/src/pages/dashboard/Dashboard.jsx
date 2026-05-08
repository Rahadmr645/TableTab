import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../utils/apiBaseUrl.js";
import OwnerTopbar from "../../components/owner/OwnerTopbar.jsx";
import {
  KpiCard,
  IconBuilding,
  IconCheck,
  IconTrial,
  IconAlert,
  nf,
} from "../owner/ownerKpi.jsx";
import "./Dashboard.css";

function subscriptionBadgeClass(status) {
  const st = String(status || "").toLowerCase();
  if (st === "active") return "text-bg-success";
  if (st === "trial") return "text-bg-warning text-dark";
  if (st === "expired") return "text-bg-secondary";
  return "text-bg-dark border border-secondary";
}

function rowStatusBadgeClass(raw) {
  const st = String(raw || "").toLowerCase();
  if (st === "active" || st === "paid" || st === "completed") return "text-bg-success";
  if (st === "pending" || st === "trial") return "text-bg-warning text-dark";
  if (st === "cancelled" || st === "expired" || st === "failed") return "text-bg-danger";
  return "text-bg-secondary";
}

function subscriptionRowTenantId(row) {
  const tid = row?.tenantId;
  if (!tid) return null;
  if (typeof tid === "object" && tid._id != null) return String(tid._id);
  return String(tid);
}

function DashboardSkeleton() {
  return (
    <div className="po-skeleton-wrap" aria-busy="true" aria-label="Loading dashboard">
      <div className="po-skeleton po-skeleton--title" />
      <div className="po-skeleton po-skeleton--sub" />
      <div className="po-kpi-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`p-${i}`} className="po-skeleton po-skeleton--kpi" />
        ))}
      </div>
      <div className="po-skeleton po-skeleton--bar" />
      <div className="po-skeleton po-skeleton--panel" />
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("platformToken");
        const url = `${API_BASE_URL}/api/platform/dashboard`;
        const res = await axios.get(url, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });
        if (!cancelled) {
          setData(res.data);
          setRefreshedAt(new Date());
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err.response?.data?.message ||
            err.message ||
            "Could not load dashboard.";
          setError(msg);
          if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.removeItem("platformToken");
            navigate("/login", { replace: true });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("platformToken");
    navigate("/login", { replace: true });
  };

  const s = data?.summary;

  const mix = useMemo(() => {
    if (!s) return { active: 0, trial: 0, expired: 0, total: 0, pct: { a: 0, t: 0, e: 0 } };
    const active = s.activeTenants ?? 0;
    const trial = s.trialTenants ?? 0;
    const expired = s.expiredTenants ?? 0;
    const total = active + trial + expired;
    if (total <= 0) {
      return { active, trial, expired, total: 0, pct: { a: 0, t: 0, e: 0 } };
    }
    return {
      active,
      trial,
      expired,
      total,
      pct: {
        a: (active / total) * 100,
        t: (trial / total) * 100,
        e: (expired / total) * 100,
      },
    };
  }, [s]);

  const tenantTotal = s?.tenantCount ?? 0;
  const activeShare =
    tenantTotal > 0 && s?.activeTenants != null
      ? `${Math.round((s.activeTenants / tenantTotal) * 100)}% of all restaurants`
      : "No tenants yet";

  return (
    <div className="po-owner-page">
      <OwnerTopbar onLogout={logout} />

      <main className="po-main">
        <div className="po-page-head">
          <div>
            <h1 className="po-page-title">Owner console</h1>
            <p className="po-page-lead">
              Platform-wide tenants and billing. Open a restaurant to see its orders, staff, and
              customers on a dedicated page.
            </p>
          </div>
          {refreshedAt ? (
            <div className="po-refresh-meta">
              <span className="po-refresh-label">Last updated</span>
              <time dateTime={refreshedAt.toISOString()} className="po-refresh-time">
                {refreshedAt.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
            </div>
          ) : null}
        </div>

        {loading && !data ? (
          <DashboardSkeleton />
        ) : error && !data ? (
          <div className="alert alert-danger po-alert">{error}</div>
        ) : (
          <>
            {error ? <div className="alert alert-warning po-alert po-alert--inline">{error}</div> : null}

            <section className="po-section" aria-labelledby="po-metrics-heading">
              <h2 id="po-metrics-heading" className="po-section-title">
                Platform metrics
              </h2>
              <p className="po-section-desc">
                Aggregated counts across every tenant on the network. Per-restaurant orders and
                accounts are not shown here—use{" "}
                <strong className="po-inline-strong">View usage</strong> in the directory.
              </p>
              <div className="po-kpi-grid po-kpi-grid--platform">
                <KpiCard
                  accent="cyan"
                  icon={<IconBuilding />}
                  label="Restaurants"
                  value={nf.format(s?.tenantCount ?? 0)}
                  hint="Registered tenants"
                />
                <KpiCard
                  accent="green"
                  icon={<IconCheck />}
                  label="Active subscription"
                  value={nf.format(s?.activeTenants ?? 0)}
                  hint={activeShare}
                />
                <KpiCard
                  accent="amber"
                  icon={<IconTrial />}
                  label="Trial"
                  value={nf.format(s?.trialTenants ?? 0)}
                  hint="Not yet on a paid plan"
                />
                <KpiCard
                  accent="rose"
                  icon={<IconAlert />}
                  label="Expired"
                  value={nf.format(s?.expiredTenants ?? 0)}
                  hint="Needs renewal or follow-up"
                />
              </div>
            </section>

            <section className="po-section po-mix-section" aria-labelledby="po-mix-heading">
              <div className="po-mix-head">
                <div>
                  <h2 id="po-mix-heading" className="po-section-title po-section-title--sm">
                    Subscription mix
                  </h2>
                  <p className="po-section-desc po-section-desc--tight">
                    How current tenants are distributed by subscription state (not plan tier).
                  </p>
                </div>
                <div className="po-mix-legend">
                  <span className="po-mix-legend-item">
                    <i className="po-dot po-dot--active" /> Active {nf.format(mix.active)}
                  </span>
                  <span className="po-mix-legend-item">
                    <i className="po-dot po-dot--trial" /> Trial {nf.format(mix.trial)}
                  </span>
                  <span className="po-mix-legend-item">
                    <i className="po-dot po-dot--expired" /> Expired {nf.format(mix.expired)}
                  </span>
                </div>
              </div>
              <div
                className="po-mix-bar"
                role="img"
                aria-label={`Subscription mix: ${mix.active} active, ${mix.trial} trial, ${mix.expired} expired`}
              >
                {mix.total > 0 ? (
                  <>
                    <span
                      className="po-mix-seg po-mix-seg--active"
                      style={{ width: `${mix.pct.a}%` }}
                    />
                    <span
                      className="po-mix-seg po-mix-seg--trial"
                      style={{ width: `${mix.pct.t}%` }}
                    />
                    <span
                      className="po-mix-seg po-mix-seg--expired"
                      style={{ width: `${mix.pct.e}%` }}
                    />
                  </>
                ) : (
                  <span className="po-mix-empty">No subscription-state data to chart yet.</span>
                )}
              </div>
            </section>

            <div className="po-panels-grid">
              <section className="po-panel" aria-labelledby="po-subs-heading">
                <div className="po-panel-head">
                  <h2 id="po-subs-heading" className="po-panel-title">
                    Subscription periods
                  </h2>
                  <p className="po-panel-desc">
                    Recent subscription rows. Click a row to open that restaurant&apos;s usage page.
                  </p>
                </div>
                <div className="table-responsive po-table-scroll">
                  <table className="table table-dark table-hover table-sm align-middle po-table">
                    <thead>
                      <tr>
                        <th>Plan</th>
                        <th>Status</th>
                        <th className="text-end">Price</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Restaurant</th>
                        <th className="text-end po-th-actions">Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.subscriptions || []).map((row) => {
                        const tid = subscriptionRowTenantId(row);
                        return (
                          <tr
                            key={row._id}
                            className={`po-data-row ${tid ? "po-data-row--click" : ""}`}
                            tabIndex={tid ? 0 : undefined}
                            role={tid ? "button" : undefined}
                            aria-label={tid ? `Open usage for ${row.tenantId?.businessName || "restaurant"}` : undefined}
                            onClick={() => tid && navigate(`/tenant/${tid}`)}
                            onKeyDown={(e) => {
                              if (!tid || (e.key !== "Enter" && e.key !== " ")) return;
                              e.preventDefault();
                              navigate(`/tenant/${tid}`);
                            }}
                          >
                            <td className="text-nowrap">{row.plan}</td>
                            <td>
                              <span className={`badge rounded-pill ${rowStatusBadgeClass(row.status)}`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="text-end font-monospace">{row.price}</td>
                            <td className="text-nowrap small">
                              {row.startDate ? new Date(row.startDate).toLocaleString() : "—"}
                            </td>
                            <td className="text-nowrap small">
                              {row.endDate ? new Date(row.endDate).toLocaleString() : "—"}
                            </td>
                            <td>
                              <div className="po-cell-title">{row.tenantId?.businessName || "—"}</div>
                              <div className="po-cell-sub">{row.tenantId?.slug || "—"}</div>
                            </td>
                            <td className="text-end" onClick={(e) => e.stopPropagation()}>
                              {tid ? (
                                <Link to={`/tenant/${tid}`} className="po-link-usage">
                                  Usage
                                </Link>
                              ) : (
                                <span className="po-muted small">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {!data?.subscriptions?.length ? (
                  <p className="po-empty-note">No subscription rows yet.</p>
                ) : null}
              </section>

              <section className="po-panel" aria-labelledby="po-tenants-heading">
                <div className="po-panel-head">
                  <h2 id="po-tenants-heading" className="po-panel-title">
                    Restaurants directory
                  </h2>
                  <p className="po-panel-desc">
                    All tenants (newest first). Click a row or <strong className="po-inline-strong">Usage</strong>{" "}
                    to open that restaurant&apos;s dedicated page (orders, staff, customers).
                  </p>
                </div>
                <div className="table-responsive po-table-scroll">
                  <table className="table table-dark table-hover table-sm align-middle po-table">
                    <thead>
                      <tr>
                        <th>Restaurant</th>
                        <th>Slug</th>
                        <th>Plan</th>
                        <th>Subscription</th>
                        <th>Expires</th>
                        <th>Owner email</th>
                        <th className="text-end po-th-actions">Usage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.tenants || []).map((t) => (
                        <tr
                          key={t._id}
                          className="po-data-row po-data-row--click"
                          tabIndex={0}
                          role="button"
                          aria-label={`Open usage for ${t.businessName}`}
                          onClick={() => navigate(`/tenant/${t._id}`)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              navigate(`/tenant/${t._id}`);
                            }
                          }}
                        >
                          <td className="fw-medium">{t.businessName}</td>
                          <td>
                            <code className="po-code">{t.slug}</code>
                          </td>
                          <td>{t.plan}</td>
                          <td>
                            <span
                              className={`badge rounded-pill ${subscriptionBadgeClass(t.subscriptionStatus)}`}
                            >
                              {t.subscriptionStatus}
                            </span>
                          </td>
                          <td className="text-nowrap small">
                            {t.expiresAt ? new Date(t.expiresAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="small">{t.ownerId?.email || "—"}</td>
                          <td className="text-end" onClick={(e) => e.stopPropagation()}>
                            <Link to={`/tenant/${t._id}`} className="po-link-usage">
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!data?.tenants?.length ? (
                  <p className="po-empty-note">No tenants yet.</p>
                ) : null}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
