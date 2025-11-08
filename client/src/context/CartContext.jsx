import { createContext, useState } from "react";


export const AuthContext = createContext();


export const ContextProvider = ({ children }) => {

  const [quantities, setQuantities] = useState({});
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [myOrders, setMyOrders] = useState([]);


  const URL = import.meta.env.VITE_API_URL;


  // Remove item from cart & update quantities
  // const handleRemove = (id) => {
  //   setQuantities(prev => ({
  //     ...prev,
  //     [item._id]: Math.max((prev[item._id] || 0) - 1, 0),
  //   }));

  //   setCart(prevCart => {
  //     return prevCart
  //       .map(i =>
  //         i._id === item._id
  //           ? { ...i, quantity: Math.max(i.quantity - 1, 0) }
  //           : i
  //       )
  //       .filter(i => i.quantity > 0); // remove items with 0 quantity
  //   });
  // };


  const handleRemove = (id) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max((prev[id] || 0) - 1, 0),
    }));


    setCart(prevCart =>
      prevCart
        .map(i => i._id == id
          ? { ...i, quantity: Math.max(i.quantity - 1, 0) }
          : i
        )
        .filter(i => i.quantity > 0)
    );
  };

  const contextValue = {
    URL,
    quantities,
    setQuantities,
    cart,
    setCart,
    user,
    setUser,
    myOrders,
    setMyOrders,
    handleRemove,

  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>

  )
}