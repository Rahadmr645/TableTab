import React, { useContext, useState } from "react";
import "./navbar.css";

import defaultProfilePic from "../../assets/icons/profileTabletab.png";
import { AuthContext } from "../../context/AuthContext";
import { FaCartPlus } from "react-icons/fa";
import { GrCafeteria } from "react-icons/gr";
import { FaChartLine } from "react-icons/fa6";
import { PiChefHat } from "react-icons/pi";
import { FaInfoCircle, FaBarcode } from "react-icons/fa";
import { NavLink, useNavigate } from "react-router-dom";
import UpdateProfilePic from "../updateProfilePic/UpdateProfilePic";
import { HiOutlineMenuAlt3, HiX } from "react-icons/hi";

const Navbar = () => {
  const {
    setShowLogin,
    admin,
    setAdmin,
    showUpdateProfilePic,
    setShowUpdateProfilePic,
    profileImage,
  } = useContext(AuthContext);

  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    setAdmin(null);
    setMobileOpen(false);
    navigate("/login");
  };

  const linkClass = ({ isActive }) =>
    `admin-navbar__link${isActive ? " admin-navbar__link--active" : ""}`;

  const navItems = (
    <>
      <NavLink to="/orders" className={linkClass} onClick={() => setMobileOpen(false)}>
        <FaCartPlus className="admin-navbar__link-icon" aria-hidden />
        <span>Orders</span>
      </NavLink>
      {admin && admin.role === "admin" && (
        <>
          <NavLink to="/menu" className={linkClass} onClick={() => setMobileOpen(false)}>
            <GrCafeteria className="admin-navbar__link-icon" aria-hidden />
            <span>Menu</span>
          </NavLink>
          <NavLink to="/summary" className={linkClass} onClick={() => setMobileOpen(false)}>
            <FaChartLine className="admin-navbar__link-icon" aria-hidden />
            <span>Summary</span>
          </NavLink>
          <NavLink to="/barcode" className={linkClass} onClick={() => setMobileOpen(false)}>
            <FaBarcode className="admin-navbar__link-icon" aria-hidden />
            <span>Barcode</span>
          </NavLink>
          <NavLink to="/about" className={linkClass} onClick={() => setMobileOpen(false)}>
            <FaInfoCircle className="admin-navbar__link-icon" aria-hidden />
            <span>About</span>
          </NavLink>
        </>
      )}
      <NavLink to="/chef" className={linkClass} onClick={() => setMobileOpen(false)}>
        <PiChefHat className="admin-navbar__link-icon" aria-hidden />
        <span>Chefs</span>
      </NavLink>
    </>
  );

  return (
    <>
      {showUpdateProfilePic && <UpdateProfilePic />}

      <header className="admin-navbar">
        <div className="admin-navbar__shell">
          <div className="admin-navbar__brand">
            <button
              type="button"
              className="admin-navbar__avatar"
              onClick={() => setShowUpdateProfilePic(true)}
              aria-label="Change profile photo"
            >
              <img
                src={profileImage || defaultProfilePic}
                alt=""
                width={44}
                height={44}
              />
            </button>
            <div className="admin-navbar__user">
              <span className="admin-navbar__name">
                {admin ? admin.username : "Guest"}
              </span>
              {admin ? (
                <span className="admin-navbar__role">{admin.role}</span>
              ) : null}
            </div>
          </div>

          <nav className="admin-navbar__nav" aria-label="Primary">
            <div className="admin-navbar__rail">{navItems}</div>
          </nav>

          <div className="admin-navbar__end">
            <button
              type="button"
              className="admin-navbar__menu-toggle"
              aria-expanded={mobileOpen}
              aria-controls="admin-navbar-drawer"
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? (
                <HiX className="admin-navbar__menu-icon" aria-hidden />
              ) : (
                <HiOutlineMenuAlt3 className="admin-navbar__menu-icon" aria-hidden />
              )}
              <span className="admin-navbar__menu-label">Menu</span>
            </button>

            <div className="admin-navbar__actions">
              {admin ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="admin-navbar__btn admin-navbar__btn--ghost"
                >
                  Log out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowLogin(true)}
                  className="admin-navbar__btn admin-navbar__btn--accent"
                >
                  Log in
                </button>
              )}
            </div>
          </div>
        </div>

        <div
          id="admin-navbar-drawer"
          className={`admin-navbar__drawer${mobileOpen ? " admin-navbar__drawer--open" : ""}`}
          aria-hidden={!mobileOpen}
        >
          <nav className="admin-navbar__drawer-inner" aria-label="Primary mobile">
            {navItems}
          </nav>
        </div>
      </header>
    </>
  );
};

export default Navbar;
