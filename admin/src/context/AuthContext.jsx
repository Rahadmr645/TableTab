

import Rect, { createContext, useState } from 'react';


export const AuthContext = createContext();


export const AuthContextProvider = ({ children }) => {


    const [showLogin, setShowLogin] = useState(false);
    const [currState, setCurrState] = useState('Signup')
    const URL = "http://localhost:4000";

    const contextVelu = {
        showLogin,
        setShowLogin,
        currState,
        setCurrState,
        URL,

    }


    return <AuthContext.Provider value={contextVelu}>
        {children}
    </AuthContext.Provider>
}