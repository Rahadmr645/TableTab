import React,{useContext} from 'react'
import CartItem from '../../components/CartItem/CartItem.jsx'

import { AuthContext } from "../../context/CartContext";
import './Checkout.css'
const Checkout = () => {
  const {cart} = useContext(AuthContext)
  
  const subTotal = cart.reduce((acc, item) =>
  acc + item.price * item.quantity, 0
  );
  return (
    <div className="cartItem">
      Checkout
      
      <div className="checkout_nav">
        <ul>
          <li>image</li>
          <li>Name</li>
          <li>Price</li>
          <li>Quantity</li>
          <li>Total</li>
          <li>Cancel</li>
        </ul>
      </div>
      <hr />
      
     
    {
      cart.length > 0 ? 
      <div className="cart-container">
         {cart.map((item,index) =>{
         return (
            <CartItem key={index} name={item.name} price={item.price} id={item._id} quantity={item.quantity} image={item.image}/>
              
         ) ;
        })}
   
      </div>: <>You Don't Have any order Yet</>
    }
     <div className="subtotal"><h3>SubTotatl : {subTotal.toFixed(2)}</h3></div>
    <div className="pobtn">
      <button>Palce Order</button>
    </div>
    
    </div>
  )
}

export default Checkout