import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext.jsx";
import { getStaffTenantHeaders } from "../../utils/apiBaseUrl.js";
import CreateStaffModal from "../../components/createStaff/CreateStaffModal.jsx";
import { FaCashRegister, FaUserPlus, FaCheckCircle, FaBan, FaTrash, FaExternalLinkAlt, FaCopy } from "react-icons/fa";
import { MdPointOfSale } from "react-icons/md";
import { copyToClipboard } from "../../utils/clipboard.js";
import "./Cashiers.css";

export default function Cashiers() {
  const { admin, URL } = useContext(AuthContext);
  const [cashiers, setCashiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchCashiers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${URL}/api/admin/staff`, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...getStaffTenantHeaders(),
        },
      });
      const allStaff = res.data?.staff || [];
      // Filter to cashier role accounts (or all if needed)
      const cashierList = allStaff.filter((s) => s.role === "cashier");
      setCashiers(cashierList);
    } catch (err) {
      console.error("Failed to fetch cashiers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashiers();
  }, [URL]);

  const handleToggleStatus = async (staffId, currentStatus) => {
    const nextStatus = currentStatus === "suspended" ? "active" : "suspended";
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${URL}/api/admin/staff/${staffId}/status`,
        { staffStatus: nextStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            ...getStaffTenantHeaders(),
          },
        }
      );
      setCashiers((prev) =>
        prev.map((c) => (c._id === staffId ? { ...c, staffStatus: nextStatus } : c))
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm("Are you sure you want to delete this cashier profile?")) {
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${URL}/api/admin/staff/${staffId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...getStaffTenantHeaders(),
        },
      });
      setCashiers((prev) => prev.filter((c) => c._id !== staffId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete cashier profile");
    }
  };

  // Determine Cashier POS URL
  const tenantSlug = admin?.tenantSlug || localStorage.getItem("tenantSlug") || "";
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  const protocol = typeof window !== "undefined" ? window.location.protocol : "http:";
  const cashierBase =
    import.meta.env.VITE_CASHIER_URL ||
    (typeof window !== "undefined" && window.location.port === "5173"
      ? `${protocol}//${host}:5174`
      : typeof window !== "undefined" && window.location.port === "5174"
      ? `${protocol}//${window.location.host}`
      : `${protocol}//${host}:5174`);
  const cashierPosUrl = `${cashierBase}/?tenant=${encodeURIComponent(tenantSlug)}`;

  const copyPosLink = async () => {
    const ok = await copyToClipboard(cashierPosUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      window.prompt("Copy link:", cashierPosUrl);
    }
  };

  const activeCount = cashiers.filter((c) => c.staffStatus !== "suspended").length;

  return (
    <div className="cashiers-page-container">
      {/* Top Header */}
      <div className="cashiers-header-section">
        <div className="cashiers-header-left">
          <h1>
            <FaCashRegister style={{ color: "#3b82f6" }} />
            Cashier Management
          </h1>
          <p>Create and manage cashier staff accounts and POS terminals for your restaurant.</p>
        </div>

        <div className="cashiers-header-actions">
          <button
            type="button"
            className="cashier-create-btn"
            onClick={() => setCreateModalOpen(true)}
          >
            <FaUserPlus />
            <span>Create Cashier Profile</span>
          </button>
        </div>
      </div>

      {/* Quick POS Terminal Banner */}
      <div className="terminal-link-card">
        <div className="terminal-link-info">
          <div className="terminal-link-icon">📟</div>
          <div className="terminal-link-text">
            <h4>Cashier POS Terminal Web Link</h4>
            <p>Open this link on your cashier iPad or tablet to operate the point of sale.</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div className="terminal-url-pill">{cashierPosUrl}</div>
          <button
            type="button"
            className="cashier-action-btn toggle"
            onClick={copyPosLink}
            style={{ padding: "8px 14px" }}
          >
            <FaCopy />
            <span>{copied ? "Copied!" : "Copy Link"}</span>
          </button>
          <a
            href={cashierPosUrl}
            target="_blank"
            rel="noreferrer"
            className="cashier-launch-pos-btn"
          >
            <FaExternalLinkAlt />
            <span>Launch POS</span>
          </a>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="cashiers-stats-row">
        <div className="cashier-stat-card">
          <div className="cashier-stat-icon blue">
            <MdPointOfSale />
          </div>
          <div className="cashier-stat-info">
            <h3>{cashiers.length}</h3>
            <span>Total Cashiers</span>
          </div>
        </div>

        <div className="cashier-stat-card">
          <div className="cashier-stat-icon green">
            <FaCheckCircle />
          </div>
          <div className="cashier-stat-info">
            <h3>{activeCount}</h3>
            <span>Active Staff Profiles</span>
          </div>
        </div>

        <div className="cashier-stat-card">
          <div className="cashier-stat-icon purple">
            <FaCashRegister />
          </div>
          <div className="cashier-stat-info">
            <h3>{tenantSlug ? `@${tenantSlug}` : "Configured"}</h3>
            <span>Venue POS Scope</span>
          </div>
        </div>
      </div>

      {/* Cashiers List / Cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
          Loading cashier profiles...
        </div>
      ) : cashiers.length === 0 ? (
        <div className="cashiers-empty-box">
          <div className="cashiers-empty-icon">📟</div>
          <h3>No Cashier Profiles Found</h3>
          <p>Create cashier accounts so your team members can log into the Cashier POS terminal.</p>
          <button
            type="button"
            className="cashier-create-btn"
            style={{ margin: "0 auto" }}
            onClick={() => setCreateModalOpen(true)}
          >
            <FaUserPlus />
            <span>Create First Cashier Account</span>
          </button>
        </div>
      ) : (
        <div className="cashiers-grid">
          {cashiers.map((cashier) => {
            const isSuspended = cashier.staffStatus === "suspended";
            const initial = (cashier.username || cashier.email || "C").charAt(0).toUpperCase();

            return (
              <div key={cashier._id} className="cashier-card">
                <div className="cashier-card-top">
                  <div className="cashier-avatar-box">{initial}</div>
                  <div className="cashier-details">
                    <h3>{cashier.username || "Cashier Staff"}</h3>
                    <p className="cashier-email-text">{cashier.email}</p>
                  </div>
                </div>

                <div className="cashier-meta-row">
                  <span className="cashier-role-pill">Cashier</span>
                  <span className={`cashier-status-badge ${isSuspended ? "suspended" : "active"}`}>
                    {isSuspended ? (
                      <>
                        <FaBan /> Suspended
                      </>
                    ) : (
                      <>
                        <FaCheckCircle /> Active
                      </>
                    )}
                  </span>
                </div>

                <div className="cashier-card-actions">
                  <button
                    type="button"
                    className="cashier-action-btn toggle"
                    onClick={() => handleToggleStatus(cashier._id, cashier.staffStatus)}
                  >
                    {isSuspended ? "Activate" : "Suspend"}
                  </button>

                  <button
                    type="button"
                    className="cashier-action-btn delete"
                    onClick={() => handleDeleteStaff(cashier._id)}
                  >
                    <FaTrash />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Staff / Cashier Modal */}
      <CreateStaffModal
        open={createModalOpen}
        defaultRole="cashier"
        hideRole={true}
        title="Create Cashier Profile"
        lead="Add a cashier profile for this restaurant. They will use this email and password to log into the Cashier POS terminal."
        onClose={() => {
          setCreateModalOpen(false);
          fetchCashiers();
        }}
      />
    </div>
  );
}
