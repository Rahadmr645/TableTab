import React, { useContext, useState, useEffect, useCallback } from "react";
import "./Navbar.css";
import logo from "../../assets/icons/logo.png";
import { NavLink, Link } from "react-router-dom";
import { MdCoffeeMaker } from "react-icons/md";
import { IoCart, IoClose, IoMenu } from "react-icons/io5";
import { PiReadCvLogo } from "react-icons/pi";
import { TbBrandApplePodcast } from "react-icons/tb";
import { AuthContext } from "../../context/CartContext";

const MOBILE_BREAKPOINT = 768;

const Navbar = () => {
  const { cart } = useContext(AuthContext);
  const cartCount = cart.reduce((n, i) => n + (i.quantity || 0), 0);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const cartClick = (e) => {
    if (cart.length === 0) {
      e.preventDefault();
      alert("You need to add something in your card");
    }
    closeMenu();
  };

  return (
    <div
      className={`navbar-container${menuOpen ? " navbar-container--menu-open" : ""}`}
    >
      <Link to="/" className="left-side brand-link" aria-label="TableTab home">
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
              `navLink${cart.length > 0 ? " cart--ready" : " cart--locked"}${
                isActive ? " nav-link--active" : ""
              }`
            }
            to={cart.length > 0 ? "/chackout" : "#"}
            onClick={cartClick}
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
            onClick={closeMenu}
          >
            <span>My Orders</span>
            <PiReadCvLogo className="icon" />
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

      <div className="right-side">
        <button type="button" className="navbar-signup-btn">
          Sign up
        </button>
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
  );
};

export default Navbar;
