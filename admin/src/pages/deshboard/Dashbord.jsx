import React, { useContext } from 'react'
import Navbar from '../../components/navbar/Navbar'
import Login from '../login/Login';
import { AuthContext } from '../../context/AuthContext';

import {Routes, Route} from 'react-router-dom'
import Menu from '../menu/Menu';

import Chefs from '../chefs/Chefs';
const Dashbord = () => {

  const { showLogin, setShowLogin } = useContext(AuthContext);


  return (
    <div className="admin-login-host">
      {showLogin && <Login />}


      {/* router section */}
      
    </div>
  )
}

export default Dashbord