import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../utils/api.js";
import { FALLBACK_CATEGORIES, FALLBACK_PRODUCTS, VOCAB } from "../utils/constants.js";

const CashierContext = createContext();

export function CashierProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("cashier_lang") || "ar"); // Persist default language selection
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [mobileView, setMobileView] = useState("catalog"); // 'catalog' or 'cart'
  
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const isIos = typeof window !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  useEffect(() => {
    const checkStandalone = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator.standalone === true);
      setIsInstalled(isStandalone);
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };
  
  // Cart & Order state loaded from localStorage
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("cashier_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [customerName, setCustomerName] = useState(() => {
    return localStorage.getItem("cashier_customer_name") || "";
  });

  const [selectedTable, setSelectedTable] = useState(() => {
    const saved = localStorage.getItem("cashier_selected_table");
    return saved ? Number(saved) : 80;
  });

  const [orderDiscount, setOrderDiscount] = useState(() => {
    const saved = localStorage.getItem("cashier_order_discount");
    return saved ? Number(saved) : 0;
  });

  // Placed orders list loaded from localStorage
  const [occupiedTables, setOccupiedTables] = useState(() => {
    try {
      const saved = localStorage.getItem("cashier_occupied_tables");
      return saved ? JSON.parse(saved) : [3, 5, 12, 17];
    } catch {
      return [3, 5, 12, 17];
    }
  });

  const [placedOrders, setPlacedOrders] = useState(() => {
    try {
      const saved = localStorage.getItem("cashier_placed_orders");
      if (saved) return JSON.parse(saved);
    } catch {}
    
    // Default initial mock orders if nothing is saved
    return [
      {
        _id: "order_1",
        dailyOrderNumber: 78,
        customerName: "أحمد علي",
        tableId: 5,
        totalPrice: 42.00,
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        status: "pending",
        items: [
          { name: "V60 حار", quantity: 2, price: 19.00 },
          { name: "كوب شاي أحمر", quantity: 1, price: 4.00 }
        ]
      },
      {
        _id: "order_2",
        dailyOrderNumber: 79,
        customerName: "سارة محمد",
        tableId: 12,
        totalPrice: 58.00,
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        status: "pending",
        items: [
          { name: "سبانش لاتيه بارد", quantity: 2, price: 22.00 },
          { name: "ساندوتش حلومي", quantity: 1, price: 14.00 }
        ]
      }
    ];
  });

  // Modals overlays visibility
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showCustModal, setShowCustModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showCustomDishModal, setShowCustomDishModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showProdModal, setShowProdModal] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);

  
  // Custom dish creation state inside modal
  const [customDishName, setCustomDishName] = useState("");
  const [customDishPrice, setCustomDishPrice] = useState("");

  const t = VOCAB[lang];

  // Try to load categories and menu items from API
  useEffect(() => {
    async function loadData() {
      try {
        const [catRes, menuRes, ordersRes] = await Promise.all([
          api.get("/api/categories/browse").catch(() => null),
          api.get("/api/menu/menuList").catch(() => null),
          api.get("/api/order/all-orders").catch(() => null)
        ]);

        if (catRes?.data?.categories) {
          const dbCats = catRes.data.categories.map(c => {
            let nameEn = c.name;
            let nameAr = c.nameArabic || c.name || "تصنيف";
            if (c.name && c.name.includes(" / ")) {
              const parts = c.name.split(" / ");
              nameEn = parts[0].trim();
              nameAr = parts[1].trim();
            }
            return {
              id: c._id,
              nameEn,
              nameAr
            };
          });
          if (dbCats.length) setCategories(dbCats);
        }

        if (menuRes?.data?.MenuList) {
          const dbProds = menuRes.data.MenuList.map(m => {
            let nameEn = m.name;
            let nameAr = m.nameArabic || m.name;
            if (m.name && m.name.includes(" / ")) {
              const parts = m.name.split(" / ");
              nameEn = parts[0].trim();
              nameAr = parts[1].trim();
            }
            return {
              id: m._id,
              categoryId: m.categoryId || m.category,
              nameEn,
              nameAr,
              price: m.price || 0,
              description: m.description || ""
            };
          });
          if (dbProds.length) setProducts(dbProds);
        }

        if (ordersRes?.data?.orders) {
          setPlacedOrders(ordersRes.data.orders);
        }
      } catch (err) {
        console.warn("Could not load backend catalog. Using high-fidelity fallback data.", err);
      }
    }
    loadData();
  }, []);


  // Sync index body direction class and localStorage variables
  useEffect(() => {
    const isRtl = lang === "ar";
    document.documentElement.setAttribute("dir", isRtl ? "rtl" : "ltr");
    localStorage.setItem("cashier_lang", lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("cashier_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("cashier_customer_name", customerName);
  }, [customerName]);

  useEffect(() => {
    localStorage.setItem("cashier_selected_table", selectedTable.toString());
  }, [selectedTable]);

  useEffect(() => {
    localStorage.setItem("cashier_order_discount", orderDiscount.toString());
  }, [orderDiscount]);

  useEffect(() => {
    localStorage.setItem("cashier_occupied_tables", JSON.stringify(occupiedTables));
  }, [occupiedTables]);

  useEffect(() => {
    localStorage.setItem("cashier_placed_orders", JSON.stringify(placedOrders));
  }, [placedOrders]);

  // Billing calculation values
  const itemsSubtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const discountAmount = itemsSubtotal * (orderDiscount / 100);
  const netBeforeTax = (itemsSubtotal - discountAmount) / 1.15; // 15% inclusive VAT
  const taxAmount = (itemsSubtotal - discountAmount) - netBeforeTax;
  const grandTotal = itemsSubtotal - discountAmount;

  // Cart operations callbacks
  const handleAddToCart = (product) => {
    setCart((prev) => {
      const match = prev.find(item => item.product.id === product.id);
      if (match) {
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, note: "" }];
    });
  };

  const handleUpdateQuantity = (productId, amt) => {
    setCart((prev) => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const nextQ = item.quantity + amt;
          return nextQ > 0 ? { ...item, quantity: nextQ } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const handleClearCart = (promptConfirm = true) => {
    if (!promptConfirm) {
      setCart([]);
      setCustomerName("");
      setSelectedTable(80);
      setOrderDiscount(0);
      setActiveTab("home");
      setMobileView("catalog");
      return;
    }
    if (window.confirm(lang === "ar" ? "هل تريد إلغاء الطلب بالكامل؟" : "Are you sure you want to void this order?")) {
      setCart([]);
      setCustomerName("");
      setSelectedTable(80);
      setOrderDiscount(0);
      setMobileView("catalog");
    }
  };

  // Submit cashier order to backend
  const handleSubmitOrder = async (method = "cash") => {
    if (!cart.length) return;
    
    try {
      const orderPayload = {
        customerName: customerName || (lang === "ar" ? "عميل سفري" : "Counter Customer"),
        tableId: selectedTable || 0,
        items: cart.map(it => ({
          _id: it.product.id,
          name: lang === "ar" ? it.product.nameAr : it.product.nameEn,
          price: it.product.price,
          quantity: it.quantity
        })),
        totalPrice: grandTotal,
        paymentMethod: method,
        paymentStatus: method === "card" ? "paid" : "unpaid"
      };

      const res = await api.post("/api/order/create-order/", orderPayload);
      const serverOrder = res.data?.order || {
        _id: "order_" + Date.now(),
        dailyOrderNumber: Math.floor(80 + Math.random() * 20),
        customerName: orderPayload.customerName,
        tableId: orderPayload.tableId,
        totalPrice: orderPayload.totalPrice,
        createdAt: new Date().toISOString(),
        status: "pending",
        items: cart.map(it => ({
          name: lang === "ar" ? it.product.nameAr : it.product.nameEn,
          quantity: it.quantity,
          price: it.product.price
        }))
      };
      setPlacedOrders(prev => [serverOrder, ...prev]);
      if (orderPayload.tableId) {
        setOccupiedTables(prev => [...new Set([...prev, orderPayload.tableId])]);
      }
      alert(t.successMsg);
      setCart([]);
      setCustomerName("");
      setOrderDiscount(0);
      setMobileView("catalog");
    } catch (err) {
      console.error(err);
      const simulatedOrder = {
        _id: "order_" + Date.now(),
        dailyOrderNumber: Math.floor(80 + Math.random() * 20),
        customerName: customerName || (lang === "ar" ? "عميل سفري" : "Counter Customer"),
        tableId: selectedTable || 0,
        totalPrice: grandTotal,
        createdAt: new Date().toISOString(),
        status: "pending",
        items: cart.map(it => ({
          name: lang === "ar" ? it.product.nameAr : it.product.nameEn,
          quantity: it.quantity,
          price: it.product.price
        }))
      };
      setPlacedOrders(prev => [simulatedOrder, ...prev]);
      if (selectedTable) {
        setOccupiedTables(prev => [...new Set([...prev, selectedTable])]);
      }
      alert(lang === "ar" ? "تمت محاكاة حفظ الطلب بنجاح (وضع عدم الاتصال بالخادم)" : "Simulated order placement (Offline fallback mode)");
      setCart([]);
      setCustomerName("");
      setOrderDiscount(0);
      setMobileView("catalog");
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      if (!String(orderId).startsWith("order_")) {
        await api.put(`/api/order/${orderId}/status`, { status: newStatus });
      }
    } catch (err) {
      console.error("Failed to update status on server:", err);
    }
    setPlacedOrders(prev =>
      prev.map(ord => ord._id === orderId ? { ...ord, status: newStatus } : ord)
    );
  };

  // Filter products by category and search queries
  const filteredProducts = products.filter(p => {
    if (selectedCategory && p.categoryId !== selectedCategory.id) return false;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchEn = p.nameEn.toLowerCase().includes(q);
      const matchAr = p.nameAr.toLowerCase().includes(q);
      return matchEn || matchAr;
    }
    return true;
  });

  // Category CRUD Handlers
  const handleAddCategory = async (nameEn, nameAr) => {
    const combinedName = `${nameEn} / ${nameAr}`;
    try {
      const res = await api.post("/api/categories", {
        name: combinedName
      });
      const serverCat = res.data?.category || {
        _id: "cat_" + Date.now(),
        name: combinedName
      };
      const newCatObj = {
        id: serverCat._id,
        nameEn,
        nameAr
      };
      setCategories(prev => [...prev, newCatObj]);
      alert(lang === "ar" ? "تم إضافة التصنيف بنجاح!" : "Category added successfully!");
    } catch (err) {
      console.warn("Backend add category failed, running offline fallback mode", err);
      const offlineCatObj = {
        id: "cat_" + Date.now(),
        nameEn,
        nameAr
      };
      setCategories(prev => [...prev, offlineCatObj]);
      alert(lang === "ar" ? "تم حفظ التصنيف محلياً (وضع غير متصل)" : "Category saved locally (Offline mode)");
    }
  };

  const handleEditCategory = async (id, nameEn, nameAr) => {
    const combinedName = `${nameEn} / ${nameAr}`;
    try {
      await api.put(`/api/categories/${id}`, {
        name: combinedName
      });
      setCategories(prev => prev.map(c => c.id === id ? { ...c, nameEn, nameAr } : c));
      alert(lang === "ar" ? "تم تعديل التصنيف بنجاح!" : "Category updated successfully!");
    } catch (err) {
      console.warn("Backend update category failed, running offline fallback mode", err);
      setCategories(prev => prev.map(c => c.id === id ? { ...c, nameEn, nameAr } : c));
      alert(lang === "ar" ? "تم تعديل التصنيف محلياً (وضع غير متصل)" : "Category updated locally (Offline mode)");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm(lang === "ar" ? "هل أنت متأكد من حذف هذا التصنيف؟ سيتم إزالة كافة المنتجات التابعة له." : "Are you sure you want to delete this category? All its products will be removed.")) {
      return;
    }
    try {
      await api.delete(`/api/categories/${id}`);
      setCategories(prev => prev.filter(c => c.id !== id));
      setProducts(prev => prev.filter(p => p.categoryId !== id));
      if (selectedCategory && selectedCategory.id === id) {
        setSelectedCategory(null);
      }
      alert(lang === "ar" ? "تم حذف التصنيف بنجاح!" : "Category deleted successfully!");
    } catch (err) {
      console.warn("Backend delete category failed, running offline fallback mode", err);
      setCategories(prev => prev.filter(c => c.id !== id));
      setProducts(prev => prev.filter(p => p.categoryId !== id));
      if (selectedCategory && selectedCategory.id === id) {
        setSelectedCategory(null);
      }
      alert(lang === "ar" ? "تم حذف التصنيف محلياً (وضع غير متصل)" : "Category deleted locally (Offline mode)");
    }
  };

  // Product CRUD Handlers
  const handleAddProduct = async (nameEn, nameAr, price, categoryId) => {
    const combinedName = `${nameEn} / ${nameAr}`;
    try {
      const res = await api.post("/api/menu/add-menu", {
        name: combinedName,
        price: Number(price),
        description: "POS item",
        categoryId: categoryId
      });
      const serverProd = res.data?.newMenu || {
        _id: "prod_" + Date.now(),
        name: combinedName,
        price: Number(price),
        categoryId: categoryId
      };
      const newProdObj = {
        id: serverProd._id,
        categoryId: categoryId,
        nameEn,
        nameAr,
        price: Number(price)
      };
      setProducts(prev => [...prev, newProdObj]);
      alert(lang === "ar" ? "تم إضافة المنتج بنجاح!" : "Product added successfully!");
    } catch (err) {
      console.warn("Backend add product failed, running offline fallback mode", err);
      const offlineProdObj = {
        id: "prod_" + Date.now(),
        categoryId: categoryId,
        nameEn,
        nameAr,
        price: Number(price)
      };
      setProducts(prev => [...prev, offlineProdObj]);
      alert(lang === "ar" ? "تم حفظ المنتج محلياً (وضع غير متصل)" : "Product saved locally (Offline mode)");
    }
  };

  const handleEditProduct = async (id, nameEn, nameAr, price, categoryId) => {
    const combinedName = `${nameEn} / ${nameAr}`;
    try {
      await api.put(`/api/menu/update/${id}`, {
        name: combinedName,
        price: Number(price),
        description: "POS item",
        categoryId: categoryId
      });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, nameEn, nameAr, price: Number(price), categoryId } : p));
      alert(lang === "ar" ? "تم تعديل المنتج بنجاح!" : "Product updated successfully!");
    } catch (err) {
      console.warn("Backend update product failed, running offline fallback mode", err);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, nameEn, nameAr, price: Number(price), categoryId } : p));
      alert(lang === "ar" ? "تم تعديل المنتج محلياً (وضع غير متصل)" : "Product updated locally (Offline mode)");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm(lang === "ar" ? "هل أنت متأكد من حذف هذا المنتج؟" : "Are you sure you want to delete this product?")) {
      return;
    }
    try {
      await api.delete(`/api/menu/delete/${id}`);
      setProducts(prev => prev.filter(p => p.id !== id));
      alert(lang === "ar" ? "تم حذف المنتج بنجاح!" : "Product deleted successfully!");
    } catch (err) {
      console.warn("Backend delete product failed, running offline fallback mode", err);
      setProducts(prev => prev.filter(p => p.id !== id));
      alert(lang === "ar" ? "تم حذف المنتج محلياً (وضع غير متصل)" : "Product deleted locally (Offline mode)");
    }
  };

  // Current printable order snapshot
  const activePrintOrder = {
    _id: "pi_pos_" + Math.random().toString(36).substr(2, 9),
    invoiceSerial: "INV-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(1000 + Math.random() * 9000),
    dailyOrderNumber: Math.floor(10 + Math.random() * 100),
    customerName: customerName || (lang === "ar" ? "عميل كاشير" : "Walk-in Guest"),
    tableId: selectedTable || 0,
    paymentMethod: "cash",
    paymentStatus: "paid",
    createdAt: new Date().toISOString(),
    totalPrice: grandTotal,
    items: cart.map(it => ({
      name: lang === "ar" ? it.product.nameAr : it.product.nameEn,
      quantity: it.quantity,
      price: it.product.price
    }))
  };

  return (
    <CashierContext.Provider value={{
      lang, setLang,
      categories, setCategories,
      products, setProducts,
      selectedCategory, setSelectedCategory,
      searchQuery, setSearchQuery,
      activeTab, setActiveTab,
      mobileView, setMobileView,
      cart, setCart,
      customerName, setCustomerName,
      selectedTable, setSelectedTable,
      orderDiscount, setOrderDiscount,
      occupiedTables, setOccupiedTables,
      placedOrders, setPlacedOrders,
      showPrintModal, setShowPrintModal,
      showCustModal, setShowCustModal,
      showTableModal, setShowTableModal,
      showDiscountModal, setShowDiscountModal,
      showCustomDishModal, setShowCustomDishModal,
      showCatModal, setShowCatModal,
      showProdModal, setShowProdModal,
      showMoreModal, setShowMoreModal,
      customDishName, setCustomDishName,
      customDishPrice, setCustomDishPrice,
      t,
      taxAmount,
      grandTotal,
      handleAddToCart,

      handleUpdateQuantity,
      handleClearCart,
      handleSubmitOrder,
      handleUpdateOrderStatus,
      filteredProducts,
      activePrintOrder,
      handleAddCategory,
      handleEditCategory,
      handleDeleteCategory,
      handleAddProduct,
      handleEditProduct,
      handleDeleteProduct,
      deferredPrompt,
      isInstalled,
      isIos,
      handleInstallApp
    }}>
      {children}
    </CashierContext.Provider>
  );

}

export function useCashier() {
  const context = useContext(CashierContext);
  if (!context) {
    throw new Error("useCashier must be used within a CashierProvider");
  }
  return context;
}
