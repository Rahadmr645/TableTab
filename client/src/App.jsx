import React from "react";
import "./App.css";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import QRGenerator from "./components/qrcode/QRGenerator.jsx";
import MenuList from "./components/menu/MenuList.jsx";
import Checkout from "./pages/checkout/Checkout.jsx";
import OrderBoard from "./pages/orderBoard/OrderBoard.jsx";
import Navbar from "./components/navbar/Navbar.jsx";
import MyOrders from "./pages/myOrder/MyOrders.jsx";
import About from "./pages/about/About.jsx";
import SignUp from "./pages/signup/SignUp.jsx";
import Profile from "./pages/profile/Profile.jsx";

const App = () => {
  const location = useLocation();
  const background = location.state?.background;

  return (
    <div className="body-container">
      <Navbar />
      <Routes location={background || location}>
        <Route path="/" element={<Navigate to="/menu" replace />} />
        <Route path="/menu/:tableId" element={<MenuList />} />
        <Route path="/menu" element={<MenuList />} />
        <Route path="/chackout" element={<Checkout />} />
        <Route path="/orderboard" element={<OrderBoard />} />
        <Route path="/myOrders" element={<MyOrders />} />
        <Route path="/about" element={<About />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/qr" element={<QRGenerator />} />
      </Routes>
      {background && (
        <Routes>
          <Route path="/signup" element={<SignUp />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      )}
    </div>
  );
};

export default App;
