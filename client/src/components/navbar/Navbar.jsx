import React, { useContext } from 'react'
import './Navbar.css'
import logo from '../../assets/icons/logo.png'
import { NavLink } from 'react-router-dom'
import { MdCoffeeMaker } from "react-icons/md";
import { IoCart } from "react-icons/io5";
import { PiReadCvLogo } from "react-icons/pi";
import { TbBrandApplePodcast } from "react-icons/tb";
import { AuthContext } from '../../context/CartContext';
const Navbar = () => {

    const { cart } = useContext(AuthContext);


    return (
        <div className='navabr-container'>
            <div className='left-side'>
                <img src={logo} alt="" />
                <span>TableTab</span>
            </div>
            <div className='middle-side'>
                <div className='nav-box'>
                    <NavLink className='navLink' to='/menu' >
                        <span>Menu</span>
                        <MdCoffeeMaker />
                    </NavLink>
                </div>
                <div className='nav-box'>
                    <NavLink className={`navLink, ${cart.length > 0 ? "active" : "disble"}`} to={cart.length > 0 ? "/chackout" : "#"}
                        onClick={(e) => {
                            if (cart.length === 0) {
                                e.preventDefault();
                                alert("You need to add something in your card")
                            }
                        }} >
                        <span>Cart</span>
                        <IoCart className='icon' />
                    </NavLink>
                </div>
                <div className='nav-box'>
                    <NavLink className='navLink' to='/myOrders' >
                        <span>MyOrders</span>
                        <PiReadCvLogo className='icon' />
                    </NavLink>
                </div>
                <div className='nav-box'>
                    <NavLink className="navLink" to='/about' >
                        <span>About Us</span>
                        <TbBrandApplePodcast />
                    </NavLink>
                </div>
            </div>

            <div className='right-side'>
                <button>SingUp</button>
            </div>

        </div>
    )
}

export default Navbar