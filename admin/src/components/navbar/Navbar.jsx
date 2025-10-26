import React, { useState, useContext } from 'react'
import './navbar.css'

import profileImage from '../../assets/icons/profileTabletab.png'
import { AuthContext } from '../../context/AuthContext'
import { FaCartPlus } from "react-icons/fa";
import { GrCafeteria } from "react-icons/gr";
import { FaChartLine } from "react-icons/fa6";
import { PiChefHat } from "react-icons/pi";
import { FaInfoCircle } from "react-icons/fa";
import { Link, NavLink } from 'react-router-dom'

const Navbar = () => {
  const [selected, setSelected] = useState('orders');
  const { setShowLogin, user } = useContext(AuthContext);

  return (
    <div className='navbar'>
      {/* ==== LEFT BOX (Profile Info) ==== */}
      <div className='col-3 simple-border'>
        <div className="left-box d-flex align-items-center gap-3 justify-content-center">
          <Link to='/profile-pic' > <img className='profilepic' src={profileImage} alt="profile" /> </Link>
          <div>
            <h3>{user ? user.username : "Guest"}</h3>
            <p>{user ? user.role : ""}</p>
          </div>


        </div>
      </div>

      {/* ==== MIDDLE NAV LINKS ==== */}
      <div className='col-6 simple-border'>
        <div className="middle-box">
          <NavLink
            to='/orders'
            className={`nav_icon_box ${selected === 'orders' ? "selectedboder" : ""}`}
            onClick={() => setSelected('orders')}
          >
            <FaCartPlus className="nav-icon" />
            <span className="nav-text">Orders</span>
          </NavLink>

          <NavLink
            to='/menu'
            className={`nav_icon_box ${selected === 'menu' ? "selectedboder" : ""}`}
            onClick={() => setSelected('menu')}
          >
            <GrCafeteria className="nav-icon" />
            <span className="nav-text">Menu</span>
          </NavLink>

          <NavLink
            to='/summary'
            className={`nav_icon_box ${selected === 'summary' ? "selectedboder" : ""}`}
            onClick={() => setSelected('summary')}
          >
            <FaChartLine className="nav-icon" />
            <span className="nav-text">Summary</span>
          </NavLink>

          <NavLink
            to='/chef'
            className={`nav_icon_box ${selected === 'chef' ? "selectedboder" : ""}`}
            onClick={() => setSelected('chef')}
          >
            <PiChefHat className="nav-icon" />
            <span className="nav-text">Chefs</span>
          </NavLink>

          <NavLink
            to='/about'
            className={`nav_icon_box ${selected === 'about' ? "selectedboder" : ""}`}
            onClick={() => setSelected('about')}
          >
            <FaInfoCircle className="nav-icon" />
            <span className="nav-text">About</span>
          </NavLink>
        </div>
      </div>

      {/* ==== RIGHT BOX (Login / Logout Button) ==== */}
      <div className='col-3 simple-border d-flex justify-content-center align-items-center'>
        {user ? (
          <button
            onClick={() => {
              localStorage.removeItem("token");
              window.location.reload();
            }}
            className='btn btn-danger lg-btn'
          >
            LOGOUT
          </button>
        ) : (
          <button
            onClick={() => setShowLogin(true)}
            className='btn btn-primary lg-btn'
          >
            LOGIN
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
