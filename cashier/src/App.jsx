import React from "react";
import ReceiptPreviewModal from "@shared/ReceiptPreviewModal.jsx";
import { CashierProvider, useCashier } from "./context/CashierContext.jsx";

// Import modular components
import CartPanel from "./components/CartPanel.jsx";
import CatalogPanel from "./components/CatalogPanel.jsx";
import CashierLogin from "./pages/login/CashierLogin.jsx";
import CashierLockScreen from "./pages/lock/CashierLockScreen.jsx";

// Import modular modals
import CustomerModal from "./components/modals/CustomerModal.jsx";
import TableModal from "./components/modals/TableModal.jsx";
import DiscountModal from "./components/modals/DiscountModal.jsx";
import CustomDishModal from "./components/modals/CustomDishModal.jsx";
import CategoryModal from "./components/modals/CategoryModal.jsx";
import ProductModal from "./components/modals/ProductModal.jsx";
import MoreModal from "./components/modals/MoreModal.jsx";
import StaffLoginModal from "./components/modals/StaffLoginModal.jsx";
import LockPinModal from "./components/modals/LockPinModal.jsx";

import "./App.css";

function CashierDashboard() {
  const { 
    lang, 
    mobileView,
    showPrintModal, 
    setShowPrintModal, 
    activePrintOrder,
    currentTenant,
    currentUser,
    token,
    isScreenLocked
  } = useCashier();

  // 1. If not logged in with a staff account, show dedicated login page
  if (!token || !currentUser) {
    return <CashierLogin />;
  }

  // 2. If screen is locked with PIN, show PIN unlock screen
  if (isScreenLocked) {
    return <CashierLockScreen />;
  }

  return (
    <div className={`pos-container ${lang === "ar" ? "rtl" : "ltr"} show-${mobileView}`}>
      {/* 1. LEFT PANEL */}
      <CartPanel />

      {/* 2. RIGHT PANEL */}
      <CatalogPanel />

      {/* 3. MODALS POPUPS */}
      <CustomerModal />
      <TableModal />
      <DiscountModal />
      <CustomDishModal />
      <CategoryModal />
      <ProductModal />
      <MoreModal />
      <StaffLoginModal />
      <LockPinModal />

      {/* 4. SHARED RECEIPT GENERATOR */}
      {showPrintModal && (
        <ReceiptPreviewModal
          order={showPrintModal === true ? activePrintOrder : showPrintModal}
          businessName={currentTenant?.businessName || (lang === "ar" ? "مطعم تيبل تاب" : "TableTab POS")}
          logoUrl=""
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <CashierProvider>
      <CashierDashboard />
    </CashierProvider>
  );
}

export default App;
