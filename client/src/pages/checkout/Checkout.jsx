import React, { useContext, useState } from 'react'
import CartItem from '../../components/CartItem/CartItem.jsx'
import { AuthContext } from "../../context/CartContext";
import './Checkout.css'
import axios from 'axios'

const Checkout = () => {
  const { cart, setCart, URL } = useContext(AuthContext);
  const [popup, setPopup] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [tableId, setTableId] = useState("");
  const [loading, setLoading] = useState(false);


  // total 
  const subTotal = cart.reduce((acc, item) =>
    acc + item.price * item.quantity, 0
  );


  // handle place order
  const handlePlaceOrder = async () => {
    if (!customerName || !tableId) {
      alert("Please Enter your name and tableID")
      return;
    }


    setLoading(true);

    // append the data 
    try {
      const orderFormData = new FormData();
      orderFormData.append("customerName", customerName);
      orderFormData.append("tableId", tableId);
      orderFormData.append("items", JSON.stringify(cart));
      orderFormData.append("totalPrice", subTotal);


      const res = await axios.post(`${URL}/api/order/create-order/`,
        orderFormData,
        { headers: { 'Content-Type': "application/json" } }
      );

      alert("Ordr placed successfully")
      console.log(res.data);

      // clearing the cart 
      setCart([]);
      setPopup(false);

    } catch (error) {
      alert("faild to place order")
      console.error(error)
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="cartItem">
      <div className="checkout_nav">
        <ul>
          <li>image</li>
          <li>Name</li>
          <li>Quantity</li>
          <li>Price</li>
          <li>Total</li>
          <li>Cancel</li>
        </ul>
      </div>
      <hr />


      {
        cart.length > 0 ?
          <div className="cart-container">
            {cart.map((item, index) => {
              return (
                <CartItem key={index} name={item.name} price={item.price} id={item._id} quantity={item.quantity} image={item.image} />

              );
            })}

          </div> : <>You Don't Have any order Yet</>
      }
      <div className="subtotal"><h3>SubTotal: {`${subTotal.toFixed(2)}/-`}</h3></div>
      <div className="pobtn">
        <button onClick={() => setPopup(true)}>Palce Order
        </button>
      </div>

      {popup && (
        <div className="popup">
          <div className="popup-content">
            <h3>Enter your Name and Table Number</h3>
            <input type="text" placeholder='Your name' value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <input type="number" placeholder='Your table number' value={tableId} onChange={(e) => setTableId(e.target.value)} />
          </div>
          <div className="popup-buttons">
            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className='confirm-btn'
            >
              {loading ? "placing..." : "confirm order"}

            </button>
            <button onClick={() => setPopup(false)} className='cancel-btn'>
              Cancel
            </button>
          </div>
        </div>
      )}


    </div>
  )
}

export default Checkout