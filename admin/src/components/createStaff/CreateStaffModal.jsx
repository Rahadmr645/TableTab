import React, { useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { getStaffTenantHeaders } from "../../utils/apiBaseUrl.js";
import "./CreateStaffModal.css";

const ROLE_OPTIONS = [
  { value: "manager", label: "Manager" },
  { value: "chef", label: "Chef" },
  { value: "barista", label: "Barista" },
];

function CreateStaffModalInner({ onClose }) {
  const { URL } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("chef");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    const u = username.trim();
    const em = email.trim();
    if (!u || !em || !password) {
      setMessage({ type: "error", text: "Please enter name, email, and password." });
      return;
    }
    if (!URL) {
      setMessage({
        type: "error",
        text: "API URL is not configured. Set VITE_API_URL in admin/.env.",
      });
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setMessage({ type: "error", text: "You are not signed in." });
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(
        `${URL}/api/admin/create`,
        {
          username: u,
          email: em,
          password,
          role,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...getStaffTenantHeaders(),
          },
        },
      );
      setMessage({
        type: "ok",
        text: "Staff account created. They can sign in from Staff on the login page with this email and password.",
      });
      setUsername("");
      setEmail("");
      setPassword("");
      setRole("chef");
    } catch (err) {
      const text =
        err.response?.data?.message || err.message || "Could not create staff.";
      setMessage({ type: "error", text });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-staff-modal" role="presentation">
      <button
        type="button"
        className="create-staff-modal__backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="create-staff-modal__dialog admin-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-staff-heading"
      >
        <button
          type="button"
          className="create-staff-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 id="create-staff-heading" className="create-staff__title">
          Create staff
        </h2>
        <p className="create-staff__lead">
          Add team members for this restaurant. They sign in on the login page with the email and
          password you set here.
        </p>
        <form className="create-staff__form" onSubmit={handleSubmit}>
          <div className="create-staff__field">
            <label htmlFor="create-staff-name">Name</label>
            <input
              id="create-staff-name"
              name="username"
              autoComplete="name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Sam Taylor"
            />
          </div>
          <div className="create-staff__field">
            <label htmlFor="create-staff-email">Work email (sign-in)</label>
            <input
              id="create-staff-email"
              name="email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sam@yourrestaurant.com"
            />
          </div>
          <div className="create-staff__field">
            <label htmlFor="create-staff-password">Password</label>
            <input
              id="create-staff-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a temporary password"
            />
          </div>
          <div className="create-staff__field">
            <label htmlFor="create-staff-role">Role</label>
            <select
              id="create-staff-role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {message.text ? (
            <p
              className={`create-staff__msg${message.type === "error" ? " create-staff__msg--err" : " create-staff__msg--ok"}`}
              role="status"
            >
              {message.text}
            </p>
          ) : null}
          <div className="create-staff-modal__actions">
            <button type="button" className="create-staff-modal__cancel" onClick={onClose}>
              Close
            </button>
            <button type="submit" className="create-staff__submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create staff account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateStaffModal({ open, onClose }) {
  const { admin } = useContext(AuthContext);
  const can = admin && (admin.role === "owner" || admin.role === "manager");
  if (!can || typeof document === "undefined" || !open) return null;

  return createPortal(<CreateStaffModalInner onClose={onClose} />, document.body);
}
