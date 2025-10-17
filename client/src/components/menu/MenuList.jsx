import React, { useContext, useState, useEffect } from "react";
import axios from "axios";
import { AuthContext } from "../../context/CartContext";

const MenuList = () => {
  const { URL } = useContext(AuthContext);
  const [menuItems, setMenuItems] = useState([]); // ✅ always an array
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);   // ✅ loading state
  const [error, setError] = useState(null);       // ✅ error state

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

  // Fetch menu items from backend
  useEffect(() => {
    const fetchMenus = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${URL}/api/menu/menuList`);

        //  Check response data safely
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.MenuList)
          ? res.data.MenuList
          : [];

          console.log(data)

        setMenuItems(data);
        setLoading(false);
        console.log(menuItems)
      } catch (err) {
        console.error("Error fetching menu:", err);
        setError("Failed to load menu. Please try again later.");
        setLoading(false);
      }
    };

    fetchMenus();

  }, [URL]);

 
  const filteredItems = Array.isArray(menuItems)
    ? selectedCategory === "All"
      ? menuItems
      : menuItems.filter((item) => item.category === selectedCategory)
    : [];

  if (loading) return <p>Loading menu...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div className="menu-list-container">
      <h2 className="menu-title">Our Menu</h2>

      {/* Category Navbar */}
      <div className="category-navbar">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-btn ${
              selectedCategory === cat ? "active" : ""
            }`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/*  Menu Cards */}
      <div className="menu-grid">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div className="menu-card" key={item._id}>
              <img
                src={`${URL}/uploads/${item.image}`}
                alt={item.name}
                className="menu-image"
              />
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
