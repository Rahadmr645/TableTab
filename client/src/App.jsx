import React from "react";
import "./App.css";
import { Routes, Route } from "react-router-dom";
import QRGenerator from "./components/qrcode/QRGenerator.jsx";
import MenuList from "./components/menu/MenuList.jsx";
import Checkout from "./pages/checkout/Checkout.jsx";
import OrderBoard from "./pages/orderBoard/OrderBoard.jsx";
import Navbar from "./components/navbar/Navbar.jsx";
import MyOrders from "./pages/myOrder/MyOrders.jsx";
import Home from "./pages/home/Home.jsx";
import About from "./pages/about/About.jsx";

const App = () => {
  return (
    <div className="body-container">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu/:tableId" element={<MenuList />} />
        <Route path="/menu" element={<MenuList />} />
        <Route path="/chackout" element={<Checkout />} />
        <Route path="/orderboard" element={<OrderBoard />} />
        <Route path="/myOrders" element={<MyOrders />} />
        <Route path="/about" element={<About />} />
        <Route path="/qr" element={<QRGenerator />} />
      </Routes>
    </div>
  );
};

export default App;
