import React from 'react'

import './App.css'
import { Routes, Route, Link } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from './context/CartContext.jsx'
import QRGenerator from './components/qrcode/QRGenerator.jsx'

import MenuList from './components/menu/MenuList.jsx';
import Checkout from "./pages/checkout/Checkout.jsx"

import OrderBoard from "./pages/orderBoard/OrderBoard.jsx"

const App = () => {

  const { a } = useContext(AuthContext)

  return (
    <>
      <div>Home</div>
      <QRGenerator />
      <Link to="/orderboard" >Order Board</Link>
       <br />
      <Link to='/menu' className="menu-link">menu</Link>
      {/* Router section */}
      <Routes>
        <Route path='/menu' element={<MenuList />} />
        <Route path="/chackout" element={<Checkout />} />
        <Route path="/orderboard" element={<OrderBoard />} />

      </Routes>
    </>
  )
}

export default App