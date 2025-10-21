import { createContext, useState, useEffect } from "react";

import { io } from "socket.io-client"
export const AuthContext = createContext();


export const ContextProvider = ({ children }) => {

    const [quantities, setQuantities] = useState({});
    const [cart, setCart] = useState([]);
    const [socket, setSocket] = useState(null);
    
    const URL = 'http://192.168.8.225:5000';

    // connect to socket.io server once
    useEffect(() => {
      const newSocket = io(URL) ;
      
      newSocket.on("connect", () => {
        console.log("connected to socke.io server :", newSocket.id)
      });
      
      newSocket.on("disconnect", () => {
        console.log("disconnected from socket.io server")
      });
      
      setSocket(newSocket);
    },[])
    const contextValue = {
        URL,
        quantities,
        setQuantities,
        cart,
        setCart,
        socket 
    }

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>

    )
}