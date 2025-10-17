import React from 'react'

import  './App.css'

import Dashbord from './pages/deshboard/Dashbord'
import Navbar from './components/navbar/Navbar.jsx'
import AppRoutes from './AppRoutes.jsx'
const App = () => {
  return (
    <>
       <Navbar/>
       <AppRoutes/>
       <Dashbord/>
      
     </>
  )
}

export default App