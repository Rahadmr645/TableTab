import React, { useState, useMemo } from "react";
import { useCashier } from "../../context/CashierContext.jsx";
import "./DailySalesModal.css";

export default function DailySalesModal() {
  const {
    showDailySalesModal,
    setShowDailySalesModal,
    lang,
    currentTenant,
    currentUser,
    placedOrders,
    loadServerData,
    setShowPrintModal
  } = useCashier();

  // Helper date generators (YYYY-MM-DD)
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayString);
  const [reportView, setReportView] = useState("slip"); // "slip" | "products" | "invoices"
  const [searchFilter, setSearchFilter] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onClose = () => setShowDailySalesModal(false);

  // Format date display: YYYY/MM/DD
  const formattedBusinessDate = selectedDate.replace(/-/g, "/");

  const fmtCurrency = (num) => {
    const n = Number(num) || 0;
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Current printed time formatting (e.g. 2026/08/30 01:45:52 PM)
  const formatDateTime = (date) => {
    const d = date || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, "0");

    return `${y}/${m}/${day} ${strHours}:${minutes}:${seconds} ${ampm}`;
  };

  // ----------------------------------------------------
  // Filter Orders For Selected Day
  // ----------------------------------------------------
  const dayOrders = useMemo(() => {
    return (placedOrders || []).filter((ord) => {
      if (!ord) return false;
      if (ord.businessDay && ord.businessDay === selectedDate) return true;
      if (ord.createdAt) {
        const d = new Date(ord.createdAt);
        if (!isNaN(d.getTime())) {
          const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0 daylight" ? 2 : 2)}`;
          const fullYmd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          if (fullYmd === selectedDate) return true;
          if (d.toISOString().slice(0, 10) === selectedDate) return true;
        }
      }
      if (ord.date) {
        const d = new Date(ord.date);
        if (!isNaN(d.getTime())) {
          const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          if (ymd === selectedDate) return true;
        }
      }
      return false;
    });
  }, [placedOrders, selectedDate]);

  // ----------------------------------------------------
  // Financial Calculations (Foodics Orders Summary Standards)
  // ----------------------------------------------------
  const isPaidOrRefunded = (ord) => {
    const pStatus = String(ord.paymentStatus || "").toLowerCase();
    const status = String(ord.status || "").toLowerCase().replace(/\s+/g, "");
    if (status === "cancelled" && (!ord.refundedAmount || ord.refundedAmount === 0) && pStatus !== "refunded") {
      return false;
    }
    return (
      pStatus === "paid" ||
      pStatus === "refunded" ||
      status === "finished" ||
      status === "finised" ||
      Number(ord.refundedAmount) > 0
    );
  };

  const isCurrentlyPaid = (ord) => {
    const pStatus = String(ord.paymentStatus || "").toLowerCase();
    const status = String(ord.status || "").toLowerCase().replace(/\s+/g, "");
    if (status === "cancelled" || pStatus === "refunded") return false;
    return pStatus === "paid" || status === "finished" || status === "finised";
  };

  // Gross orders (all orders that were paid/completed during this shift, before any refund was issued)
  const grossOrders = useMemo(() => dayOrders.filter(isPaidOrRefunded), [dayOrders]);
  const currentlyPaidOrders = useMemo(() => dayOrders.filter(isCurrentlyPaid), [dayOrders]);

  // Gross Sales (Total value of all orders before refunds)
  const grossQuantity = grossOrders.length;
  const grossSales = useMemo(
    () => grossOrders.reduce((sum, ord) => sum + (Number(ord.totalPrice) || 0), 0),
    [grossOrders]
  );

  // VAT 15% separation
  const grossSalesWithoutTax = grossSales / 1.15;
  const totalTaxes = grossSales - grossSalesWithoutTax;

  // Discounts
  const totalDiscounts = useMemo(() => {
    return grossOrders.reduce((sum, ord) => sum + (Number(ord.discountAmount) || 0), 0);
  }, [grossOrders]);
  const discountCount = grossOrders.filter((ord) => (Number(ord.discountAmount) || 0) > 0).length;

  // Charges
  const totalCharges = 0;

  // Refunds Breakdown (Cash vs Card)
  const refundedOrders = useMemo(() => {
    return dayOrders.filter(
      (ord) =>
        Number(ord.refundedAmount) > 0 ||
        ord.paymentStatus === "refunded" ||
        ord.refundStatus === "succeeded"
    );
  }, [dayOrders]);

  const cashRefunds = useMemo(() => {
    return refundedOrders.reduce((sum, ord) => {
      const refMethod = (ord.refundMethod || "").toLowerCase();
      const payMethod = (ord.paymentMethod || "").toLowerCase();
      if (Number(ord.refundCashAmount) > 0) return sum + Number(ord.refundCashAmount);
      if (refMethod === "cash" || (!refMethod && payMethod === "cash")) {
        return sum + (Number(ord.refundedAmount) || Number(ord.totalPrice) || 0);
      }
      return sum;
    }, 0);
  }, [refundedOrders]);

  const cardRefunds = useMemo(() => {
    return refundedOrders.reduce((sum, ord) => {
      const refMethod = (ord.refundMethod || "").toLowerCase();
      const payMethod = (ord.paymentMethod || "").toLowerCase();
      if (Number(ord.refundCardAmount) > 0) return sum + Number(ord.refundCardAmount);
      if (refMethod === "card" || (!refMethod && payMethod === "card")) {
        return sum + (Number(ord.refundedAmount) || Number(ord.totalPrice) || 0);
      }
      return sum;
    }, 0);
  }, [refundedOrders]);

  const totalRefunds = cashRefunds + cardRefunds;
  const refundsCount = refundedOrders.length;

  // Net Sales (Gross - Total Refunds - Total Discounts)
  const netSales = Math.max(0, grossSales - totalRefunds - totalDiscounts);
  const netQuantity = Math.max(0, grossQuantity - refundsCount);

  // Payments Breakdown (Gross & Net after deducting respective cash/card refunds)
  const grossCashSales = useMemo(() => {
    return grossOrders.reduce((sum, ord) => {
      const method = String(ord.paymentMethod || "").toLowerCase();
      if (method === "cash") return sum + (Number(ord.cashAmount) || Number(ord.totalPrice) || 0);
      if (method === "split") return sum + (Number(ord.cashAmount) || 0);
      return sum;
    }, 0);
  }, [grossOrders]);

  const grossCardSales = useMemo(() => {
    return grossOrders.reduce((sum, ord) => {
      const method = String(ord.paymentMethod || "").toLowerCase();
      if (method === "card") return sum + (Number(ord.cardAmount) || Number(ord.totalPrice) || 0);
      if (method === "split") return sum + (Number(ord.cardAmount) || 0);
      return sum;
    }, 0);
  }, [grossOrders]);

  // Net Cash (in Drawer) and Net Card Sales
  const netCashSales = Math.max(0, grossCashSales - cashRefunds);
  const netCardSales = Math.max(0, grossCardSales - cardRefunds);

  const cashOrdersCount = grossOrders.filter((o) => (o.paymentMethod || "").toLowerCase() === "cash").length;
  const cardOrdersCount = grossOrders.filter((o) => (o.paymentMethod || "").toLowerCase() === "card").length;

  // Product breakdown calculation
  const productSalesMap = useMemo(() => {
    const map = {};
    for (const ord of currentlyPaidOrders) {
      const items = ord.items || [];
      for (const it of items) {
        const name = it.name || it.nameAr || it.nameEn || "Custom Item";
        const qty = Math.max(1, Number(it.quantity) || 1);
        const price = Number(it.price) || 0;
        const total = price * qty;

        if (!map[name]) {
          map[name] = {
            name,
            qty: 0,
            unitPrice: price,
            totalRevenue: 0
          };
        }
        map[name].qty += qty;
        map[name].totalRevenue += total;
      }
    }
    return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [currentlyPaidOrders]);

  // Refresh data handler
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    if (loadServerData) {
      await loadServerData();
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Branch Code (e.g. B01)
  const branchCode = currentTenant?.slug ? currentTenant.slug.slice(0, 3).toUpperCase() : "B01";

  // ----------------------------------------------------
  // 80mm Thermal Receipt Printing (Slip Report)
  // ----------------------------------------------------
  const handlePrintSlip = () => {
    const printWindow = window.open("", "_blank", "width=400,height=750");
    if (!printWindow) {
      window.print();
      return;
    }
    const reportHtml = `
      <!DOCTYPE html>
      <html dir="ltr">
      <head>
        <title>Orders Summary - ${selectedDate}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            padding: 16px; 
            margin: 0 auto; 
            color: #111827; 
            font-size: 13px; 
            width: 80mm;
            box-sizing: border-box;
          }
          .center { text-align: center; }
          .bold { font-weight: 700; }
          .title-code { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
          .title-main { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
          .meta-text { font-size: 12px; color: #374151; margin: 2px 0; }
          .divider { border-top: 1px solid #111827; margin: 10px 0; }
          .section-heading { font-size: 14px; font-weight: 700; text-align: center; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 12px; }
          th { padding: 4px 0; font-weight: 700; border-bottom: 1px solid #e5e7eb; }
          td { padding: 5px 0; }
          .text-left { text-align: left; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          @media print { 
            body { width: 80mm; padding: 2px; margin: 0; } 
          }
        </style>
      </head>
      <body>
        <div class="center title-code">${branchCode}</div>
        <div class="center title-main">Orders Summary</div>
        <div class="center meta-text">Business Date: ${formattedBusinessDate}</div>
        <div class="center meta-text">Opened at: ${formattedBusinessDate} 12:00:00 AM</div>
        <div class="center meta-text">Printed at: ${formatDateTime(new Date())}</div>
        
        <div class="divider"></div>
        <div class="section-heading">General</div>
        
        <table>
          <thead>
            <tr>
              <th class="text-left">Name</th>
              <th class="text-center" style="width: 60px;">Quantity</th>
              <th class="text-right" style="width: 80px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-left">Gross Sales</td>
              <td class="text-center">${grossQuantity}</td>
              <td class="text-right">﷼ ${fmtCurrency(grossSales)}</td>
            </tr>
            <tr>
              <td class="text-left">Gross Sales Without Tax</td>
              <td class="text-center">${grossQuantity}</td>
              <td class="text-right">﷼ ${fmtCurrency(grossSalesWithoutTax)}</td>
            </tr>
            <tr>
              <td class="text-left">Total Discounts</td>
              <td class="text-center">${discountCount}</td>
              <td class="text-right">﷼ ${fmtCurrency(totalDiscounts)}</td>
            </tr>
            ${totalRefunds > 0 ? `
            <tr style="color: #b91c1c; font-weight: 600;">
              <td class="text-left">Total Returns (Refunds)</td>
              <td class="text-center">${refundsCount}</td>
              <td class="text-right">-﷼ ${fmtCurrency(totalRefunds)}</td>
            </tr>
            ` : ""}
            <tr>
              <td class="text-left">Total Charges</td>
              <td class="text-center">0</td>
              <td class="text-right">﷼ 0.00</td>
            </tr>
            <tr>
              <td class="text-left">Total Taxes</td>
              <td class="text-center">-</td>
              <td class="text-right">﷼ ${fmtCurrency(totalTaxes)}</td>
            </tr>
            <tr style="font-weight: 700;">
              <td class="text-left">Net Sales</td>
              <td class="text-center">${netQuantity}</td>
              <td class="text-right">﷼ ${fmtCurrency(netSales)}</td>
            </tr>
          </tbody>
        </table>

        <div class="divider"></div>
        <div class="section-heading">Payment Methods</div>
        <table>
          <thead>
            <tr>
              <th class="text-left">Method</th>
              <th class="text-center" style="width: 60px;">Quantity</th>
              <th class="text-right" style="width: 80px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-left">Cash (Net in Drawer)</td>
              <td class="text-center">${cashOrdersCount}</td>
              <td class="text-right">﷼ ${fmtCurrency(netCashSales)}</td>
            </tr>
            <tr>
              <td class="text-left">Card / POS (Net)</td>
              <td class="text-center">${cardOrdersCount}</td>
              <td class="text-right">﷼ ${fmtCurrency(netCardSales)}</td>
            </tr>
            ${cashRefunds > 0 ? `
            <tr style="font-size: 11px; color: #b91c1c;">
              <td class="text-left" style="padding-left: 8px;">↳ Cash Refunds Out</td>
              <td class="text-center">-</td>
              <td class="text-right">-﷼ ${fmtCurrency(cashRefunds)}</td>
            </tr>
            ` : ""}
            ${cardRefunds > 0 ? `
            <tr style="font-size: 11px; color: #b91c1c;">
              <td class="text-left" style="padding-left: 8px;">↳ Card Refunds Out</td>
              <td class="text-center">-</td>
              <td class="text-right">-﷼ ${fmtCurrency(cardRefunds)}</td>
            </tr>
            ` : ""}
          </tbody>
        </table>

        <div class="divider"></div>
        <div class="section-heading">Taxes Breakdown</div>
        <table>
          <thead>
            <tr>
              <th class="text-left">Tax Name</th>
              <th class="text-center" style="width: 60px;">Rate</th>
              <th class="text-right" style="width: 80px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-left">VAT 15%</td>
              <td class="text-center">15%</td>
              <td class="text-right">﷼ ${fmtCurrency(totalTaxes)}</td>
            </tr>
          </tbody>
        </table>

        <div class="divider"></div>
        <div class="center meta-text" style="margin-top: 10px; font-size: 11px;">
          ${currentTenant?.businessName || "TableTab POS"} • Cashier: ${currentUser?.username || "Staff"}
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); };
        <\/script>
      </body>
      </html>
    `;
    printWindow.document.write(reportHtml);
    printWindow.document.close();
  };

  if (!showDailySalesModal) return null;

  return (
    <div className="daily-sales-overlay" onClick={onClose}>
      <div className="daily-sales-modal" onClick={(e) => e.stopPropagation()}>
        {/* =========================================
            AUTHENTIC TOP BAR (Print | View Report | Back)
        ========================================= */}
        <div className="daily-sales-header">
          {/* Print Button */}
          <button type="button" className="nav-btn" onClick={handlePrintSlip}>
            {lang === "ar" ? "طباعة" : "Print"}
          </button>

          {/* Center Title */}
          <h3 className="modal-title">
            {lang === "ar" ? "عرض التقرير" : "View Report"}
          </h3>

          {/* Back Button */}
          <button type="button" className="nav-btn" onClick={onClose}>
            {lang === "ar" ? "رجوع" : "Back"}
          </button>
        </div>

        {/* =========================================
            DATE SELECTOR BAR (Today, Yesterday, Picker, Refresh)
        ========================================= */}
        <div className="daily-sales-datebar">
          {/* Presets */}
          <div className="preset-group">
            <button
              type="button"
              className={`preset-btn ${selectedDate === getTodayString() ? "active" : ""}`}
              onClick={() => setSelectedDate(getTodayString())}
            >
              {lang === "ar" ? "اليوم" : "Today"}
            </button>
            <button
              type="button"
              className={`preset-btn ${selectedDate === getYesterdayString() ? "active" : ""}`}
              onClick={() => setSelectedDate(getYesterdayString())}
            >
              {lang === "ar" ? "أمس" : "Yesterday"}
            </button>
          </div>

          {/* Date Picker Input & Refresh */}
          <div className="date-controls">
            <input
              type="date"
              className="date-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />

            <button
              type="button"
              className="refresh-btn"
              onClick={handleRefresh}
              title={lang === "ar" ? "تحديث البيانات" : "Refresh Data"}
            >
              🔄
            </button>
          </div>
        </div>

        {/* =========================================
            SLIP CONTENT / SCROLLABLE BODY
        ========================================= */}
        <div className="daily-sales-body">
          {/* Sub Navigation for View (Slip | Items | Invoices) */}
          <div className="daily-sales-tabs">
            <button
              type="button"
              className={`tab-btn ${reportView === "slip" ? "active" : ""}`}
              onClick={() => setReportView("slip")}
            >
              {lang === "ar" ? "ملخص الوردية (Slip)" : "Orders Summary"}
            </button>
            <button
              type="button"
              className={`tab-btn ${reportView === "products" ? "active" : ""}`}
              onClick={() => setReportView("products")}
            >
              {lang === "ar" ? "الأصناف المباعة" : "Products Sold"}
            </button>
            <button
              type="button"
              className={`tab-btn ${reportView === "invoices" ? "active" : ""}`}
              onClick={() => setReportView("invoices")}
            >
              {lang === "ar" ? "سجل الفواتير" : "Invoices Log"}
            </button>
          </div>

          {/* VIEW 1: AUTHENTIC ORDERS SUMMARY SLIP (SECOND PHOTO) */}
          {reportView === "slip" && (
            <div>
              {/* Slip Header */}
              <div className="slip-header">
                <div className="branch-code">{branchCode}</div>
                <div className="report-title">Orders Summary</div>
                <div className="meta-row">Business Date: {formattedBusinessDate}</div>
                <div className="meta-row">Opened at: {formattedBusinessDate} 12:00:00 AM</div>
                <div className="meta-row">Printed at: {formatDateTime(new Date())}</div>
              </div>

              {/* Black Line Divider */}
              <hr className="slip-divider" />

              {/* General Section Heading */}
              <div className="slip-section-title">General</div>

              {/* 3-Column General Table */}
              <table className="slip-table">
                <thead>
                  <tr>
                    <th className="col-name">Name</th>
                    <th className="col-qty">Quantity</th>
                    <th className="col-amount">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="col-name">Gross Sales</td>
                    <td className="col-qty">{grossQuantity}</td>
                    <td className="col-amount">﷼ {fmtCurrency(grossSales)}</td>
                  </tr>
                  <tr>
                    <td className="col-name">Gross Sales Without Tax</td>
                    <td className="col-qty">{grossQuantity}</td>
                    <td className="col-amount">﷼ {fmtCurrency(grossSalesWithoutTax)}</td>
                  </tr>
                  <tr>
                    <td className="col-name">Total Discounts</td>
                    <td className="col-qty">{discountCount}</td>
                    <td className="col-amount">﷼ {fmtCurrency(totalDiscounts)}</td>
                  </tr>
                  {totalRefunds > 0 && (
                    <tr style={{ color: "#ef4444", fontWeight: "600" }}>
                      <td className="col-name">Total Returns (Refunds)</td>
                      <td className="col-qty">{refundsCount}</td>
                      <td className="col-amount">-﷼ {fmtCurrency(totalRefunds)}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="col-name">Total Charges</td>
                    <td className="col-qty">0</td>
                    <td className="col-amount">﷼ 0.00</td>
                  </tr>
                  <tr>
                    <td className="col-name">Total Taxes</td>
                    <td className="col-qty">-</td>
                    <td className="col-amount">﷼ {fmtCurrency(totalTaxes)}</td>
                  </tr>
                  <tr style={{ fontWeight: "800" }}>
                    <td className="col-name">Net Sales</td>
                    <td className="col-qty">{netQuantity}</td>
                    <td className="col-amount">﷼ {fmtCurrency(netSales)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Payment Methods Section */}
              <hr className="slip-divider" />
              <div className="slip-section-title">Payment Methods</div>

              <table className="slip-table">
                <thead>
                  <tr>
                    <th className="col-name">Method</th>
                    <th className="col-qty">Quantity</th>
                    <th className="col-amount">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="col-name">Cash (Net in Drawer)</td>
                    <td className="col-qty">{cashOrdersCount}</td>
                    <td className="col-amount">﷼ {fmtCurrency(netCashSales)}</td>
                  </tr>
                  <tr>
                    <td className="col-name">Card / POS (Net)</td>
                    <td className="col-qty">{cardOrdersCount}</td>
                    <td className="col-amount">﷼ {fmtCurrency(netCardSales)}</td>
                  </tr>
                  {cashRefunds > 0 && (
                    <tr style={{ fontSize: "11px", color: "#ef4444" }}>
                      <td className="col-name" style={{ paddingLeft: "10px" }}>↳ Cash Refunds Out</td>
                      <td className="col-qty">-</td>
                      <td className="col-amount">-﷼ {fmtCurrency(cashRefunds)}</td>
                    </tr>
                  )}
                  {cardRefunds > 0 && (
                    <tr style={{ fontSize: "11px", color: "#ef4444" }}>
                      <td className="col-name" style={{ paddingLeft: "10px" }}>↳ Card Refunds Out</td>
                      <td className="col-qty">-</td>
                      <td className="col-amount">-﷼ {fmtCurrency(cardRefunds)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Taxes Breakdown Section */}
              <hr className="slip-divider" />
              <div className="slip-section-title">Taxes</div>

              <table className="slip-table">
                <thead>
                  <tr>
                    <th className="col-name">Tax Rate</th>
                    <th className="col-qty">Taxable</th>
                    <th className="col-amount">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="col-name">VAT 15%</td>
                    <td className="col-qty">﷼ {fmtCurrency(grossSalesWithoutTax)}</td>
                    <td className="col-amount">﷼ {fmtCurrency(totalTaxes)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 2: PRODUCTS SOLD DETAILS */}
          {reportView === "products" && (
            <div>
              <div style={{ fontSize: "14px", fontWeight: "800", marginBottom: "12px", color: "#1e293b" }}>
                {lang === "ar" ? "الأصناف الأكثر مبيعاً" : "Top Selling Products"} ({productSalesMap.length})
              </div>
              {productSalesMap.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                  {lang === "ar" ? "لا توجد مبيعات أصناف مسجلة لهذا التاريخ" : "No product sales recorded for this date."}
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #cbd5e1", color: "#475569" }}>
                      <th style={{ textAlign: "left", padding: "8px 4px" }}>#</th>
                      <th style={{ textAlign: "left", padding: "8px 4px" }}>{lang === "ar" ? "الصنف" : "Product"}</th>
                      <th style={{ textAlign: "center", padding: "8px 4px" }}>{lang === "ar" ? "الكمية" : "Qty"}</th>
                      <th style={{ textAlign: "right", padding: "8px 4px" }}>{lang === "ar" ? "الإجمالي" : "Total"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productSalesMap.map((p, idx) => (
                      <tr key={p.name} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 4px", color: "#64748b" }}>{idx + 1}</td>
                        <td style={{ padding: "8px 4px", fontWeight: "600", color: "#0f172a" }}>{p.name}</td>
                        <td style={{ padding: "8px 4px", textAlign: "center", fontWeight: "700", color: "#4f46e5" }}>{p.qty}</td>
                        <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: "700", color: "#0f172a", whiteSpace: "nowrap" }}>
                          ﷼ {fmtCurrency(p.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* VIEW 3: INVOICES LOG */}
          {reportView === "invoices" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "8px", flexWrap: "wrap" }}>
                <div style={{ fontSize: "14px", fontWeight: "800", color: "#1e293b" }}>
                  {lang === "ar" ? "سجل فواتير اليوم" : "Invoices Log"} ({dayOrders.length})
                </div>
                <input
                  type="text"
                  placeholder={lang === "ar" ? "بحث برقم الفاتورة..." : "Search invoice #..."}
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    padding: "5px 8px",
                    fontSize: "12px",
                    outline: "none",
                    width: "140px"
                  }}
                />
              </div>

              {dayOrders.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                  {lang === "ar" ? "لا توجد فواتير مسجلة في هذا اليوم" : "No invoices found for this date."}
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #cbd5e1", color: "#475569" }}>
                      <th style={{ textAlign: "left", padding: "8px 4px" }}>#</th>
                      <th style={{ textAlign: "left", padding: "8px 4px" }}>{lang === "ar" ? "الوقت" : "Time"}</th>
                      <th style={{ textAlign: "center", padding: "8px 4px" }}>{lang === "ar" ? "الدفع" : "Pay"}</th>
                      <th style={{ textAlign: "right", padding: "8px 4px" }}>{lang === "ar" ? "المبلغ" : "Total"}</th>
                      <th style={{ textAlign: "center", padding: "8px 4px" }}>{lang === "ar" ? "إجراء" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayOrders
                      .filter((ord) => {
                        if (!searchFilter.trim()) return true;
                        const q = searchFilter.toLowerCase();
                        const num = String(ord.dailyOrderNumber || ord.invoiceSerial || ord._id || "");
                        return num.toLowerCase().includes(q);
                      })
                      .map((ord) => {
                        const timeStr = ord.createdAt ? new Date(ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
                        const isRefunded = ord.paymentStatus === "refunded" || Number(ord.refundedAmount) > 0 || ord.status === "Cancelled";
                        const refMethod = (ord.refundMethod || ord.paymentMethod || "cash").toUpperCase();
                        return (
                          <tr key={ord._id || Math.random()} style={{ borderBottom: "1px solid #f1f5f9", background: isRefunded ? "rgba(239, 68, 68, 0.04)" : "transparent" }}>
                            <td style={{ padding: "8px 4px", fontWeight: "700", color: "#4f46e5" }}>
                              #{ord.dailyOrderNumber || String(ord._id || "").slice(-4).toUpperCase()}
                              {isRefunded && (
                                <span style={{
                                  display: "block",
                                  fontSize: "9px",
                                  fontWeight: "800",
                                  color: "#ef4444",
                                  marginTop: "2px"
                                }}>
                                  ↩️ {lang === "ar" ? `مسترجع (${refMethod === "CASH" ? "كاش" : "شبكة"})` : `REFUNDED (${refMethod})`}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "8px 4px", color: "#64748b" }}>{timeStr}</td>
                            <td style={{ padding: "8px 4px", textAlign: "center" }}>
                              <span style={{
                                fontSize: "10px",
                                fontWeight: "700",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: (ord.paymentMethod || "").toLowerCase() === "cash" ? "rgba(34, 197, 94, 0.15)" : "rgba(79, 70, 229, 0.15)",
                                color: (ord.paymentMethod || "").toLowerCase() === "cash" ? "#16a34a" : "#4f46e5"
                              }}>
                                {(ord.paymentMethod || "").toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: "700", color: isRefunded ? "#ef4444" : "#0f172a", whiteSpace: "nowrap" }}>
                              {isRefunded ? `-﷼ ${fmtCurrency(ord.refundedAmount || ord.totalPrice)}` : `﷼ ${fmtCurrency(ord.totalPrice)}`}
                            </td>
                            <td style={{ padding: "8px 4px", textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (setShowPrintModal) {
                                    setShowPrintModal(ord);
                                  }
                                }}
                                style={{
                                  background: "rgba(79, 70, 229, 0.1)",
                                  border: "1px solid rgba(79, 70, 229, 0.3)",
                                  color: "#4f46e5",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  cursor: "pointer"
                                }}
                              >
                                🖨️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
