import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { api, API_BASE_URL, getApiBaseUrl } from "../utils/api.js";
import { FALLBACK_CATEGORIES, FALLBACK_PRODUCTS, VOCAB } from "../utils/constants.js";
import { printOrderReceipt } from "@shared/orderReceiptPdf.js";

const CashierContext = createContext();

export function CashierProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("cashier_lang") || "ar");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [mobileView, setMobileView] = useState("catalog"); // 'catalog' | 'cart'

  // Multi-Tenant & Auth State
  const [token, setToken] = useState(() => localStorage.getItem("cashier_token") || localStorage.getItem("token") || "");
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

  // Listen for session expiration from API interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      setToken("");
      setCurrentUser(null);
      setShowAuthModal(true);
    };
    window.addEventListener("cashier:session-expired", handleSessionExpired);
    return () => window.removeEventListener("cashier:session-expired", handleSessionExpired);
  }, []);

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
  const [discountType, setDiscountType] = useState(() => localStorage.getItem("cashier_discount_type") || "percent");
  const [discountReason, setDiscountReason] = useState(() => localStorage.getItem("cashier_discount_reason") || "");

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
  const [showDailySalesModal, setShowDailySalesModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [activeRefundOrder, setActiveRefundOrder] = useState(null);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [terminalActiveTransaction, setTerminalActiveTransaction] = useState(null); // { amount, ip }
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(() => {
    return localStorage.getItem("cashier_auto_print") === "true";
  });

  const isSubmittingOrderRef = useRef(false);
  const isSendingKitchenRef = useRef(false);

  const [terminalConfig, setTerminalConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("cashier_terminal_config");
      return saved ? JSON.parse(saved) : { type: "network", ip: "192.168.1.150", port: 5000, protocol: "mada_ecr", enabled: true };
    } catch {
      return { type: "network", ip: "192.168.1.150", port: 5000, protocol: "mada_ecr", enabled: true };
    }
  });

  const [terminalHealth, setTerminalHealth] = useState("checking");

  const checkTerminalHealth = useCallback(async (cfg = null) => {
    const activeCfg = cfg || terminalConfig;
    if (!activeCfg || activeCfg.enabled === false) {
      setTerminalHealth("disconnected");
      return "disconnected";
    }
    if (activeCfg.type === "demo") {
      setTerminalHealth("demo");
      return "demo";
    }
    if (!activeCfg.ip || !activeCfg.ip.trim()) {
      setTerminalHealth("disconnected");
      return "disconnected";
    }

    setTerminalHealth("checking");
    try {
      const res = await api.post("/api/terminal/test-connection", {
        ip: activeCfg.ip.trim(),
        port: Number(activeCfg.port) || 5000,
        terminalType: activeCfg.protocol || "mada_ecr"
      }, { timeout: 3000 });

      if (res.data?.success) {
        setTerminalHealth("connected");
        return "connected";
      } else {
        setTerminalHealth("disconnected");
        return "disconnected";
      }
    } catch {
      setTerminalHealth("disconnected");
      return "disconnected";
    }
  }, [terminalConfig]);

  useEffect(() => {
    checkTerminalHealth();
  }, [terminalConfig, checkTerminalHealth]);

  useEffect(() => {
    if (activeTab === "payment") {
      checkTerminalHealth();
    }
  }, [activeTab, checkTerminalHealth]);

  const [printerConfig, setPrinterConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("cashier_printer_config");
      return saved ? JSON.parse(saved) : { type: "system", ip: "", port: 9100, paperWidth: "80mm" };
    } catch {
      return { type: "system", ip: "", port: 9100, paperWidth: "80mm" };
    }
  });

  const toggleAutoPrint = () => {
    setAutoPrintEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("cashier_auto_print", next.toString());
      return next;
    });
  };

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
    localStorage.setItem("cashier_discount_type", discountType);
  }, [discountType]);

  useEffect(() => {
    localStorage.setItem("cashier_discount_reason", discountReason);
  }, [discountReason]);

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
  const discountAmount = discountType === "fixed"
    ? Math.min(itemsSubtotal, Math.max(0, Number(orderDiscount) || 0))
    : itemsSubtotal * (Math.min(100, Math.max(0, Number(orderDiscount) || 0)) / 100);
  const netBeforeTax = (itemsSubtotal - discountAmount) / 1.15;
  const taxAmount = Math.max(0, (itemsSubtotal - discountAmount) - netBeforeTax);
  const grandTotal = Math.max(0, itemsSubtotal - discountAmount);

  const handleApplyDiscount = (val, type = "percent", reason = "") => {
    const numVal = Number(val) || 0;
    setOrderDiscount(numVal);
    setDiscountType(type);
    setDiscountReason(reason);

    if (activeEditingOrderId) {
      setPlacedOrders((prev) =>
        prev.map((o) =>
          o._id === activeEditingOrderId
            ? {
                ...o,
                discount: numVal,
                discountValue: numVal,
                discountType: type,
                discountReason: reason
              }
            : o
        )
      );

      if (!String(activeEditingOrderId).startsWith("order_")) {
        api
          .put(`/api/order/${activeEditingOrderId}`, {
            discount: numVal,
            discountType: type,
            discountReason: reason
          })
          .catch((err) => console.warn("Failed to auto-sync discount:", err));
      }
    }
  };

  const handleClearDiscount = () => {
    setOrderDiscount(0);
    setDiscountType("percent");
    setDiscountReason("");

    if (activeEditingOrderId) {
      setPlacedOrders((prev) =>
        prev.map((o) =>
          o._id === activeEditingOrderId
            ? {
                ...o,
                discount: 0,
                discountValue: 0,
                discountType: "percent",
                discountReason: ""
              }
            : o
        )
      );

      if (!String(activeEditingOrderId).startsWith("order_")) {
        api
          .put(`/api/order/${activeEditingOrderId}`, {
            discount: 0,
            discountAmount: 0,
            discountType: "percent",
            discountReason: ""
          })
          .catch((err) => console.warn("Failed to auto-sync discount removal:", err));
      }
    }
  };

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

      let dbCats = [];
      if (catRes?.data?.categories && Array.isArray(catRes.data.categories)) {
        dbCats = catRes.data.categories.map((c) => {
          let nameEn = c.name;
          let nameAr = c.nameArabic || c.name || "تصنيف";
          if (c.name && c.name.includes(" / ")) {
            const parts = c.name.split(" / ");
            nameEn = parts[0].trim();
            nameAr = parts[1].trim();
          }
          return { id: String(c._id), nameEn, nameAr, slug: c.slug || "" };
        });
      }
      setCategories(dbCats);

      if (menuRes?.data?.MenuList && Array.isArray(menuRes.data.MenuList)) {
        const dbProds = menuRes.data.MenuList.map((m) => {
          let nameEn = m.name;
          let nameAr = m.nameArabic || m.name;
          if (m.name && m.name.includes(" / ")) {
            const parts = m.name.split(" / ");
            nameEn = parts[0].trim();
            nameAr = parts[1].trim();
          }

          let catId = m.categoryId ? String(m.categoryId) : "";
          if (!catId && m.category && dbCats.length > 0) {
            const matchCat = dbCats.find(
              (c) =>
                c.nameEn?.toLowerCase() === String(m.category).toLowerCase() ||
                c.nameAr === m.category ||
                c.slug?.toLowerCase() === String(m.category).toLowerCase()
            );
            if (matchCat) catId = matchCat.id;
          }

          return {
            id: String(m._id),
            categoryId: catId,
            nameEn,
            nameAr,
            price: Number(m.price) || 0,
            description: m.description || "",
            image: m.image || ""
          };
        });
        setProducts(dbProds);
      } else {
        setProducts([]);
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
    const dynamicBase = getApiBaseUrl();
    const socketUrl = dynamicBase || (typeof window !== "undefined" ? window.location.origin : undefined);
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
      setPlacedOrders((prev) => {
        const exists = prev.some((o) => o._id === updatedOrderDoc._id);
        if (exists) {
          return prev.map((o) => (o._id === updatedOrderDoc._id ? { ...o, ...updatedOrderDoc } : o));
        }
        return [updatedOrderDoc, ...prev];
      });
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

    socket.on("staffStatusChanged", ({ staffId, staffStatus }) => {
      if (!staffId) return;
      setCurrentUser((prevUser) => {
        const uid = prevUser?._id || prevUser?.id || prevUser?.userId;
        if (uid && String(uid) === String(staffId)) {
          const updated = { ...prevUser, staffStatus };
          try {
            localStorage.setItem("cashier_user", JSON.stringify(updated));
          } catch {}
          return updated;
        }
        return prevUser;
      });
    });

    socket.on("app:pwa-update", () => {
      console.log("[Cashier] Remote PWA update requested via socket.");
      if (typeof window !== "undefined" && window.__tabletab_force_pwa_update) {
        window.__tabletab_force_pwa_update();
      }
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
  const checkStaffStatus = async () => {
    const uid = currentUser?._id || currentUser?.id || currentUser?.userId;
    if (!uid) return { active: false };
    try {
      const res = await api.get(`/api/admin/fetchAdmin/${uid}`);
      const updatedStaff = res.data?.admin;
      if (updatedStaff) {
        setCurrentUser(updatedStaff);
        localStorage.setItem("cashier_user", JSON.stringify(updatedStaff));
        if (updatedStaff.staffStatus !== "suspended") {
          loadServerData();
        }
        return { active: updatedStaff.staffStatus !== "suspended", staff: updatedStaff };
      }
    } catch (err) {
      console.warn("Failed to check staff status:", err);
    }
    return { active: currentUser?.staffStatus !== "suspended" };
  };

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

        if (staffUser?.staffStatus !== "suspended") {
          await loadServerData();
        }
        return { success: true, isSuspended: staffUser?.staffStatus === "suspended" };
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
    localStorage.setItem("cashier_last_active_time", Date.now().toString());
  };

  const handleUnlockScreen = (enteredPin) => {
    const activePin = currentUser?.posPin || screenLockPin || localStorage.getItem("cashier_lock_pin");
    if (!activePin) {
      handleSetLockPin(enteredPin);
      setIsScreenLocked(false);
      localStorage.removeItem("cashier_is_locked");
      localStorage.setItem("cashier_last_active_time", Date.now().toString());
      return { success: true };
    }
    if (enteredPin === activePin) {
      setIsScreenLocked(false);
      localStorage.removeItem("cashier_is_locked");
      localStorage.setItem("cashier_last_active_time", Date.now().toString());
      return { success: true };
    }
    return { success: false, message: lang === "ar" ? "رمز القفل غير صحيح" : "Incorrect PIN" };
  };

  // -------------------------------------------------------------------------
  // 1. AUTO-LOCK IMMEDIATELY ON SCREEN OFF / TABLET SLEEP / TAB MINIMIZED
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!token || !currentUser) return;

    const handleScreenOffOrHidden = () => {
      if (document.visibilityState === "hidden") {
        // Screen turned off, tablet locked, or app minimized/switched -> Lock immediately!
        setIsScreenLocked(true);
        localStorage.setItem("cashier_is_locked", "true");
        localStorage.setItem("cashier_last_active_time", Date.now().toString());
      } else if (document.visibilityState === "visible") {
        // When waking up or becoming visible again, check lock state or inactivity
        const isLocked = localStorage.getItem("cashier_is_locked") === "true";
        const lastActive = Number(localStorage.getItem("cashier_last_active_time") || 0);
        if (isLocked || (lastActive > 0 && Date.now() - lastActive >= 5 * 60 * 1000)) {
          setIsScreenLocked(true);
          localStorage.setItem("cashier_is_locked", "true");
        }
      }
    };

    document.addEventListener("visibilitychange", handleScreenOffOrHidden);
    window.addEventListener("pagehide", handleScreenOffOrHidden);
    window.addEventListener("freeze", handleScreenOffOrHidden);

    // Cross-tab lock synchronization
    const handleStorageChange = (e) => {
      if (e.key === "cashier_is_locked") {
        setIsScreenLocked(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      document.removeEventListener("visibilitychange", handleScreenOffOrHidden);
      window.removeEventListener("pagehide", handleScreenOffOrHidden);
      window.removeEventListener("freeze", handleScreenOffOrHidden);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [token, currentUser]);

  // -------------------------------------------------------------------------
  // 2. AUTO-LOCK ON 5 MINUTES (300s) OF INACTIVITY (TOUCH / MOUSE / KEYBOARD)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!token || !currentUser || isScreenLocked) return;

    const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 Minutes
    let timer = null;

    const triggerLock = () => {
      setIsScreenLocked(true);
      localStorage.setItem("cashier_is_locked", "true");
    };

    const resetInactivityTimer = () => {
      localStorage.setItem("cashier_last_active_time", Date.now().toString());
      if (timer) clearTimeout(timer);
      timer = setTimeout(triggerLock, INACTIVITY_TIMEOUT_MS);
    };

    // Initialize timer and active timestamp
    resetInactivityTimer();

    // Heartbeat check every 5 seconds to catch system sleep or timer pauses
    const heartbeatInterval = setInterval(() => {
      const lastActive = Number(localStorage.getItem("cashier_last_active_time") || Date.now());
      if (Date.now() - lastActive >= INACTIVITY_TIMEOUT_MS) {
        triggerLock();
      }
    }, 5000);

    // Comprehensive events across touchscreens, tablets, barcode scanners, and desktops
    const interactionEvents = [
      "touchstart",
      "touchend",
      "touchmove",
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "click",
      "pointerdown",
      "input"
    ];

    const throttledReset = (() => {
      let lastCall = 0;
      return () => {
        const now = Date.now();
        if (now - lastCall > 1000) {
          lastCall = now;
          resetInactivityTimer();
        }
      };
    })();

    interactionEvents.forEach((evt) => {
      window.addEventListener(evt, throttledReset, { passive: true });
    });

    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(heartbeatInterval);
      interactionEvents.forEach((evt) => {
        window.removeEventListener(evt, throttledReset);
      });
    };
  }, [token, currentUser, isScreenLocked]);

  const handleStaffLogout = async () => {
    setToken("");
    setCurrentUser(null);
    setIsScreenLocked(false);
    localStorage.removeItem("token");
    localStorage.removeItem("cashier_token");
    localStorage.removeItem("cashier_user");
    localStorage.removeItem("cashier_is_locked");
    // Reload server data without staff token
    await loadServerData();
  };

  const handleSwitchTenantSlug = async (slug) => {
    try {
      const cleanSlug = String(slug || "").trim().toLowerCase();
      const res = await api.get(`/api/tenant/by-slug/${cleanSlug}`);
      if (res.data?.tenant) {
        const tObj = res.data.tenant;
        setCurrentTenant(tObj);
        localStorage.setItem("cashier_tenant", JSON.stringify(tObj));
        localStorage.setItem("cashier_tenant_id", tObj._id);
        localStorage.setItem("cashier_tenant_slug", tObj.slug);
        
        // Reset current catalog & cart state for new cafe
        setCategories([]);
        setProducts([]);
        setSelectedCategory(null);
        setCart([]);
        setCustomerName("");
        setActiveEditingOrderId(null);

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
    const editingOrder = placedOrders.find((ord) => ord._id === activeEditingOrderId);
    const isOrderPaid =
      editingOrder &&
      (editingOrder.paymentStatus === "paid" ||
        editingOrder.paymentStatus === "refunded" ||
        editingOrder.status === "Finished" ||
        editingOrder.status === "Finised" ||
        editingOrder.status === "Cancelled");

    if (isOrderPaid) {
      alert(
        lang === "ar"
          ? "الطلب الحالي مدفوع ومكتمل. لا يمكن إضافة أصناف على طلب مدفوع. يرجى الضغط على (+ طلب جديد) لإنشاء طلب جديد."
          : "The active order is paid/completed. Items cannot be added to a paid order. Please click (+ New Order) to start a new order."
      );
      return;
    }

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
    const editingOrder = placedOrders.find((ord) => ord._id === activeEditingOrderId);
    const isOrderPaid =
      editingOrder &&
      (editingOrder.paymentStatus === "paid" ||
        editingOrder.paymentStatus === "refunded" ||
        editingOrder.status === "Finished" ||
        editingOrder.status === "Finised" ||
        editingOrder.status === "Cancelled");

    if (isOrderPaid) {
      return;
    }

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

  const handleNewOrder = async (autoSaveCurrent = true) => {
    if (autoSaveCurrent && cart.length > 0 && token) {
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
            discount: orderDiscount,
            discountAmount: discountAmount,
            discountType: discountType,
            discountReason: discountReason,
            status: "In Progress",
            paymentStatus: "unpaid"
          });

          const updated = res.data?.order;
          if (updated) {
            setPlacedOrders((prev) =>
              prev.map((o) => (o._id === activeEditingOrderId ? updated : o))
            );
          }
        } else {
          // Persist as a new open unpaid order on server so it exists in orders list
          const res = await api.post("/api/order/create-order", {
            customerName: customerName || (lang === "ar" ? "عميل صالة" : "Dine-in Customer"),
            tableId: selectedTable || 1,
            items: payloadItems,
            totalPrice: grandTotal,
            discount: orderDiscount,
            discountAmount: discountAmount,
            discountType: discountType,
            discountReason: discountReason,
            paymentMethod: "cash",
            cashAmount: 0,
            cardAmount: 0,
            paymentStatus: "unpaid",
            status: "In Progress"
          });

          const serverOrder = res.data?.order;
          if (serverOrder) {
            setPlacedOrders((prev) => {
              const exists = prev.some((o) => o._id === serverOrder._id);
              if (exists) {
                return prev.map((o) => (o._id === serverOrder._id ? serverOrder : o));
              }
              return [serverOrder, ...prev];
            });
          }
        }
      } catch (err) {
        console.warn("Auto-save open unpaid order error:", err);
      }
    }

    setActiveEditingOrderId(null);
    setCart([]);
    setCustomerName("");
    setSelectedTable(1);
    setOrderDiscount(0);
    setDiscountType("percent");
    setDiscountReason("");
    setActiveTab("home");
    setMobileView("catalog");
  };

  const handleOpenOrder = (order, targetTab = null) => {
    if (!order) return;
    setActiveEditingOrderId(order._id);
    setCustomerName(order.customerName || "");
    setSelectedTable(Number(order.tableId) || 1);
    setOrderDiscount(Number(order.discount || order.discountValue || 0));
    setDiscountType(order.discountType || "percent");
    setDiscountReason(order.discountReason || "");

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
    if (targetTab) {
      setActiveTab(targetTab);
    }
  };

  const handlePayOrderDirect = (order) => {
    if (!order) return;
    const isRefunded = order.paymentStatus === "refunded" || (Number(order.refundedAmount) > 0 && order.status === "Cancelled");
    const isCancelled = order.status === "Cancelled";
    const isPaid = order.paymentStatus === "paid" || order.status === "Finished" || order.status === "Finised";

    if (isRefunded || isCancelled || isPaid) {
      alert(
        lang === "ar"
          ? "لا يمكن سداد طلب مسترجع أو ملغي أو مدفوع مسبقاً"
          : "A refunded, cancelled, or settled order cannot be paid again"
      );
      return;
    }

    handleOpenOrder(order, "payment");
    setMobileView("catalog");
  };

  // ----------------------------------------------------
  // Send to Kitchen (Open Unpaid Tab)
  // ----------------------------------------------------
  const handleSendToKitchen = async () => {
    if (!cart.length || isSendingKitchenRef.current) {
      if (!cart.length) {
        alert(lang === "ar" ? "السلة فارغة، يرجى إضافة أطباق أولاً" : "Cart is empty, please add items first");
      }
      return;
    }

    if (!token) {
      alert(lang === "ar" ? "يجب تسجيل دخول الكاشير أولاً" : "Cashier login required");
      setShowAuthModal(true);
      return;
    }

    isSendingKitchenRef.current = true;

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
          discount: orderDiscount,
          discountAmount: discountAmount,
          discountType: discountType,
          discountReason: discountReason,
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
        discount: orderDiscount,
        discountAmount: discountAmount,
        discountType: discountType,
        discountReason: discountReason,
        paymentMethod: "cash",
        cashAmount: 0,
        cardAmount: 0,
        paymentStatus: "unpaid",
        status: "In Progress"
      });

      const serverOrder = res.data?.order;
      if (serverOrder) {
        setPlacedOrders((prev) => {
          const exists = prev.some((o) => o._id === serverOrder._id);
          if (exists) {
            return prev.map((o) => (o._id === serverOrder._id ? serverOrder : o));
          }
          return [serverOrder, ...prev];
        });
        alert(
          lang === "ar"
            ? `تم إنشاء الطلب #${serverOrder.dailyOrderNumber || ""} وإرساله للمطبخ بنجاح`
            : `Order #${serverOrder.dailyOrderNumber || ""} sent to kitchen`
        );
      }
      handleNewOrder(false);
    } catch (err) {
      console.error("Kitchen dispatch error:", err);
      if (err.response?.status === 401) {
        alert(
          lang === "ar"
            ? "انتهت صلاحية جلسة الكاشير، يرجى تسجيل الدخول مجدداً."
            : "Cashier session expired. Please log in again."
        );
        handleStaffLogout();
        setShowAuthModal(true);
        return;
      }
      alert(lang === "ar" ? `فشل إرسال الطلب: ${err.response?.data?.message || err.message}` : `Failed to send order: ${err.message}`);
    } finally {
      isSendingKitchenRef.current = false;
    }
  };

  const handleOpenRefundModal = (order = null) => {
    const target = order || placedOrders.find((ord) => ord._id === activeEditingOrderId);
    if (!target) return;
    setActiveRefundOrder(target);
    setShowRefundModal(true);
  };

  const handleRefundOrder = async (orderId, refundMethod, refundAmount, reason, refundedItems = []) => {
    if (!orderId) return false;
    try {
      const res = await api.post(`/api/order/${orderId}/refund`, {
        refundMethod,
        refundAmount,
        refundedItems,
        reason
      });

      const updatedOrder = res.data?.order;
      if (updatedOrder) {
        setPlacedOrders((prev) =>
          prev.map((o) => (o._id === orderId ? updatedOrder : o))
        );
      }

      // If active order was this refunded order, reset to clean state
      if (activeEditingOrderId === orderId) {
        handleNewOrder(false);
      }

      alert(
        lang === "ar"
          ? `تم استرجاع مبلغ (${Number(refundAmount || updatedOrder?.refundedAmount || 0).toFixed(2)} ﷼) للطلب #${updatedOrder?.dailyOrderNumber || ""} بنجاح (${refundMethod === "cash" ? "نقدي / كاش" : "شبكة / بطاقة"}) وتم خصمه من مبيعات اليوم.`
          : `Order #${updatedOrder?.dailyOrderNumber || ""} refunded (${Number(refundAmount || updatedOrder?.refundedAmount || 0).toFixed(2)} SAR) successfully (${refundMethod.toUpperCase()}) and deducted from today's sales.`
      );
      return true;
    } catch (err) {
      console.error("Refund error:", err);
      alert(
        lang === "ar"
          ? `فشل استرجاع الطلب: ${err.response?.data?.message || err.message}`
          : `Failed to refund order: ${err.response?.data?.message || err.message}`
      );
      return false;
    }
  };

  const handleClearCart = (promptConfirm = true) => {
    const editingOrder = placedOrders.find((ord) => ord._id === activeEditingOrderId);
    const isOrderPaid =
      editingOrder &&
      (editingOrder.paymentStatus === "paid" ||
        editingOrder.paymentStatus === "refunded" ||
        editingOrder.status === "Finished" ||
        editingOrder.status === "Finised");

    if (isOrderPaid) {
      // If paid, trigger refund and cancel modal
      handleOpenRefundModal(editingOrder);
      return;
    }

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

  const handlePrintReceipt = useCallback(async (orderToPrint) => {
    if (!orderToPrint) return;
    const bizName = currentTenant?.businessName || (lang === "ar" ? "مطعم تيبل تاب" : "TableTab POS");
    const taxNum = currentTenant?.taxNumber || orderToPrint?.taxNumber || "";

    // 1. If Network IP thermal printer is selected and configured, send to printer IP over TCP socket!
    if (printerConfig?.type === "network" && printerConfig?.ip) {
      try {
        await api.post("/api/printer/print-order", {
          ip: printerConfig.ip.trim(),
          port: Number(printerConfig.port) || 9100,
          order: orderToPrint,
          businessName: bizName,
          taxNumber: taxNum
        });
        return;
      } catch (err) {
        console.warn("Network IP print error, falling back to browser print:", err);
      }
    }

    // 2. Default browser thermal printing (works with USB, Bluetooth, Kiosk mode)
    try {
      printOrderReceipt(orderToPrint, { businessName: bizName, taxNumber: taxNum });
    } catch (err) {
      console.warn("Direct receipt print error:", err);
    }
  }, [currentTenant, lang, printerConfig]);

  const handleSubmitOrder = async (method = "cash", splitDetails = { cash: 0, card: 0 }) => {
    if (!cart.length || isSubmittingOrderRef.current || isPaymentProcessing) return null;

    if (!token) {
      alert(
        lang === "ar"
          ? "يجب تسجيل دخول الكاشير لإتمام دفع الطلبات"
          : "Cashier login required to process payment"
      );
      setShowAuthModal(true);
      return null;
    }

    isSubmittingOrderRef.current = true;
    setIsPaymentProcessing(true);

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
          discount: orderDiscount,
          discountAmount: discountAmount,
          discountType: discountType,
          discountReason: discountReason,
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
        setPaymentSuccessData(completedOrder);

        // Auto print thermal slip if enabled (or in kiosk printing mode)
        if (autoPrintEnabled) {
          try {
            handlePrintReceipt(completedOrder);
          } catch (pErr) {
            console.warn("Auto-print on tablet caught:", pErr);
          }
        }

        handleNewOrder(false);
        return completedOrder;
      }

      // Creating a new direct paid order on server
      const res = await api.post("/api/order/create-order", {
        customerName: customerName || (lang === "ar" ? "عميل كاشير" : "Counter Guest"),
        tableId: selectedTable || 1,
        items: payloadItems,
        totalPrice: grandTotal,
        discount: orderDiscount,
        discountAmount: discountAmount,
        discountType: discountType,
        discountReason: discountReason,
        paymentMethod: finalMethod,
        cashAmount: cashAmt,
        cardAmount: cardAmt,
        paymentStatus: "paid",
        status: "Finished"
      });

      const serverOrder = res.data?.order;
      if (serverOrder) {
        setPlacedOrders((prev) => {
          const exists = prev.some((o) => o._id === serverOrder._id);
          if (exists) {
            return prev.map((o) => (o._id === serverOrder._id ? serverOrder : o));
          }
          return [serverOrder, ...prev];
        });
        setActivePrintOrder(serverOrder);
        setPaymentSuccessData(serverOrder);

        // Auto print thermal slip if enabled (or in kiosk printing mode)
        if (autoPrintEnabled) {
          try {
            handlePrintReceipt(serverOrder);
          } catch (pErr) {
            console.warn("Auto-print on tablet caught:", pErr);
          }
        }
      }

      handleNewOrder(false);
      return serverOrder;
    } catch (err) {
      console.error("Order payment error:", err);
      if (err.response?.status === 401) {
        alert(
          lang === "ar"
            ? "انتهت صلاحية جلسة الكاشير أو غير مصرح به. يرجى تسجيل الدخول مجدداً لإتمام الدفع."
            : "Cashier session has expired. Please log in again to complete payment."
        );
        handleStaffLogout();
        setShowAuthModal(true);
        return null;
      }
      alert(lang === "ar" ? `فشل إتمام الدفع: ${err.response?.data?.message || err.message}` : `Payment failed: ${err.message}`);
      return null;
    } finally {
      setIsPaymentProcessing(false);
      isSubmittingOrderRef.current = false;
    }
  };

  const handlePayWithTerminal = async (targetAmount = null) => {
    const amt = targetAmount !== null && targetAmount > 0 ? targetAmount : grandTotal;
    if (!amt || amt <= 0 || !cart.length) {
      return null;
    }

    const isDemo = terminalConfig?.type === "demo" || !terminalConfig?.ip;

    setTerminalActiveTransaction({
      amount: amt,
      ip: isDemo ? "DEMO" : terminalConfig?.ip,
      isDemo
    });

    if (isDemo) {
      return;
    }

    try {
      const res = await api.post("/api/terminal/charge", {
        ip: terminalConfig?.ip,
        port: terminalConfig?.port || 5000,
        amount: amt,
        currency: "SAR"
      });

      if (res.data?.success && res.data?.status === "APPROVED") {
        setTerminalActiveTransaction(null);
        return await handleSubmitOrder("card", { cash: 0, card: amt });
      }
    } catch (err) {
      console.warn("Terminal charge error:", err.message);
      setTerminalActiveTransaction(null);
      alert(lang === "ar" ? `فشلت عملية جهاز الدفع: ${err.message}` : `Terminal transaction failed: ${err.message}`);
    }
  };

  const handleTerminalSuccess = async () => {
    const amt = terminalActiveTransaction?.amount || grandTotal;
    setTerminalActiveTransaction(null);
    return await handleSubmitOrder("card", { cash: 0, card: amt });
  };

  const handleCancelTerminalPayment = () => {
    setTerminalActiveTransaction(null);
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
      if (err.response?.status === 401) {
        alert(
          lang === "ar"
            ? "انتهت صلاحية جلسة الكاشير، يرجى تسجيل الدخول مجدداً."
            : "Cashier session expired. Please log in again."
        );
        handleStaffLogout();
        setShowAuthModal(true);
        return;
      }
      alert(err.response?.data?.message || err.message);
    }
  };

  // Filter products by category and search queries
  const filteredProducts = products.filter((p) => {
    if (selectedCategory && String(p.categoryId) !== String(selectedCategory.id)) return false;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchEn = (p.nameEn || "").toLowerCase().includes(q);
      const matchAr = (p.nameAr || "").toLowerCase().includes(q);
      return matchEn || matchAr;
    }
    return true;
  });

  // ----------------------------------------------------
  // Category CRUD Handlers (Server Backed under Active Cafe)
  // ----------------------------------------------------
  const handleAddCategory = async (nameEn, nameAr) => {
    const combinedName = nameEn && nameAr && nameEn !== nameAr ? `${nameEn} / ${nameAr}` : (nameAr || nameEn);
    try {
      const res = await api.post("/api/categories", { name: combinedName });
      const serverCat = res.data?.category;
      if (serverCat) {
        setCategories((prev) => [
          ...prev,
          { id: String(serverCat._id), nameEn: nameEn || nameAr, nameAr: nameAr || nameEn, slug: serverCat.slug || "" }
        ]);
        await loadServerData();
      }
      alert(lang === "ar" ? "تمت إضافة التصنيف وحفظه على الخادم بنجاح!" : "Category saved to server successfully!");
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setShowAuthModal(true);
        alert(lang === "ar" ? "يرجى تسجيل الدخول بحساب الكاشير أو المدير لحفظ التصنيفات على الخادم" : "Please log in to save categories to the server");
      } else {
        alert(err.response?.data?.message || "Failed to add category");
      }
    }
  };

  const handleEditCategory = async (id, nameEn, nameAr) => {
    const combinedName = nameEn && nameAr && nameEn !== nameAr ? `${nameEn} / ${nameAr}` : (nameAr || nameEn);
    try {
      await api.put(`/api/categories/${id}`, { name: combinedName });
      setCategories((prev) =>
        prev.map((c) => (String(c.id) === String(id) ? { ...c, nameEn: nameEn || nameAr, nameAr: nameAr || nameEn } : c))
      );
      await loadServerData();
      alert(lang === "ar" ? "تم تعديل التصنيف على الخادم بنجاح!" : "Category updated on server successfully!");
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setShowAuthModal(true);
        alert(lang === "ar" ? "يرجى تسجيل الدخول لتعديل التصنيفات على الخادم" : "Please log in to update categories on the server");
      } else {
        alert(err.response?.data?.message || "Failed to update category");
      }
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm(lang === "ar" ? "هل أنت متأكد من حذف هذا التصنيف نهائياً من الخادم؟" : "Are you sure you want to delete this category from the server?")) {
      return;
    }
    try {
      await api.delete(`/api/categories/${id}`);
      setCategories((prev) => prev.filter((c) => String(c.id) !== String(id)));
      setProducts((prev) => prev.filter((p) => String(p.categoryId) !== String(id)));
      if (selectedCategory && String(selectedCategory.id) === String(id)) {
        setSelectedCategory(null);
      }
      await loadServerData();
      alert(lang === "ar" ? "تم حذف التصنيف من الخادم بنجاح!" : "Category deleted from server successfully!");
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setShowAuthModal(true);
        alert(lang === "ar" ? "يرجى تسجيل الدخول لحذف التصنيف من الخادم" : "Please log in to delete category from the server");
      } else {
        alert(err.response?.data?.message || "Failed to delete category");
      }
    }
  };

  // ----------------------------------------------------
  // Product CRUD Handlers (Server Backed under Active Cafe)
  // ----------------------------------------------------
  const handleAddProduct = async (nameEn, nameAr, price, categoryId, imageFile = null) => {
    const combinedName = nameEn && nameAr && nameEn !== nameAr ? `${nameEn} / ${nameAr}` : (nameAr || nameEn);
    const matchedCat = categories.find((c) => String(c.id) === String(categoryId));
    const catLabel = matchedCat?.nameEn || matchedCat?.nameAr || "Others";

    try {
      let res;
      if (imageFile) {
        const formData = new FormData();
        formData.append("name", combinedName);
        formData.append("price", Number(price));
        formData.append("description", "POS item");
        if (categoryId && categoryId !== "") {
          formData.append("categoryId", categoryId);
        }
        formData.append("category", catLabel);
        formData.append("image", imageFile);

        res = await api.post("/api/menu/add-menu", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        res = await api.post("/api/menu/add-menu", {
          name: combinedName,
          price: Number(price),
          description: "POS item",
          categoryId: categoryId || undefined,
          category: catLabel
        });
      }

      const serverProd = res.data?.newMenu || res.data?.menu;
      if (serverProd) {
        setProducts((prev) => [
          ...prev,
          {
            id: String(serverProd._id),
            categoryId: String(categoryId || ""),
            nameEn: nameEn || nameAr,
            nameAr: nameAr || nameEn,
            price: Number(price),
            description: "",
            image: serverProd.image || ""
          }
        ]);
        await loadServerData();
      }
      return { success: true };
    } catch (err) {
      console.error("Add product error:", err);
      const errMsg = err.response?.data?.message || err.message || "Failed to add product";
      if (err.response?.status === 401 || err.response?.status === 403) {
        setShowAuthModal(true);
        alert(lang === "ar" ? "يرجى تسجيل الدخول بحساب الكاشير أو المدير لحفظ الأصناف على الخادم" : "Please log in to add items to the server");
      } else {
        alert(lang === "ar" ? `تعذر حفظ الصنف: ${errMsg}` : `Failed to add product: ${errMsg}`);
      }
      return { success: false, message: errMsg };
    }
  };

  const handleEditProduct = async (id, nameEn, nameAr, price, categoryId, imageFile = null) => {
    const combinedName = nameEn && nameAr && nameEn !== nameAr ? `${nameEn} / ${nameAr}` : (nameAr || nameEn);
    const matchedCat = categories.find((c) => String(c.id) === String(categoryId));
    const catLabel = matchedCat?.nameEn || matchedCat?.nameAr || "Others";

    try {
      let res;
      if (imageFile) {
        const formData = new FormData();
        formData.append("name", combinedName);
        formData.append("price", Number(price));
        formData.append("description", "POS item");
        if (categoryId && categoryId !== "") {
          formData.append("categoryId", categoryId);
        }
        formData.append("category", catLabel);
        formData.append("image", imageFile);

        res = await api.put(`/api/menu/update/${id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        res = await api.put(`/api/menu/update/${id}`, {
          name: combinedName,
          price: Number(price),
          description: "POS item",
          categoryId: categoryId || undefined,
          category: catLabel
        });
      }

      const updated = res.data?.updatedMenu || res.data?.menu;
      setProducts((prev) =>
        prev.map((p) =>
          String(p.id) === String(id) ? { 
            ...p, 
            nameEn: nameEn || nameAr, 
            nameAr: nameAr || nameEn, 
            price: Number(price), 
            categoryId: String(categoryId || ""),
            image: updated?.image || p.image || ""
          } : p
        )
      );
      await loadServerData();
      return { success: true };
    } catch (err) {
      console.error("Edit product error:", err);
      const errMsg = err.response?.data?.message || err.message || "Failed to update product";
      if (err.response?.status === 401 || err.response?.status === 403) {
        setShowAuthModal(true);
        alert(lang === "ar" ? "يرجى تسجيل الدخول لتعديل الأصناف على الخادم" : "Please log in to update items on the server");
      } else {
        alert(lang === "ar" ? `تعذر تعديل الصنف: ${errMsg}` : `Failed to update product: ${errMsg}`);
      }
      return { success: false, message: errMsg };
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm(lang === "ar" ? "هل أنت متأكد من حذف هذا الصنف نهائياً من الخادم؟" : "Are you sure you want to delete this dish from the server?")) {
      return;
    }
    try {
      await api.delete(`/api/menu/delete/${id}`);
      setProducts((prev) => prev.filter((p) => String(p.id) !== String(id)));
      await loadServerData();
      alert(lang === "ar" ? "تم حذف الصنف من الخادم بنجاح!" : "Dish deleted from server successfully!");
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setShowAuthModal(true);
        alert(lang === "ar" ? "يرجى تسجيل الدخول لحذف الأصناف من الخادم" : "Please log in to delete items from the server");
      } else {
        alert(err.response?.data?.message || "Failed to delete product");
      }
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
        discountType,
        setDiscountType,
        discountReason,
        setDiscountReason,
        discountAmount,
        itemsSubtotal,
        handleApplyDiscount,
        handleClearDiscount,
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
        showDailySalesModal,
        setShowDailySalesModal,
        showRefundModal,
        setShowRefundModal,
        activeRefundOrder,
        setActiveRefundOrder,
        handleOpenRefundModal,
        handleRefundOrder,
        showAuthModal,
        setShowAuthModal,
        showPrinterModal,
        setShowPrinterModal,
        printerConfig,
        setPrinterConfig,
        showTerminalModal,
        setShowTerminalModal,
        terminalConfig,
        setTerminalConfig,
        terminalHealth,
        checkTerminalHealth,
        terminalActiveTransaction,
        handlePayWithTerminal,
        handleTerminalSuccess,
        handleCancelTerminalPayment,
        paymentSuccessData,
        setPaymentSuccessData,
        isPaymentProcessing,
        autoPrintEnabled,
        setAutoPrintEnabled,
        toggleAutoPrint,
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
        handlePayOrderDirect,
        handleSubmitOrder,
        handleUpdateOrderStatus,
        filteredProducts,
        activePrintOrder,
        handlePrintReceipt,
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
        isManagerOrOwner: currentUser?.role === "owner" || currentUser?.role === "manager" || currentUser?.role === "admin",
        token,
        socketConnected,
        handleStaffLogin,
        handleStaffLogout,
        checkStaffStatus,
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
