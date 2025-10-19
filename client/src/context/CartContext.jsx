import { createContext , useState } from "react";


export const AuthContext = createContext();


export const ContextProvider = ({ children }) => {
  
  const [quantities,  setQuantities] = useState({});

    const URL = 'http://192.168.8.225:4000';

    const contextValue = {
        URL,
        quantities,
        setQuantities
    }

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>

    )
}