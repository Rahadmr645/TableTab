import React from "react";
import ReceiptPreviewModal from "@shared/ReceiptPreviewModal.jsx";
import { CashierProvider, useCashier } from "./context/CashierContext.jsx";

// Import modular components
import CartPanel from "./components/CartPanel.jsx";
import CatalogPanel from "./components/CatalogPanel.jsx";



// Import modular modals
import CustomerModal from "./components/modals/CustomerModal.jsx";
import TableModal from "./components/modals/TableModal.jsx";
import DiscountModal from "./components/modals/DiscountModal.jsx";
import CustomDishModal from "./components/modals/CustomDishModal.jsx";
import CategoryModal from "./components/modals/CategoryModal.jsx";
import ProductModal from "./components/modals/ProductModal.jsx";
import MoreModal from "./components/modals/MoreModal.jsx";

import "./App.css";

function CashierDashboard() {
  const { 
    lang, 
    mobileView,
    showPrintModal, 
    setShowPrintModal, 
    activePrintOrder 
  } = useCashier();

  return (
    <div className={`pos-container ${lang === "ar" ? "rtl" : ""} show-${mobileView}`}>
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



      {/* 4. SHARED RECEIPT GENERATOR */}
      {showPrintModal && (
        <ReceiptPreviewModal
          order={showPrintModal === true ? activePrintOrder : showPrintModal}
          businessName="TableTab POS Terminal"
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
