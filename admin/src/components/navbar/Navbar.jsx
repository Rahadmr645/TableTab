import React from 'react'
import './navbar.css'

import profileImage from '../../assets/icons/profileTabletab.png'
import { useState, useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { FaCartPlus } from "react-icons/fa";
import { GrCafeteria } from "react-icons/gr";
import { FaChartLine } from "react-icons/fa6";
import { PiChefHat } from "react-icons/pi";
import { FaInfoCircle } from "react-icons/fa";
import { IoAddCircleOutline } from "react-icons/io5";

import { useNavigate } from 'react-router-dom'
const Navbar = () => {


  const [selected, setSelected] = useState('orders');
  const { setShowLogin, showLogin, user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null)
  }

  return (


    <div className='navbar' >

      <div className='col-3 simple-border'>
        <div className="left-box d-flex align-items-center gap-3 justify-content-center  ">
          <img className='profilepic' src={profileImage} alt="" />
          {user ? (<h3>{user.username}</h3>) : (<h3>Guest</h3>)}
        </div>

      </div>
      <div className=' col-6 simple-border'>
        <div className="middle-box">
          <div className={`nav_icon_box  ${selected === 'orders' ? "selectedboder" : ""}`} onClick={() => {
            setSelected('orders'),
              navigate("/orders")
          }}>
            <FaCartPlus className="nav-icon" />
            <span className="nav-text">Orders</span>
          </div>

          {user ?
            (
              <div className={`nav_icon_box  ${selected === 'addMenu' ? "selectedboder" : ""}`} onClick={() => {
                setSelected('addMenu'),
                  navigate("/addMenu")

              }}>
                <IoAddCircleOutline className="nav-icon" />
                <span className='nav-text'>Add Menu</span>
              </div>
            ) :
            (
              <div className={`nav_icon_box  ${selected === 'menu' ? "selectedboder" : ""}`} onClick={() => {
                setSelected('menu'),
                  navigate("/menu")
              }}>
                <GrCafeteria className="nav-icon" />
                <span className='nav-text'>Menu</span>
              </div>
            )
          }


          <div className={`nav_icon_box  ${selected === 'summary' ? "selectedboder" : ""}`} onClick={() => {
            setSelected('summary'),
              navigate("/summary")
          }}>
            <FaChartLine className="nav-icon" />
            <span className="nav-text">Summary</span>
          </div>

          <div className={`nav_icon_box  ${selected === 'chef' ? "selectedboder" : ""}`} onClick={() => {
            setSelected('chef'),
              navigate("/chef")

          }}>
            <PiChefHat className="nav-icon" />
            <span className="nav-text">Chefs</span>
          </div>
          <div className={`nav_icon_box  ${selected === 'about' ? "selectedboder" : ""}`} onClick={() => {
            setSelected('about'),
              navigate("/about")
          }}>
            <FaInfoCircle className="nav-icon" />
            <span className="nav-text">About</span>
          </div>
        </div>
      </div >
      <div className=' col-3 simple-border'>

        {user ?
          (
            <button onClick={() => logout()} className='btn btn-primary lg-btn '>LOGOUT</button>

          ) :
          (
            <button onClick={() => setShowLogin(true)
            } className='btn btn-primary lg-btn '>
              LOGIN</button>

          )
        }

      </div>
    </div>
  )
}

export default Navbar