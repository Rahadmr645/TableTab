import React, { useContext } from 'react'
import Navbar from '../../components/navbar/Navbar'
import Login from '../login/Login';
import { AuthContext } from '../../context/AuthContext';

const Dashbord = () => {

  const { showLogin, setShowLogin } = useContext(AuthContext);
  return (
    <div style={{height:"200vh"}}>
      <Navbar />
     
      {showLogin && <Login />}

    </div>
  )
}

export default Dashbord