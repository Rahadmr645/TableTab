import React from 'react'
import './Navbar.css'

import profileImage from '../../assets/icons/profileTabletab.png'
import { useState, useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'



const Navbar = () => {


  const [selected, setSelected] = useState('orders');
  const { setShowLogin, showLogin } = useContext(AuthContext);


  return (


    <div className='navbar' >

      <div className='col-3 simple-border'>
        <div className="left-box d-flex align-items-center gap-3 justify-content-center  ">
          <img className='profilepic' src={profileImage} alt="" />
          <h3>MD RAHAD </h3>
        </div>

      </div>
      <div className=' col-6 simple-border'>
        <div className="middle-box">

          <a className={selected === 'orders' ? "selectedboder" : ""} onClick={() => setSelected('orders')} href="#">Orders</a>
          <a className={selected === 'menu' ? "selectedboder" : ""} onClick={() => setSelected('menu')} href="menu">Menu</a>
          <a className={selected === 'summary' ? "selectedboder" : ""} onClick={() => setSelected('summary')} href="#">Summary</a>
          <a className={selected === 'chef' ? "selectedboder" : ""} onClick={() => setSelected('chef')} href="#">Chefs</a>
          <a className={selected === 'about' ? "selectedboder" : ""} onClick={() => setSelected('about')} href="#">About</a>
        </div>
      </div >
      <div className=' col-3 simple-border'>
        <button onClick={() => setShowLogin(true)
        } className='btn btn-primary '>LOGIN</button>
      </div>
    </div>
  )
}

export default Navbar