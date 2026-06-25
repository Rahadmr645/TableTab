import React, { useContext } from 'react'

import { AuthContext } from "../../context/CartContext";
import { resolveAssetUrl } from "../../utils/mediaUrl.js";
import SaudiRiyalSymbol from "../currency/SaudiRiyalSymbol.jsx";
import './CartItem.css'
const CartItem = ({ name, id, price, quantity, image }) => {

  const { URL, handleRemove, incrementQuantity } = useContext(AuthContext);
  const Total = price * quantity;
  return (
    <>
      <div className="cart-container">
        <div className="cartItem-box">
          <div className="cartImage">
            <button
              type="button"
              className="cart-image-add"
              onClick={() => incrementQuantity(id)}
              aria-label={`Add one ${name} — ${quantity} in cart`}
            >
              <img
                src={resolveAssetUrl(URL, image)}
                alt=""
                draggable={false}
              />
            </button>
          </div>
          <p className="cart-col-name">{name}</p>
          <p className="cart-col-qty">{quantity}</p>
          <p className="cart-col-price cart-sar-num">
            <span>{price}</span>
            <SaudiRiyalSymbol />
          </p>
          <p className="cart-col-total cart-sar-num">
            <span>{Total}</span>
            <SaudiRiyalSymbol />
          </p>
          <p
            className="cart-col-remove"
            onClick={() => handleRemove(id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleRemove(id)}
            aria-label={`Remove ${name}`}
          >
            ×
          </p>
        </div>
        <hr className="hr" />
      </div>

    </>
  )
}

export default CartItem;