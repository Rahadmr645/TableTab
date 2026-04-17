import React from "react";
import { Link } from "react-router-dom";
import "./Home.css";

const Home = () => {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-glow" aria-hidden />
        <div className="home-hero-content">
          <p className="home-eyebrow">Table-side ordering</p>
          <h1>
            Order in <span className="home-accent">3D depth</span>, served in real
            time.
          </h1>
          <p className="home-lead">
            Browse the menu, pay securely, and follow your ticket from the kitchen
            to your table—without leaving your seat.
          </p>
          <div className="home-cta-row">
            <Link className="home-btn home-btn--primary" to="/menu">
              Open menu
            </Link>
            <Link className="home-btn home-btn--ghost" to="/myOrders">
              My orders
            </Link>
          </div>
        </div>

        <div className="home-showcase" aria-hidden>
          <div className="home-stack home-stack--a" />
          <div className="home-stack home-stack--b" />
          <div className="home-stack home-stack--c" />
        </div>
      </section>

      <section className="home-features">
        <article className="home-feature-card">
          <h2>Layered UI</h2>
          <p>Glass surfaces, soft lighting, and tactile motion tuned for hospitality.</p>
        </article>
        <article className="home-feature-card">
          <h2>Live status</h2>
          <p>Socket-backed updates so guests see the same rhythm as the pass.</p>
        </article>
        <article className="home-feature-card">
          <h2>Secure pay</h2>
          <p>Stripe Elements in a focused flow after you confirm table details.</p>
        </article>
      </section>
    </div>
  );
};

export default Home;
