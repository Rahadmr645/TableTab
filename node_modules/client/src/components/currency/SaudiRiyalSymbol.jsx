import React from "react";

/** Price suffix shown after numeric amounts */
export default function SaudiRiyalSymbol({ className = "" }) {
  return (
    <span className={`sar-mark ${className}`.trim()} aria-hidden="true">
      /-
    </span>
  );
}
