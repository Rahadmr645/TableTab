
import Rect, { createContext, useState, useEffect } from 'react';
import { getUserFromToken } from '../utils/decodeToken';


export const AuthContext = createContext();


export const AuthContextProvider = ({ children }) => {


    const [showLogin, setShowLogin] = useState(false);
    const [showMenuForm, setShowMenuForm] = useState(false);
    const [currState, setCurrState] = useState('Signup')
    const URL = import.meta.env.VITE_API_URL;


    // get admin from token

    const [admin, setAdmin] = useState(null)

    useEffect(() => {
        const decoded = getUserFromToken();
        console.log(decoded)
        if (decoded) setAdmin(decoded);

    }, [])


    const contextVelu = {
        showLogin,
        showMenuForm,
        setShowMenuForm,
        setShowLogin,
        currState,
        setCurrState,
        URL,
        admin,
        setAdmin,

    }


    return <AuthContext.Provider value={contextVelu}>
        {children}
    </AuthContext.Provider>
}