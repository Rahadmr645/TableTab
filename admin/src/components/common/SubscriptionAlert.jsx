import React, { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { FaExclamationTriangle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./SubscriptionAlert.css";

const SubscriptionAlert = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!admin || admin.role !== "owner") return null;

  const isExpired =
    admin.subscriptionStatus === "expired" ||
    (admin.expiresAt && new Date(admin.expiresAt) < new Date());

  if (!isExpired) return null;

  const isTrial = admin.subscriptionStatus === "trial";
  const isActionable = admin.role === "owner" || admin.role === "manager";

  return (
    <div className="subscription-alert-banner" role="alert">
      <div className="subscription-alert-content">
        <FaExclamationTriangle className="subscription-alert-icon" />
        <span className="subscription-alert-text">
          {isTrial ? (
            <>
              <strong>Trial Expired:</strong> Your TableTab trial period has ended. Renew now to reactivate ordering and menus.
            </>
          ) : (
            <>
              <strong>Subscription Expired:</strong> Your TableTab subscription has ended. Renew now to restore full service.
            </>
          )}
        </span>
      </div>
      <div className="subscription-alert-action">
        {isActionable ? (
          <button
            type="button"
            className="subscription-alert-btn"
            onClick={() => navigate("/subscription-plans")}
          >
            Renew Subscription
          </button>
        ) : (
          <span className="subscription-alert-subtext">
            Please contact your manager or owner to renew.
          </span>
        )}
      </div>
    </div>
  );
};

export default SubscriptionAlert;
