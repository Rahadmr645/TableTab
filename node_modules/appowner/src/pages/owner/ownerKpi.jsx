export const nf = new Intl.NumberFormat();

export function IconBuilding() {
  return (
    <svg className="po-kpi-svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 21V8l8-4 8 4v13M9 21v-4h6v4M9 13h2M13 13h2M9 17h2M13 17h2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconCheck() {
  return (
    <svg className="po-kpi-svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 12l2 2 4-4M12 21a9 9 0 100-18 9 9 0 000 18z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconTrial() {
  return (
    <svg className="po-kpi-svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 8v4l3 2M12 21a9 9 0 100-18 9 9 0 000 18z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconAlert() {
  return (
    <svg className="po-kpi-svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 9v4M12 17h.01M10.3 3h3.4L21 17H3L10.3 3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconCart() {
  return (
    <svg className="po-kpi-svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6h15l-1.5 9h-12L4.5 4H2M6 20a1 1 0 100-2 1 1 0 000 2zm12 0a1 1 0 100-2 1 1 0 000 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconUsers() {
  return (
    <svg className="po-kpi-svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm12 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconUserCircle() {
  return (
    <svg className="po-kpi-svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KpiCard({ icon, label, value, hint, accent }) {
  return (
    <article className={`po-kpi po-kpi--${accent}`}>
      <div className="po-kpi-top">
        <span className="po-kpi-icon" aria-hidden>
          {icon}
        </span>
        <div className="po-kpi-body">
          <div className="po-kpi-label">{label}</div>
          <div className="po-kpi-value">{value ?? "—"}</div>
          {hint ? <div className="po-kpi-hint">{hint}</div> : null}
        </div>
      </div>
    </article>
  );
}
