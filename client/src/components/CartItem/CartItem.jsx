import React, { useContext } from 'react'

import { AuthContext } from "../../context/CartContext";
import './CartItem.css'
const CartItem = ({ name, id, price, quantity, image }) => {

  const { URL, handleRemove } = useContext(AuthContext);
  const Total = price * quantity;
  return (
    <>
      <div className="cart-container">
        <div className="cartItem-box">
          <div className="cartImage">
            <img src={`${URL}${image}`} alt="" />

          </div>
          <div className="name_container">
            <p>{name}</p>
            <p>{quantity}</p>
            <p>{price}</p>
            <p>{Total}/-</p>
            <p onClick={() => handleRemove(id)}>X</p>
          </div>
        </div>
        <hr className='hr' style={{ color: "rgba(255,255,255,0.2)" }} />
      </div>

    </>
  )
}

export default CartItem;