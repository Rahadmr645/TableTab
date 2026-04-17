import React, { useContext } from 'react'

import { AuthContext } from "../../context/CartContext";
import { resolveAssetUrl } from "../../utils/mediaUrl.js";
import './CartItem.css'
const CartItem = ({ name, id, price, quantity, image }) => {

  const { URL, handleRemove } = useContext(AuthContext);
  const Total = price * quantity;
  return (
    <>
      <div className="cart-container">
        <div className="cartItem-box">
          <div className="cartImage">
            <img src={resolveAssetUrl(URL, image)} alt="" />

          </div>
          <div className="name_container">
            <p className="col-name">{name}</p>
            <p>{quantity}</p>
            <p>{price}</p>
            <p>{Total}/-</p>
            <p
              className="col-remove"
              onClick={() => handleRemove(id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleRemove(id)}
              aria-label={`Remove ${name}`}
            >
              ×
            </p>
          </div>
        </div>
        <hr className="hr" />
      </div>

    </>
  )
}

export default CartItem;