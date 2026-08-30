import React, { useContext, useState, useEffect, useCallback, useRef } from "react";
import "./Navbar.css";
import logo from "../../assets/icons/logo.png";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { MdCoffeeMaker } from "react-icons/md";
import { IoCart, IoClose, IoMenu, IoPersonCircle, IoGlobeOutline } from "react-icons/io5";
import { PiReadCvLogo } from "react-icons/pi";
import { TbBrandApplePodcast } from "react-icons/tb";
import { AuthContext } from "../../context/CartContext";
import { useLanguage } from "../../context/LanguageContext.jsx";
import {
  loadGuestOrdersForNav,
  MY_ORDERS_EMPTY_MSG,
} from "../../utils/myOrdersGate.js";
import AsyncLoadingOverlay from "../common/AsyncLoadingOverlay.jsx";
import { api } from "../../utils/api.js";

const MOBILE_BREAKPOINT = 768;

const Navbar = () => {
  const { cart, setMyOrders, user } = useContext(AuthContext);
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const cartCount = cart.reduce((n, i) => n + (i.quantity || 0), 0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePicFailed, setProfilePicFailed] = useState(false);
  const [myOrdersNavBusy, setMyOrdersNavBusy] = useState(false);
  const myOrdersNavLockRef = useRef(false);
  const [restaurantName, setRestaurantName] = useState(() => {
    return sessionStorage.getItem("tabletab_public_tenant_name") || "";
  });

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > MOBILE_BREAKPOINT) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const match = routerLocation.pathname.match(/^\/menu\/([^/]+)/);
    const slug = match ? match[1] : null;
    if (slug) {
      api.get(`/api/tenant/by-slug/${encodeURIComponent(slug)}`)
        .then(res => {
          if (res.data?.tenant?.businessName) {
            setRestaurantName(res.data.tenant.businessName);
            sessionStorage.setItem("tabletab_public_tenant_name", res.data.tenant.businessName);
          }
        })
        .catch(err => {
          console.error("Failed to fetch tenant name for Navbar", err);
        });
    }
  }, [routerLocation.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onEsc = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [menuOpen]);

  useEffect(() => {
    setProfilePicFailed(false);
  }, [user?._id, user?.profilePic]);

  const cartClick = (e) => {
    if (cart.length === 0) {
      e.preventDefault();
      alert(t("cart_empty_alert"));
    }
    closeMenu();
  };

  const myOrdersClick = useCallback(
    async (e) => {
      e.preventDefault();
      if (myOrdersNavLockRef.current) return;
      myOrdersNavLockRef.current = true;
      closeMenu();
      setMyOrdersNavBusy(true);
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
        myOrdersNavLockRef.current = false;
        setMyOrdersNavBusy(false);
      }
    },
    [setMyOrders, navigate, closeMenu],
  );

  return (
    <div
      className={`navbar-container${menuOpen ? " navbar-container--menu-open" : ""}`}
    >
      <AsyncLoadingOverlay
        open={myOrdersNavBusy}
        message={language === "ar" ? "جاري تحميل طلباتك…" : "Loading your orders…"}
      />
      <Link to="/menu" className="left-side brand-link" aria-label={`${restaurantName || "TableTab"} menu`}>
        <img src={logo} alt="" />
        <span className="brand-text">{restaurantName || "TableTab"}</span>
      </Link>

      <nav
        id="navbar-primary-nav"
        className="middle-side"
        aria-label="Main navigation"
      >
        <div className="nav-box">
          <NavLink
            className={({ isActive }) =>
              `navLink${isActive ? " nav-link--active" : ""}`
            }
            to="/menu"
            onClick={closeMenu}
          >
            <span>{t("nav_menu")}</span>
            <MdCoffeeMaker />
          </NavLink>
        </div>
        <div className="nav-box">
          <NavLink
            className={({ isActive }) =>
              `navLink${isActive ? " nav-link--active" : ""}`
            }
            to="/about"
            onClick={closeMenu}
          >
            <span>{t("nav_about")}</span>
            <TbBrandApplePodcast />
          </NavLink>
        </div>
      </nav>

      <div className="navbar-trailing">
        <nav className="navbar-persistent" aria-label="Cart and orders">
          <div className="nav-box">
            <NavLink
              className={({ isActive }) =>
                `navLink${cart.length > 0 ? " cart--ready" : " cart--locked"}${
                  isActive ? " nav-link--active" : ""
                }`
              }
              to={cart.length > 0 ? "/chackout" : "#"}
              onClick={cartClick}
              aria-label={
                cart.length > 0
                  ? `${t("nav_cart")}, ${cartCount}`
                  : `${t("nav_cart")}, empty`
              }
            >
              <span className="cart-span">{t("nav_cart")}</span>
              <IoCart className="icon" />
              {cart.length > 0 && (
                <span className="cart-badge" aria-label={`${cartCount} items`}>
                  {cartCount}
                </span>
              )}
            </NavLink>
          </div>
          <div className="nav-box">
            <NavLink
              className={({ isActive }) =>
                `navLink${isActive ? " nav-link--active" : ""}`
              }
              to="/myOrders"
              onClick={myOrdersClick}
              aria-label={t("nav_orders")}
            >
              <span className="orders-label">{t("nav_orders")}</span>
              <PiReadCvLogo className="icon" />
            </NavLink>
          </div>
        </nav>

        <div className="right-side">
          {/* Language Switcher Pill */}
          <button
            type="button"
            className="navbar-lang-btn"
            onClick={toggleLanguage}
            title={language === "en" ? "تغيير اللغة إلى العربية" : "Switch language to English"}
            aria-label={language === "en" ? "Switch to Arabic" : "Switch to English"}
          >
            <IoGlobeOutline className="lang-icon" />
            <span className="lang-text-desktop">{language === "en" ? "العربية" : "English"}</span>
            <span className="lang-text-mobile">{language === "en" ? "ع" : "EN"}</span>
          </button>

          {user ? (
            <Link
              to="/profile"
              state={{ background: routerLocation }}
              className="navbar-profile"
              onClick={closeMenu}
              aria-label={`Open profile, signed in as ${user.username ?? "user"}`}
              title={user.username ?? ""}
            >
              {typeof user.profilePic === "string" &&
              user.profilePic.trim() &&
              !profilePicFailed ? (
                <img
                  src={user.profilePic.trim()}
                  alt=""
                  className="navbar-profile__img"
                  referrerPolicy="no-referrer"
                  onError={() => setProfilePicFailed(true)}
                />
              ) : (
                <IoPersonCircle
                  className="navbar-profile__fallback"
                  aria-hidden
                />
              )}
            </Link>
          ) : (
            <Link
              to="/signup"
              state={{ background: routerLocation }}
              className="navbar-signup-btn"
              onClick={closeMenu}
              aria-label="Sign in or create an account"
            >
              {t("nav_signin")}
            </Link>
          )}
          <button
            type="button"
            className="navbar-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="navbar-primary-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <IoClose /> : <IoMenu />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
