import React from "react";
import "./AsyncLoadingOverlay.css";

const AsyncLoadingOverlay = ({ show }) => {
  if (!show) return null;

  return (
    <div className="async-loading-overlay" role="status" aria-live="polite">
      <div className="async-loading-spinner" />
      <p>Loading...</p>
    </div>
  );
};

export default AsyncLoadingOverlay;
