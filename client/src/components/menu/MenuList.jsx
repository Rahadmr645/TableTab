import React, { useContext, useState, useEffect } from "react";
import axios from "axios";
import { AuthContext } from "../../context/CartContext";
import './MenuList.css';
import { Link } from "react-router-dom"
import { IoAddCircleOutline } from "react-icons/io5";
import { RxDividerHorizontal } from "react-icons/rx";

const MenuList = () => {
  const { URL, quantities, setQuantities, cart, setCart } = useContext(AuthContext);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const categories = [
    "All",
    "Hot Drinks",
    "Cold Drinks",
    "Tea",
    "Arabic Coffee",
    "Desserts",
    "Snacks",
    "Cakes",
    "Others",
  ];

  // Fetch menu items
  useEffect(() => {
    const fetchMenus = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${URL}/api/menu/menuList`);
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.MenuList)
            ? res.data.MenuList
            : [];
        setMenuItems(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching menu:", err);
        setError("Failed to load menu. Please try again later.");
        setLoading(false);
      }
    };

    fetchMenus();
  }, [URL]);

  const filteredItems = selectedCategory === "All"
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);

  if (loading) return <p>Loading menu...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  // Add item to cart & update quantities
  const handleAdd = (item) => {
    // update quantities
    setQuantities(prev => ({
      ...prev,
      [item._id]: (prev[item._id] || 0) + 1,
    }));

    // update cart
    setCart(prevCart => {
      const existing = prevCart.find(i => i._id === item._id);
      if (existing) {
        return prevCart.map(i =>
          i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
  };

  // Remove item from cart & update quantities
  const handleRemove = (item) => {
    setQuantities(prev => ({
      ...prev,
      [item._id]: Math.max((prev[item._id] || 0) - 1, 0),
    }));

    setCart(prevCart => {
      return prevCart
        .map(i =>
          i._id === item._id
            ? { ...i, quantity: Math.max(i.quantity - 1, 0) }
            : i
        )
        .filter(i => i.quantity > 0); // remove items with 0 quantity
    });
  };

  return (
    <div className="menu-list-container">
      {/* <h2 className="menu-title">Our Menu</h2> */}

      {/* Category Navbar */}
      <div className="category-navbar">
        {categories.map(cat => (
          <button
            key={cat}
            className={`category-btn ${selectedCategory === cat ? "active" : ""}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
       
      </div>

      {/* Menu Cards */}
      <div className="menu-grid">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => (
            <div className="menu-card" key={item._id}>
              <img
                src={`${URL}${item.image}`}
                alt={item.name}
                className="menu-image"
              />

              {quantities[item._id] > 0 ? (
                <div className="quantities-box">
                  <p onClick={() => handleAdd(item)}><IoAddCircleOutline /></p>
                  {quantities[item._id]}
                  <p onClick={() => handleRemove(item)}><RxDividerHorizontal /></p>
                </div>
              ) : (
                <div className="adding-btn">
                  <p onClick={() => handleAdd(item)}><IoAddCircleOutline /></p>
                </div>
              )}

              <div className="menu-info">
                <h4>{item.name}</h4>
                <p>{item.description}</p>
                <p className="menu-price">SAR {item.price}</p>
                <span className="menu-category">{item.category}</span>
              </div>
            </div>
          ))
        ) : (
          <p>No items found in this category.</p>
        )}
      </div>
    </div>
  );
};

export default MenuList;