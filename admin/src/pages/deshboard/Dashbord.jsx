import React, { useContext } from 'react'
import Navbar from '../../components/navbar/Navbar'
import Login from '../login/Login';
import { AuthContext } from '../../context/AuthContext';

import {Routes, Route} from 'react-router-dom'
import Menu from '../menu/Menu';
import Order from '../../../../server/models/OrderModel';
import Chefs from '../chefs/Chefs';
const Dashbord = () => {

  const { showLogin, setShowLogin } = useContext(AuthContext);


  return (
    <div style={{ height: "200vh" , position:'relative'}}>
      {showLogin && <Login />}


      {/* router section */}
      
    </div>
  )
}

export default Dashbord