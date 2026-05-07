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
import { HiOutlineMenuAlt3, HiX } from "react-icons/hi";

const Navbar = () => {
  const { admin, profileImage } = useContext(AuthContext);

  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    `admin-navbar__link${isActive ? " admin-navbar__link--active" : ""}`;

  const alwaysVisibleNavItems = (
    <>
      <NavLink to="/orders" className={linkClass} onClick={() => setMobileOpen(false)}>
        <FaCartPlus className="admin-navbar__link-icon" aria-hidden />
        <span>Orders</span>
      </NavLink>
      <NavLink to="/chef" className={linkClass} onClick={() => setMobileOpen(false)}>
        <PiChefHat className="admin-navbar__link-icon" aria-hidden />
        <span>Chefs</span>
      </NavLink>
    </>
  );

  const drawerNavItems =
    admin && admin.role === "admin" ? (
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
    ) : null;

  const desktopNavItems = (
    <>
      {alwaysVisibleNavItems}
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
    </>
  );

  return (
    <>
      <header className="admin-navbar">
        <div className="admin-navbar__shell">
          <div className="admin-navbar__brand">
            <button
              type="button"
              className="admin-navbar__avatar"
              onClick={() => navigate("/profile")}
              aria-label="Open profile section"
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
            <div className="admin-navbar__rail">{desktopNavItems}</div>
          </nav>

          <div className="admin-navbar__end">
            {drawerNavItems ? (
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
            ) : null}
          </div>
        </div>

        {drawerNavItems ? (
          <div
            id="admin-navbar-drawer"
            className={`admin-navbar__drawer${mobileOpen ? " admin-navbar__drawer--open" : ""}`}
            aria-hidden={!mobileOpen}
          >
            <nav className="admin-navbar__drawer-inner" aria-label="Primary mobile">
              {drawerNavItems}
            </nav>
          </div>
        ) : null}
      </header>
    </>
  );
};

export default Navbar;
