import React, { useContext, useState, useEffect, useCallback, useRef } from "react";
import "./Navbar.css";
import logo from "../../assets/icons/logo.png";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { MdCoffeeMaker } from "react-icons/md";
import { IoCart, IoClose, IoMenu, IoPersonCircle } from "react-icons/io5";
import { PiReadCvLogo } from "react-icons/pi";
import { TbBrandApplePodcast } from "react-icons/tb";
import { AuthContext } from "../../context/CartContext";
import {
  loadGuestOrdersForNav,
  MY_ORDERS_EMPTY_MSG,
} from "../../utils/myOrdersGate.js";
import AsyncLoadingOverlay from "../common/AsyncLoadingOverlay.jsx";

const MOBILE_BREAKPOINT = 768;

const Navbar = () => {
  const { cart, setMyOrders, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const cartCount = cart.reduce((n, i) => n + (i.quantity || 0), 0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePicFailed, setProfilePicFailed] = useState(false);
  const [myOrdersNavBusy, setMyOrdersNavBusy] = useState(false);
  const myOrdersNavLockRef = useRef(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > MOBILE_BREAKPOINT) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
      alert("You need to add something in your card");
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
        message="Loading your orders…"
      />
      <Link to="/menu" className="left-side brand-link" aria-label="TableTab menu">
        <img src={logo} alt="" />
        <span className="brand-text">TableTab</span>
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
            <span>Menu</span>
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
            <span>About</span>
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
                  ? `Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`
                  : "Cart, empty"
              }
            >
              <span className="cart-span">Cart</span>
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
              aria-label="My orders"
            >
              <span className="orders-label">My Orders</span>
              <PiReadCvLogo className="icon" />
            </NavLink>
          </div>
        </nav>

        <div className="right-side">
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
            Sign in
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
