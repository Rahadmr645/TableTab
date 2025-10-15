

import Rect, { createContext, useState,useEffect } from 'react';
import { getUserFromToken } from '../utils/decodeToken';


export const AuthContext = createContext();


export const AuthContextProvider = ({ children }) => {


    const [showLogin, setShowLogin] = useState(false);
    const [currState, setCurrState] = useState('Signup')
    const URL = "http://localhost:4000";


    // get user from token

    const [user, setUser] = useState(null)

    useEffect(() => {
        const decoded = getUserFromToken();
        if (decoded) setUser(decoded);
    }, [])


    const contextVelu = {
        showLogin,
        setShowLogin,
        currState,
        setCurrState,
        URL,
        user,
        setUser,

    }


    return <AuthContext.Provider value={contextVelu}>
        {children}
    </AuthContext.Provider>
}