import React from "react";

import { Routes, Route } from "react-router-dom";
import Dashbord from "./pages/deshboard/Dashbord";
import Login from "./pages/login/Login";

import ProtectRoutes from "./utils/ProtectRoutes.jsx";
import Chefs from "./pages/chefs/Chefs";
import Menu from "./pages/menu/Menu";
import Orders from "./pages/orders/Orders";
import UpdateProfilePic from "./components/updateProfilePic/UpdateProfilePic";
import VerifyOtp from "./pages/verifyotp/VerifyOtp.jsx";
import Summary from "./pages/summary/Summary.jsx";
import BarcodeMenu from "./pages/barcode/BarcodeMenu.jsx";
import Profile from "./pages/profile/Profile.jsx";

const AppRoutes = () => {
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectRoutes>
              <Dashbord />
            </ProtectRoutes>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/summary" element={<Summary />} />
        <Route
          path="/barcode"
          element={
            <ProtectRoutes>
              <BarcodeMenu />
            </ProtectRoutes>
          }
        />
        <Route path="/chef" element={<Chefs />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile-pic" element={<UpdateProfilePic />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
      </Routes>
    </>
  );
};

export default AppRoutes;
