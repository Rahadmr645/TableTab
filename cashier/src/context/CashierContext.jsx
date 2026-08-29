import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { api, API_BASE_URL, getApiBaseUrl } from "../utils/api.js";
import { FALLBACK_CATEGORIES, FALLBACK_PRODUCTS, VOCAB } from "../utils/constants.js";

const CashierContext = createContext();

export function CashierProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("cashier_lang") || "ar");
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [tables, setTables] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [mobileView, setMobileView] = useState("catalog"); // 'catalog' | 'cart'

  // Multi-Tenant & Auth State
  const [token, setToken] = useState(() => localStorage.getItem("token") || localStorage.getItem("cashier_token") || "");
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("cashier_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [currentTenant, setCurrentTenant] = useState(() => {
    try {
      const saved = localStorage.getItem("cashier_tenant");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [socketConnected, setSocketConnected] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const socketRef = useRef(null);

  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const isIos = typeof window !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  useEffect(() => {
    const checkStandalone = () => {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
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
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  // Cart & Order state
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("cashier_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customerName, setCustomerName] = useState(() => localStorage.getItem("cashier_customer_name") || "");
  const [selectedTable, setSelectedTable] = useState(() => {
    const saved = localStorage.getItem("cashier_selected_table");
    return saved ? Number(saved) : 1;
  });
  const [orderDiscount, setOrderDiscount] = useState(() => {
    const saved = localStorage.getItem("cashier_order_discount");
    return saved ? Number(saved) : 0;
  });

  const [placedOrders, setPlacedOrders] = useState(() => {
    try {
      const saved = localStorage.getItem("cashier_placed_orders");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [activeEditingOrderId, setActiveEditingOrderId] = useState(() => localStorage.getItem("cashier_editing_order_id") || null);

  // Modals overlays visibility
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showCustModal, setShowCustModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showCustomDishModal, setShowCustomDishModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showProdModal, setShowProdModal] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);

  const [customDishName, setCustomDishName] = useState("");
  const [customDishPrice, setCustomDishPrice] = useState("");

  const t = VOCAB[lang] || VOCAB.ar;

  // Sync direction & localStorage
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
    localStorage.setItem("cashier_placed_orders", JSON.stringify(placedOrders));
  }, [placedOrders]);

  useEffect(() => {
    if (activeEditingOrderId) {
      localStorage.setItem("cashier_editing_order_id", activeEditingOrderId);
    } else {
      localStorage.removeItem("cashier_editing_order_id");
    }
  }, [activeEditingOrderId]);

  // Compute occupied tables from active unpaid orders
  const occupiedTables = placedOrders
    .filter((ord) => {
      const norm = String(ord.status || "").toLowerCase().replace(/\s+/g, "");
      return ord.paymentStatus === "unpaid" && norm !== "finished" && norm !== "finised" && norm !== "cancelled";
    })
    .map((ord) => Number(ord.tableId))
    .filter((n) => !isNaN(n) && n > 0);

  // Billing calculations (15% Saudi VAT included standard)
  const itemsSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discountAmount = itemsSubtotal * (orderDiscount / 100);
  const netBeforeTax = (itemsSubtotal - discountAmount) / 1.15;
  const taxAmount = itemsSubtotal - discountAmount - netBeforeTax;
  const grandTotal = Math.max(0, itemsSubtotal - discountAmount);

  // ----------------------------------------------------
  // Initial URL Parameter Tenant Resolution
  // ----------------------------------------------------
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const slugParam = urlParams.get("tenant") || urlParams.get("tenantSlug") || urlParams.get("slug");
    const idParam = urlParams.get("tenantId");

    if (slugParam) {
      localStorage.setItem("cashier_tenant_slug", slugParam);
      api.get(`/api/tenant/by-slug/${slugParam}`)
        .then((res) => {
          if (res.data?.tenant) {
            setCurrentTenant(res.data.tenant);
            localStorage.setItem("cashier_tenant", JSON.stringify(res.data.tenant));
            localStorage.setItem("cashier_tenant_id", res.data.tenant._id);
          }
        })
        .catch((err) => console.warn("Tenant slug resolution failed:", err));
    } else if (idParam) {
      localStorage.setItem("cashier_tenant_id", idParam);
    }
  }, []);

  // ----------------------------------------------------
  // Load Server Data (Categories, Menus, Tables, Orders)
  // ----------------------------------------------------
  const loadServerData = useCallback(async () => {
    const activeTenantId = currentTenant?._id || localStorage.getItem("cashier_tenant_id") || localStorage.getItem("tenantId");
    const activeTenantSlug = currentTenant?.slug || localStorage.getItem("cashier_tenant_slug");

    try {
      const headers = {};
      if (activeTenantId) headers["X-Tenant-Id"] = activeTenantId;
      if (activeTenantSlug) headers["X-Tenant-Slug"] = activeTenantSlug;

      const [catRes, menuRes, tablesRes, ordersRes] = await Promise.all([
        api.get("/api/categories/browse", { headers }).catch(() => api.get("/api/categories", { headers })).catch(() => null),
        api.get("/api/menu/menuList", { headers }).catch(() => null),
        api.get("/api/tables/browse", { headers }).catch(() => api.get("/api/tables", { headers })).catch(() => null),
        api.get("/api/order/all-orders", { headers }).catch(() => api.get("/api/order/active-orders", { headers })).catch(() => null)
      ]);

      if (catRes?.data?.categories && Array.isArray(catRes.data.categories)) {
        const dbCats = catRes.data.categories.map((c) => {
          let nameEn = c.name;
          let nameAr = c.nameArabic || c.name || "تصنيف";
          if (c.name && c.name.includes(" / ")) {
            const parts = c.name.split(" / ");
            nameEn = parts[0].trim();
            nameAr = parts[1].trim();
          }
          return { id: c._id, nameEn, nameAr, slug: c.slug || "" };
        });
        if (dbCats.length > 0) setCategories(dbCats);
      }

      if (menuRes?.data?.MenuList && Array.isArray(menuRes.data.MenuList)) {
        const dbProds = menuRes.data.MenuList.map((m) => {
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
            price: Number(m.price) || 0,
            description: m.description || "",
            image: m.image || ""
          };
        });
        if (dbProds.length > 0) setProducts(dbProds);
      }

      if (tablesRes?.data?.tables && Array.isArray(tablesRes.data.tables)) {
        setTables(tablesRes.data.tables);
      }

      if (ordersRes?.data?.orders && Array.isArray(ordersRes.data.orders)) {
        setPlacedOrders(ordersRes.data.orders);
      } else if (ordersRes?.data?.activeOrders && Array.isArray(ordersRes.data.activeOrders)) {
        setPlacedOrders(ordersRes.data.activeOrders);
      }
    } catch (err) {
      console.warn("Could not load backend data, staying on current state:", err.message);
    }
  }, [currentTenant]);

  useEffect(() => {
    loadServerData();
  }, [loadServerData]);

  // ----------------------------------------------------
  // Socket.io Real-Time Tenant Connection
  // ----------------------------------------------------
  useEffect(() => {
    const socketUrl = getApiBaseUrl();
    const socket = io(socketUrl, {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      const activeTenantId = currentTenant?._id || localStorage.getItem("cashier_tenant_id") || localStorage.getItem("tenantId");
      if (activeTenantId) {
        socket.emit("joinTenant", String(activeTenantId));
      }
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    // Realtime Events from Customer Client or Kitchen Screens
    socket.on("newOrder", (newOrderDoc) => {
      if (!newOrderDoc || !newOrderDoc._id) return;
      setPlacedOrders((prev) => {
        const exists = prev.some((o) => o._id === newOrderDoc._id);
        if (exists) return prev;
        return [newOrderDoc, ...prev];
      });
    });

    socket.on("orderUpdated", (updatedOrderDoc) => {
      if (!updatedOrderDoc || !updatedOrderDoc._id) return;
      setPlacedOrders((prev) =>
        prev.map((o) => (o._id === updatedOrderDoc._id ? { ...o, ...updatedOrderDoc } : o))
      );
    });

    socket.on("statusUpdate", ({ orderId, status }) => {
      if (!orderId) return;
      setPlacedOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status } : o))
      );
    });

    socket.on("orderRemoved", (orderId) => {
      if (!orderId) return;
      setPlacedOrders((prev) => prev.filter((o) => o._id !== orderId));
    });

    return () => {
      socket.disconnect();
    };
  }, [currentTenant]);

  // Re-join tenant room when tenant changes
  useEffect(() => {
    if (socketRef.current && socketRef.current.connected) {
      const activeTenantId = currentTenant?._id || localStorage.getItem("cashier_tenant_id") || localStorage.getItem("tenantId");
      if (activeTenantId) {
        socketRef.current.emit("joinTenant", String(activeTenantId));
      }
    }
  }, [currentTenant]);

  // ----------------------------------------------------
  // Authentication & Tenant Switch Handlers
  // ----------------------------------------------------
  const handleStaffLogin = async (email, password, tenantSlug) => {
    try {
      const res = await api.post("/api/admin/login", {
        email,
        password,
        tenantSlug: tenantSlug || undefined
      });

      if (res.data?.token) {
        const staffToken = res.data.token;
        const staffUser = res.data.admin;
        const tenantData = res.data.tenant || { _id: res.data.tenantId, slug: tenantSlug };

        setToken(staffToken);
        setCurrentUser(staffUser);
        setCurrentTenant(tenantData);

        localStorage.setItem("token", staffToken);
        localStorage.setItem("cashier_token", staffToken);
        localStorage.setItem("cashier_user", JSON.stringify(staffUser));
        localStorage.setItem("cashier_tenant", JSON.stringify(tenantData));
        localStorage.setItem("cashier_tenant_id", tenantData._id || res.data.tenantId);
        if (tenantData.slug) {
          localStorage.setItem("cashier_tenant_slug", tenantData.slug);
        }

        await loadServerData();
        return { success: true };
      }
      return { success: false, message: res.data?.message || "Login failed" };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || "Failed to login"
      };
    }
  };

  // Screen Lock PIN & Lock state
  const [isScreenLocked, setIsScreenLocked] = useState(() => {
    return localStorage.getItem("cashier_is_locked") === "true";
  });
  const [screenLockPin, setScreenLockPin] = useState(() => {
    const savedUser = localStorage.getItem("cashier_user");
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.posPin) return u.posPin;
      } catch {}
    }
    return localStorage.getItem("cashier_lock_pin") || "";
  });
  const [showLockPinModal, setShowLockPinModal] = useState(false);

  // Sync screenLockPin with server-stored currentUser.posPin
  useEffect(() => {
    if (currentUser?.posPin) {
      setScreenLockPin(currentUser.posPin);
      localStorage.setItem("cashier_lock_pin", currentUser.posPin);
    }
  }, [currentUser]);

  const handleSetLockPin = async (newPin) => {
    setScreenLockPin(newPin);
    if (newPin) {
      localStorage.setItem("cashier_lock_pin", newPin);
      try {
        // Sync to server so any other device (tablet, phone, PC) gets the lock PIN automatically!
        await api.put("/api/admin/pos-pin", { pin: newPin });
        setCurrentUser((prev) => (prev ? { ...prev, posPin: newPin } : prev));
        const savedUser = localStorage.getItem("cashier_user");
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            parsed.posPin = newPin;
            localStorage.setItem("cashier_user", JSON.stringify(parsed));
          } catch {}
        }
      } catch (err) {
        console.warn("Failed to sync PIN to server:", err);
      }
    } else {
      localStorage.removeItem("cashier_lock_pin");
    }
  };

  const handleLockScreen = () => {
    setIsScreenLocked(true);
    localStorage.setItem("cashier_is_locked", "true");
  };

  const handleUnlockScreen = (enteredPin) => {
    const activePin = currentUser?.posPin || screenLockPin || localStorage.getItem("cashier_lock_pin");
    if (!activePin) {
      handleSetLockPin(enteredPin);
      setIsScreenLocked(false);
      localStorage.removeItem("cashier_is_locked");
      return { success: true };
    }
    if (enteredPin === activePin) {
      setIsScreenLocked(false);
      localStorage.removeItem("cashier_is_locked");
      return { success: true };
    }
    return { success: false, message: lang === "ar" ? "رمز القفل غير صحيح" : "Incorrect PIN" };
  };

  const handleStaffLogout = () => {
    setToken("");
    setCurrentUser(null);
    setIsScreenLocked(false);
    localStorage.removeItem("token");
    localStorage.removeItem("cashier_token");
    localStorage.removeItem("cashier_user");
    localStorage.removeItem("cashier_is_locked");
  };

  const handleSwitchTenantSlug = async (slug) => {
    try {
      const res = await api.get(`/api/tenant/by-slug/${slug.trim()}`);
      if (res.data?.tenant) {
        const tObj = res.data.tenant;
        setCurrentTenant(tObj);
        localStorage.setItem("cashier_tenant", JSON.stringify(tObj));
        localStorage.setItem("cashier_tenant_id", tObj._id);
        localStorage.setItem("cashier_tenant_slug", tObj.slug);
        await loadServerData();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // ----------------------------------------------------
  // Cart Actions
  // ----------------------------------------------------
  const handleAddToCart = (product) => {
    setCart((prev) => {
      const match = prev.find((item) => item.product.id === product.id);
      if (match) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, note: "" }];
    });
  };

  const handleUpdateQuantity = (productId, amt) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQ = item.quantity + amt;
            return nextQ > 0 ? { ...item, quantity: nextQ } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const handleNewOrder = (autoSaveCurrent = true) => {
    setActiveEditingOrderId(null);
    setCart([]);
    setCustomerName("");
    setSelectedTable(1);
    setOrderDiscount(0);
    setActiveTab("home");
    setMobileView("catalog");
  };

  const handleOpenOrder = (order) => {
    if (!order) return;
    setActiveEditingOrderId(order._id);
    setCustomerName(order.customerName || "");
    setSelectedTable(Number(order.tableId) || 1);
    setOrderDiscount(order.discount || 0);

    const formattedCart = (order.items || []).map((it) => {
      const match = products.find(
        (p) =>
          p.id === (it._id || it.menuItemId || it.product?._id || it.id) ||
          p.nameAr === it.name ||
          p.nameEn === it.name
      );
      return {
        product: match || {
          id: it._id || it.menuItemId || "p_" + Math.random().toString(36).substring(2, 9),
          nameAr: it.name || "عنصر",
          nameEn: it.name || "Item",
          price: Number(it.price) || 0,
          image: it.image || ""
        },
        quantity: Number(it.quantity) || 1,
        note: it.note || ""
      };
    });

    setCart(formattedCart);
    setActiveTab("home");
    setMobileView("catalog");
  };

  // ----------------------------------------------------
  // Send to Kitchen (Open Unpaid Tab)
  // ----------------------------------------------------
  const handleSendToKitchen = async () => {
    if (!cart.length) {
      alert(lang === "ar" ? "السلة فارغة، يرجى إضافة أطباق أولاً" : "Cart is empty, please add items first");
      return;
    }

    const payloadItems = cart.map((it) => ({
      _id: it.product.id,
      menuItemId: it.product.id,
      name: lang === "ar" ? it.product.nameAr : it.product.nameEn,
      price: it.product.price,
      quantity: it.quantity,
      note: it.note || ""
    }));

    try {
      if (activeEditingOrderId && !String(activeEditingOrderId).startsWith("order_")) {
        // Update existing open order on server
        const res = await api.put(`/api/order/${activeEditingOrderId}`, {
          customerName: customerName || (lang === "ar" ? "عميل صالة" : "Dine-in Customer"),
          tableId: selectedTable || 1,
          items: payloadItems,
          totalPrice: grandTotal,
          status: "In Progress",
          paymentStatus: "unpaid"
        });

        const updated = res.data?.order;
        if (updated) {
          setPlacedOrders((prev) =>
            prev.map((o) => (o._id === activeEditingOrderId ? updated : o))
          );
        }

        alert(lang === "ar" ? "تم تحديث الطلب وإرساله إلى المطبخ بنجاح" : "Order updated and sent to kitchen successfully");
        handleNewOrder(false);
        return;
      }

      // Create new open unpaid order on server
      const res = await api.post("/api/order/create-order", {
        customerName: customerName || (lang === "ar" ? "عميل صالة" : "Dine-in Customer"),
        tableId: selectedTable || 1,
        items: payloadItems,
        totalPrice: grandTotal,
        paymentMethod: "cash",
        cashAmount: 0,
        cardAmount: 0,
        paymentStatus: "unpaid",
        status: "In Progress"
      });

      const serverOrder = res.data?.order;
      if (serverOrder) {
        setPlacedOrders((prev) => [serverOrder, ...prev.filter((o) => o._id !== serverOrder._id)]);
        alert(
          lang === "ar"
            ? `تم إنشاء الطلب #${serverOrder.dailyOrderNumber || ""} وإرساله للمطبخ بنجاح`
            : `Order #${serverOrder.dailyOrderNumber || ""} sent to kitchen`
        );
      }
      handleNewOrder(false);
    } catch (err) {
      console.error("Kitchen dispatch error:", err);
      alert(lang === "ar" ? `فشل إرسال الطلب: ${err.response?.data?.message || err.message}` : `Failed to send order: ${err.message}`);
    }
  };

  const handleClearCart = (promptConfirm = true) => {
    if (!promptConfirm) {
      handleNewOrder(false);
      return;
    }
    if (window.confirm(lang === "ar" ? "هل تريد إلغاء الطلب بالكامل؟" : "Are you sure you want to void this order?")) {
      if (activeEditingOrderId && !String(activeEditingOrderId).startsWith("order_")) {
        api.put(`/api/order/${activeEditingOrderId}/status`, { status: "Cancelled" }).catch(console.error);
        setPlacedOrders((prev) => prev.filter((ord) => ord._id !== activeEditingOrderId));
      }
      handleNewOrder(false);
    }
  };

  // ----------------------------------------------------
  // Submit Final Paid Cashier Order (Cash / Card / Split)
  // ----------------------------------------------------
  const [activePrintOrder, setActivePrintOrder] = useState(null);

  const handleSubmitOrder = async (method = "cash", splitDetails = { cash: 0, card: 0 }) => {
    if (!cart.length) return null;

    const cashAmt = splitDetails.cash !== undefined && splitDetails.cash > 0 ? splitDetails.cash : (method === "cash" ? grandTotal : 0);
    const cardAmt = splitDetails.card !== undefined && splitDetails.card > 0 ? splitDetails.card : (method === "card" ? grandTotal : 0);
    const finalMethod = cashAmt > 0 && cardAmt > 0 ? "split" : (cardAmt > 0 ? "card" : "cash");

    const payloadItems = cart.map((it) => ({
      _id: it.product.id,
      menuItemId: it.product.id,
      name: lang === "ar" ? it.product.nameAr : it.product.nameEn,
      price: it.product.price,
      quantity: it.quantity,
      note: it.note || ""
    }));

    try {
      if (activeEditingOrderId && !String(activeEditingOrderId).startsWith("order_")) {
        // Updating & settling an open order directly on server
        const res = await api.put(`/api/order/${activeEditingOrderId}`, {
          customerName: customerName || (lang === "ar" ? "عميل كاشير" : "Counter Guest"),
          tableId: selectedTable || 1,
          items: payloadItems,
          totalPrice: grandTotal,
          paymentMethod: finalMethod,
          cashAmount: cashAmt,
          cardAmount: cardAmt,
          paymentStatus: "paid",
          status: "Finished"
        });

        const completedOrder = res.data?.order || {
          _id: activeEditingOrderId,
          dailyOrderNumber: 1,
          invoiceSerial: "INV-" + Date.now(),
          customerName: customerName || "Customer",
          tableId: selectedTable || 1,
          totalPrice: grandTotal,
          items: payloadItems,
          paymentMethod: finalMethod,
          paymentStatus: "paid",
          createdAt: new Date().toISOString()
        };

        setPlacedOrders((prev) =>
          prev.map((o) => (o._id === activeEditingOrderId ? completedOrder : o))
        );

        setActivePrintOrder(completedOrder);
        setShowPrintModal(completedOrder);
        handleNewOrder(false);
        return completedOrder;
      }

      // Creating a new direct paid order on server
      const res = await api.post("/api/order/create-order", {
        customerName: customerName || (lang === "ar" ? "عميل كاشير" : "Counter Guest"),
        tableId: selectedTable || 1,
        items: payloadItems,
        totalPrice: grandTotal,
        paymentMethod: finalMethod,
        cashAmount: cashAmt,
        cardAmount: cardAmt,
        paymentStatus: "paid",
        status: "Finished"
      });

      const serverOrder = res.data?.order;
      if (serverOrder) {
        setPlacedOrders((prev) => [serverOrder, ...prev]);
        setActivePrintOrder(serverOrder);
        setShowPrintModal(serverOrder);
      }

      handleNewOrder(false);
      return serverOrder;
    } catch (err) {
      console.error("Order payment error:", err);
      alert(lang === "ar" ? `فشل إتمام الدفع: ${err.response?.data?.message || err.message}` : `Payment failed: ${err.message}`);
      return null;
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      if (!String(orderId).startsWith("order_")) {
        await api.put(`/api/order/${orderId}/status`, { status: newStatus });
      }
      setPlacedOrders((prev) =>
        prev.map((ord) => (ord._id === orderId ? { ...ord, status: newStatus } : ord))
      );
    } catch (err) {
      console.error("Failed to update status on server:", err);
      alert(err.response?.data?.message || err.message);
    }
  };

  // Filter products by category and search queries
  const filteredProducts = products.filter((p) => {
    if (selectedCategory && p.categoryId !== selectedCategory.id) return false;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchEn = (p.nameEn || "").toLowerCase().includes(q);
      const matchAr = (p.nameAr || "").toLowerCase().includes(q);
      return matchEn || matchAr;
    }
    return true;
  });

  // ----------------------------------------------------
  // Category CRUD Handlers (Server Backed)
  // ----------------------------------------------------
  const handleAddCategory = async (nameEn, nameAr) => {
    const combinedName = `${nameEn} / ${nameAr}`;
    try {
      const res = await api.post("/api/categories", { name: combinedName });
      const serverCat = res.data?.category;
      if (serverCat) {
        setCategories((prev) => [
          ...prev,
          { id: serverCat._id, nameEn, nameAr, slug: serverCat.slug || "" }
        ]);
      }
      alert(lang === "ar" ? "تم إضافة التصنيف بنجاح!" : "Category added successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add category");
    }
  };

  const handleEditCategory = async (id, nameEn, nameAr) => {
    const combinedName = `${nameEn} / ${nameAr}`;
    try {
      await api.put(`/api/categories/${id}`, { name: combinedName });
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, nameEn, nameAr } : c))
      );
      alert(lang === "ar" ? "تم تعديل التصنيف بنجاح!" : "Category updated successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update category");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm(lang === "ar" ? "هل أنت متأكد من حذف هذا التصنيف؟" : "Are you sure you want to delete this category?")) {
      return;
    }
    try {
      await api.delete(`/api/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setProducts((prev) => prev.filter((p) => p.categoryId !== id));
      if (selectedCategory && selectedCategory.id === id) {
        setSelectedCategory(null);
      }
      alert(lang === "ar" ? "تم حذف التصنيف بنجاح!" : "Category deleted successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete category");
    }
  };

  // ----------------------------------------------------
  // Product CRUD Handlers (Server Backed)
  // ----------------------------------------------------
  const handleAddProduct = async (nameEn, nameAr, price, categoryId) => {
    const combinedName = `${nameEn} / ${nameAr}`;
    try {
      const res = await api.post("/api/menu/add-menu", {
        name: combinedName,
        price: Number(price),
        description: "POS item",
        categoryId: categoryId
      });
      const serverProd = res.data?.newMenu;
      if (serverProd) {
        setProducts((prev) => [
          ...prev,
          {
            id: serverProd._id,
            categoryId: categoryId,
            nameEn,
            nameAr,
            price: Number(price),
            description: ""
          }
        ]);
      }
      alert(lang === "ar" ? "تم إضافة المنتج بنجاح!" : "Product added successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add product");
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
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, nameEn, nameAr, price: Number(price), categoryId } : p
        )
      );
      alert(lang === "ar" ? "تم تعديل المنتج بنجاح!" : "Product updated successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update product");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm(lang === "ar" ? "هل أنت متأكد من حذف هذا المنتج؟" : "Are you sure you want to delete this product?")) {
      return;
    }
    try {
      await api.delete(`/api/menu/delete/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      alert(lang === "ar" ? "تم حذف المنتج بنجاح!" : "Product deleted successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete product");
    }
  };

  return (
    <CashierContext.Provider
      value={{
        lang,
        setLang,
        categories,
        setCategories,
        products,
        setProducts,
        tables,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        activeTab,
        setActiveTab,
        mobileView,
        setMobileView,
        cart,
        setCart,
        customerName,
        setCustomerName,
        selectedTable,
        setSelectedTable,
        orderDiscount,
        setOrderDiscount,
        occupiedTables,
        placedOrders,
        setPlacedOrders,
        activeEditingOrderId,
        setActiveEditingOrderId,
        handleOpenOrder,
        handleNewOrder,
        handleSendToKitchen,
        showPrintModal,
        setShowPrintModal,
        showCustModal,
        setShowCustModal,
        showTableModal,
        setShowTableModal,
        showDiscountModal,
        setShowDiscountModal,
        showCustomDishModal,
        setShowCustomDishModal,
        showCatModal,
        setShowCatModal,
        showProdModal,
        setShowProdModal,
        showMoreModal,
        setShowMoreModal,
        showAuthModal,
        setShowAuthModal,
        customDishName,
        setCustomDishName,
        customDishPrice,
        setCustomDishPrice,
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
        handleInstallApp,
        // Multi-Tenant / Auth & PIN Lock exports
        currentUser,
        currentTenant,
        token,
        socketConnected,
        handleStaffLogin,
        handleStaffLogout,
        handleSwitchTenantSlug,
        loadServerData,
        isScreenLocked,
        setIsScreenLocked,
        screenLockPin,
        handleSetLockPin,
        handleLockScreen,
        handleUnlockScreen,
        showLockPinModal,
        setShowLockPinModal
      }}
    >
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
