/* eslint-disable react-refresh/only-export-components -- context + provider in one module */
import {
  createContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { API_BASE_URL } from "../utils/apiBaseUrl.js";
import { api } from "../utils/api.js";

export const AuthContext = createContext();

const USER_STORAGE_KEY = "tabletab_user";
const CART_STORAGE_KEY = "tabletab_cart_state";

/** Shared shape for localStorage + server cart payloads */
function normalizeCartPayload(raw) {
  const cartIn = Array.isArray(raw?.cart) ? raw.cart : [];
  const cart = cartIn.filter(
    (i) =>
      i &&
      typeof i === "object" &&
      i._id != null &&
      typeof i.quantity === "number" &&
      i.quantity > 0 &&
      typeof i.price === "number",
  );

  let quantities =
    raw?.quantities &&
    typeof raw.quantities === "object" &&
    !Array.isArray(raw.quantities)
      ? { ...raw.quantities }
      : {};
  for (const item of cart) {
    const id = String(item._id);
    quantities[id] = item.quantity;
  }
  return { cart, quantities };
}

function loadPersistedCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { cart: [], quantities: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { cart: [], quantities: {} };
    return normalizeCartPayload(parsed);
  } catch {
    return { cart: [], quantities: {} };
  }
}

function loadPersistedUser() {
  try {
    const token = localStorage.getItem("token")?.trim();
    if (!token) return null;
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function stripPassword(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const { password: _omit, ...rest } = obj;
  return rest;
}

export const ContextProvider = ({ children }) => {
  const [quantities, setQuantities] = useState(
    () => loadPersistedCart().quantities,
  );
  const [cart, setCart] = useState(() => loadPersistedCart().cart);
  const [user, setUserState] = useState(loadPersistedUser);
  const [myOrders, setMyOrders] = useState([]);
  const [remoteCartEpoch, setRemoteCartEpoch] = useState(0);

  const cartRef = useRef(cart);
  const quantitiesRef = useRef(quantities);
  useEffect(() => {
    cartRef.current = cart;
    quantitiesRef.current = quantities;
  }, [cart, quantities]);

  /** True after guest → account login/signup this session (upload local cart if server empty). */
  const pendingGuestCartMergeRef = useRef(false);
  /** When logged in, false until first remote cart fetch finishes (avoid PUT racing GET). */
  const cartRemoteReadyRef = useRef(!loadPersistedUser()?._id);

  const setUser = useCallback((next) => {
    setUserState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      if (value == null) {
        pendingGuestCartMergeRef.current = false;
      } else if (
        prev == null &&
        value != null &&
        typeof value === "object"
      ) {
        pendingGuestCartMergeRef.current = true;
      }
      try {
        if (value && typeof value === "object") {
          localStorage.setItem(
            USER_STORAGE_KEY,
            JSON.stringify(stripPassword(value)),
          );
        } else {
          localStorage.removeItem(USER_STORAGE_KEY);
          localStorage.removeItem("token");
        }
      } catch {
        /* ignore quota / JSON errors */
      }
      return value;
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token")?.trim();
    if (!token) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const res = await api.get("/api/user/me");
        const u = res.data?.user;
        if (cancelled || !u || typeof u !== "object") return;
        setUserState(stripPassword(u));
        try {
          localStorage.setItem(
            USER_STORAGE_KEY,
            JSON.stringify(stripPassword(u)),
          );
        } catch {
          /* ignore */
        }
      } catch (err) {
        if (cancelled) return;
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem(USER_STORAGE_KEY);
          setUserState(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const userId = user?._id;

  useEffect(() => {
    if (!userId) {
      cartRemoteReadyRef.current = true;
      return undefined;
    }
    cartRemoteReadyRef.current = false;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get("/api/user/cart");
        if (cancelled) return;

        const server = normalizeCartPayload({
          cart: res.data?.cart,
          quantities: res.data?.quantities,
        });

        if (server.cart.length > 0) {
          pendingGuestCartMergeRef.current = false;
          setCart(server.cart);
          setQuantities(server.quantities);
        } else {
          const pendingMerge = pendingGuestCartMergeRef.current;
          pendingGuestCartMergeRef.current = false;
          const localPayload = normalizeCartPayload({
            cart: cartRef.current,
            quantities: quantitiesRef.current,
          });

          if (pendingMerge && localPayload.cart.length > 0) {
            try {
              await api.put("/api/user/cart", localPayload);
            } catch {
              /* keep local cart in UI; retry on next edit */
            }
          } else {
            setCart([]);
            setQuantities({});
          }
        }
      } catch {
        /* offline / error — keep current cart */
      } finally {
        if (!cancelled) {
          cartRemoteReadyRef.current = true;
          setRemoteCartEpoch((e) => e + 1);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({ cart, quantities }),
      );
    } catch {
      /* ignore quota / private mode */
    }
  }, [cart, quantities]);

  useEffect(() => {
    if (!userId) return undefined;
    if (!cartRemoteReadyRef.current) return undefined;
    const t = setTimeout(() => {
      const payload = normalizeCartPayload({
        cart: cartRef.current,
        quantities: quantitiesRef.current,
      });
      api.put("/api/user/cart", payload).catch(() => {});
    }, 450);
    return () => clearTimeout(t);
  }, [cart, quantities, userId, remoteCartEpoch]);

  const URL = API_BASE_URL;

  const handleRemove = (id) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max((prev[id] || 0) - 1, 0),
    }));

    setCart((prevCart) =>
      prevCart
        .map((i) =>
          i._id == id ? { ...i, quantity: Math.max(i.quantity - 1, 0) } : i,
        )
        .filter((i) => i.quantity > 0),
    );
  };

  const incrementQuantity = (id) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
    setCart((prevCart) =>
      prevCart.map((i) =>
        i._id == id ? { ...i, quantity: i.quantity + 1 } : i,
      ),
    );
  };

  const contextValue = {
    URL,
    quantities,
    setQuantities,
    cart,
    setCart,
    user,
    setUser,
    myOrders,
    setMyOrders,
    handleRemove,
    incrementQuantity,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
