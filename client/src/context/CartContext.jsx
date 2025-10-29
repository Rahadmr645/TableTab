import { createContext, useState } from "react";


export const AuthContext = createContext();


export const ContextProvider = ({ children }) => {

  const [quantities, setQuantities] = useState({});
  const [cart, setCart] = useState([]);
 

  const URL = 'http://10.124.132.227:5000';



  const contextValue = {
    URL,
    quantities,
    setQuantities,
    cart,
    setCart,

  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>

  )
}