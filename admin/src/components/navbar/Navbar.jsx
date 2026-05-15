import React, { useContext, useState } from "react";
import "./navbar.css";

import defaultProfilePic from "../../assets/icons/profileTabletab.png";
import { AuthContext } from "../../context/AuthContext";
import { FaCartPlus, FaUserPlus } from "react-icons/fa";
import { GrCafeteria } from "react-icons/gr";
import { FaChartLine } from "react-icons/fa6";
import { PiChefHat } from "react-icons/pi";
import { FaInfoCircle, FaBarcode, FaBell } from "react-icons/fa";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { HiOutlineMenuAlt3, HiX } from "react-icons/hi";
import CreateStaffModal from "../createStaff/CreateStaffModal.jsx";
import { SocketContext } from "../../context/SocketContext.jsx";
import { useEffect } from "react";

const Navbar = () => {
  const { admin, profileImage } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const navigate = useNavigate();

  const getInitialUnseen = () => {
    try {
      const stored = localStorage.getItem("unseenOrdersList");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  };
  const [unseenOrders, setUnseenOrders] = useState(getInitialUnseen);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("unseenOrdersList", JSON.stringify(unseenOrders));
  }, [unseenOrders]);

  useEffect(() => {
    if (!socket) return;
    const handleNewOrder = (order) => {
      setUnseenOrders((prev) => {
        // avoid duplicates
        if (prev.some((o) => o._id === order._id)) return prev;
        return [order, ...prev];
      });
    };
    socket.on("newOrder", handleNewOrder);
    return () => socket.off("newOrder", handleNewOrder);
  }, [socket]);

  const handleNotifClick = (orderId) => {
    setUnseenOrders((prev) => prev.filter((o) => o._id !== orderId));
    setIsNotifOpen(false);
    navigate("/orders");
  };

  const handleClearNotifs = () => {
    setUnseenOrders([]);
    setIsNotifOpen(false);
  };

  const canAddStaff = admin && admin.role === "owner";

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
      {canAddStaff ? (
        <button
          type="button"
          className="admin-navbar__link admin-navbar__link--action"
          onClick={() => setAddStaffOpen(true)}
        >
          <FaUserPlus className="admin-navbar__link-icon" aria-hidden />
          <span>Add staff</span>
        </button>
      ) : null}
    </>
  );

  const canManageMenu = admin && (admin.role === "owner" || admin.role === "manager");

  const drawerNavItems =
    canManageMenu || (admin && admin.role === "admin") ? (
      <>
        {canManageMenu && (
          <NavLink to="/menu" className={linkClass} onClick={() => setMobileOpen(false)}>
            <GrCafeteria className="admin-navbar__link-icon" aria-hidden />
            <span>Menu</span>
          </NavLink>
        )}
        {admin?.role === "owner" && (
          <NavLink to="/summary" className={linkClass} onClick={() => setMobileOpen(false)}>
            <FaChartLine className="admin-navbar__link-icon" aria-hidden />
            <span>Summary</span>
          </NavLink>
        )}
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
      {(canManageMenu || (admin && admin.role === "admin")) && (
        <>
          {canManageMenu && (
            <NavLink to="/menu" className={linkClass} onClick={() => setMobileOpen(false)}>
              <GrCafeteria className="admin-navbar__link-icon" aria-hidden />
              <span>Menu</span>
            </NavLink>
          )}
          {admin?.role === "owner" && (
            <NavLink to="/summary" className={linkClass} onClick={() => setMobileOpen(false)}>
              <FaChartLine className="admin-navbar__link-icon" aria-hidden />
              <span>Summary</span>
            </NavLink>
          )}
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
            {admin && admin.companyName ? (
              <span className="admin-navbar__company-mobile">
                {admin.companyName}
              </span>
            ) : null}
          </div>

          <nav className="admin-navbar__nav" aria-label="Primary">
            <div className="admin-navbar__rail">{desktopNavItems}</div>
          </nav>

          <div className="admin-navbar__end">
            {admin && (admin.role === "chef" || admin.role === "barista") && (
              <div className="admin-navbar__notification-wrapper">
                <button
                  type="button"
                  className="admin-navbar__notification-btn"
                  onClick={() => setIsNotifOpen((prev) => !prev)}
                  aria-label="Notifications"
                >
                  <div className="admin-navbar__icon-wrapper">
                    <FaBell className={`admin-navbar__notification-icon ${unseenOrders.length > 0 ? "admin-navbar__bell-ringing" : ""}`} />
                    {unseenOrders.length > 0 && <span className="admin-navbar__badge">{unseenOrders.length}</span>}
                  </div>
                </button>
                {isNotifOpen && (
                  <div className="admin-navbar__notif-dropdown">
                    <div className="admin-navbar__notif-header">
                      <span>Notifications</span>
                      {unseenOrders.length > 0 && (
                        <button type="button" className="admin-navbar__notif-clear" onClick={handleClearNotifs}>
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="admin-navbar__notif-body">
                      {unseenOrders.length === 0 ? (
                        <div className="admin-navbar__notif-empty">No new notifications.</div>
                      ) : (
                        unseenOrders.map((o) => (
                          <button
                            key={o._id}
                            className="admin-navbar__notif-item"
                            onClick={() => handleNotifClick(o._id)}
                          >
                            <div className="admin-navbar__notif-text">
                              <strong>New Order #{o.dailyOrderNumber != null ? o.dailyOrderNumber : o._id.slice(-6).toUpperCase()}</strong>
                              <span>{o.customerName || "Guest"}</span>
                            </div>
                            <div className="admin-navbar__notif-time">
                              {new Date(o.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
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
      <CreateStaffModal open={addStaffOpen} onClose={() => setAddStaffOpen(false)} />
    </>
  );
};

export default Navbar;
