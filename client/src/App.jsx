import React from 'react'

import './App.css'
import { Routes, Route } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from './context/CartContext.jsx'
import QRGenerator from './components/qrcode/QRGenerator.jsx'
import ManuCard from './components/ManuCard.jsx'


const App = () => {

  const {a} = useContext(AuthContext)
  return (
    <>
      <div>Home</div>
       <QRGenerator/>


       {/* Router section */}
       <Routes>
        <Route path='/menu' element={<ManuCard/>} />
       </Routes>
    </>
  )
}

export default App