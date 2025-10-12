import { createContext } from "react";


export const AuthContext = createContext();


export const ContextProvider = ({ children }) => {


    const a = 2;


    const URL = 'http://localhost:4000';

    const contextValue = {
        a,
        URL,

    }

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>

    )
}