import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../utils/apiBaseUrl.js";
import OwnerTopbar from "../../components/owner/OwnerTopbar.jsx";
import {
  KpiCard,
  IconCart,
  IconUsers,
  IconUserCircle,
  nf,
} from "../owner/ownerKpi.jsx";
import "../dashboard/Dashboard.css";
import "./TenantUsagePage.css";

function isLikelyMongoId(s) {
  return /^[a-f\d]{24}$/i.test(String(s || "").trim());
}

export default function TenantUsagePage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const idOk = isLikelyMongoId(tenantId);

  useEffect(() => {
    if (!idOk) {
      setLoading(false);
      setError("Invalid restaurant id.");
      setData(null);
      return;
    }

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
          params: { tenantId: String(tenantId).trim() },
        });
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) {
          const msg =
            err.response?.data?.message ||
            err.message ||
            "Could not load this restaurant.";
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
  }, [navigate, tenantId, idOk]);

  const logout = () => {
    localStorage.removeItem("platformToken");
    navigate("/login", { replace: true });
  };

  const s = data?.summary;
  const focus = data?.tenantUsageFocus;
  const tenantRow = useMemo(() => {
    if (!data?.tenants || !focus?.tenantId) return null;
    return data.tenants.find((t) => String(t._id) === String(focus.tenantId)) || null;
  }, [data?.tenants, focus?.tenantId]);

  const ready = Boolean(focus && String(focus.tenantId) === String(tenantId));

  return (
    <div className="po-owner-page">
      <OwnerTopbar onLogout={logout} />

      <main className="po-main">
        <nav className="po-tenant-nav" aria-label="Breadcrumb">
          <Link to="/" className="po-tenant-back">
            ← Owner console
          </Link>
        </nav>

        {loading ? (
          <div className="po-tenant-skeleton" aria-busy="true" aria-label="Loading restaurant">
            <div className="po-skeleton po-skeleton--title" />
            <div className="po-skeleton po-skeleton--sub" />
            <div className="po-kpi-grid po-kpi-grid--usage">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="po-skeleton po-skeleton--kpi" />
              ))}
            </div>
          </div>
        ) : error || !ready ? (
          <div className="po-tenant-error">
            <h1 className="po-page-title">Restaurant</h1>
            <p className="po-muted">{error || "Restaurant data is unavailable."}</p>
            <Link to="/" className="po-tenant-back po-tenant-back--btn">
              Back to directory
            </Link>
          </div>
        ) : (
          <>
            <header className="po-tenant-hero">
              <div>
                <h1 className="po-page-title">{focus.businessName || "Restaurant"}</h1>
                <p className="po-tenant-meta">
                  <code className="po-scope-slug">{focus.slug}</code>
                  {tenantRow ? (
                    <>
                      <span className="po-tenant-dot" aria-hidden>
                        ·
                      </span>
                      <span className="po-muted">
                        Plan <strong className="po-tenant-strong">{tenantRow.plan}</strong>
                        <span className="po-tenant-dot" aria-hidden>
                          {" "}
                          ·{" "}
                        </span>
                        Subscription{" "}
                        <strong className="po-tenant-strong">{tenantRow.subscriptionStatus}</strong>
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
            </header>

            <section className="po-section" aria-labelledby="po-tenant-usage-h">
              <h2 id="po-tenant-usage-h" className="po-section-title">
                Usage for this restaurant
              </h2>
              <p className="po-section-desc">
                Orders and user accounts scoped to this tenant only. Compare with platform-wide
                totals in each card.
              </p>
              <div className="po-kpi-grid po-kpi-grid--usage">
                <KpiCard
                  accent="violet"
                  icon={<IconCart />}
                  label="Orders (all time)"
                  value={nf.format(focus.orderCount ?? 0)}
                  hint={`All restaurants: ${nf.format(s?.orderCount ?? 0)}`}
                />
                <KpiCard
                  accent="slate"
                  icon={<IconUsers />}
                  label="Staff accounts"
                  value={nf.format(focus.staffCount ?? 0)}
                  hint={`All restaurants: ${nf.format(s?.staffCount ?? 0)}`}
                />
                <KpiCard
                  accent="blue"
                  icon={<IconUserCircle />}
                  label="Customer accounts"
                  value={nf.format(focus.customerCount ?? 0)}
                  hint={`All restaurants: ${nf.format(s?.customerCount ?? 0)}`}
                />
              </div>
            </section>

            {tenantRow ? (
              <section className="po-panel po-tenant-detail" aria-labelledby="po-tenant-detail-h">
                <h2 id="po-tenant-detail-h" className="po-panel-title">
                  Directory snapshot
                </h2>
                <dl className="po-tenant-dl">
                  <div>
                    <dt>Owner email</dt>
                    <dd>{tenantRow.ownerId?.email || "—"}</dd>
                  </div>
                  <div>
                    <dt>Expires</dt>
                    <dd>
                      {tenantRow.expiresAt
                        ? new Date(tenantRow.expiresAt).toLocaleDateString()
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
