import React, { useCallback, useContext, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/CartContext";
import {
  loadGuestOrdersForNav,
  MY_ORDERS_EMPTY_MSG,
} from "../../utils/myOrdersGate.js";
import "./Home.css";
import AsyncLoadingOverlay from "../../components/common/AsyncLoadingOverlay.jsx";

const Home = () => {
  const { setMyOrders } = useContext(AuthContext);
  const navigate = useNavigate();
  const [navBusy, setNavBusy] = useState(false);
  const navLockRef = useRef(false);

  const onMyOrdersClick = useCallback(
    async (e) => {
      e.preventDefault();
      if (navLockRef.current) return;
      navLockRef.current = true;
      setNavBusy(true);
      try {
        const token = localStorage.getItem("guestToken")?.trim();
        const { allowNav, orders } = await loadGuestOrdersForNav(token);
        setMyOrders(orders);
        if (!allowNav) {
          alert(MY_ORDERS_EMPTY_MSG);
          return;
        }
        navigate("/myOrders");
      } finally {
        navLockRef.current = false;
        setNavBusy(false);
      }
    },
    [setMyOrders, navigate],
  );

  return (
    <div className="home-page">
      <AsyncLoadingOverlay
        open={navBusy}
        message="Loading your orders…"
      />
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
            <Link
              className="home-btn home-btn--ghost"
              to="/myOrders"
              onClick={onMyOrdersClick}
            >
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
