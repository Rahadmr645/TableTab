

import Rect, { createContext, useState,useEffect } from 'react';
import { getUserFromToken } from '../utils/decodeToken';


export const AuthContext = createContext();


export const AuthContextProvider = ({ children }) => {


    const [showLogin, setShowLogin] = useState(false);
    const [showMenuForm, setShowMenuForm] = useState(false);
    const [currState, setCurrState] = useState('Signup')
    const URL = "http://192.168.8.225:5000";


    // get user from token

    const [user, setUser] = useState(null)

    useEffect(() => {
        const decoded = getUserFromToken();
        console.log(decoded)
        if (decoded) setUser(decoded);
        
    }, [])


    const contextVelu = {
        showLogin,
        showMenuForm,
        setShowMenuForm,
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