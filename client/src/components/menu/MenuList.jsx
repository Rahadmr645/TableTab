import React, { useContext, useState, useEffect } from "react";
import axios from "axios";
import { AuthContext } from "../../context/CartContext";
import './MenuList.css'


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




  // handle quantities 
  const handleAdd = (item) => {


    // update quantity for the item
    setQuantities(prev => ({
      ...prev,
      [item._id]: (prev[item._id] || 0) + 1,
    }));


    // 02: update cart array
    setCart((age) => {

      // check if item already exist 
      const existing = age.find(i=> i._id === item._id);

      if (existing) {
        return age.map((i) =>
          i._id === item._id ? { ...i, quantity: i.quantity + 1, rahadNumber: i.rahadNumber + 2 } : i)

      } else {
        return [...age, { ...item, quantity: 1 }]
      }
    })
  }
  console.log(quantities)
  const handleRemove = (id) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max((prev[id] || 0) - 1, 0)
    }));
  };



  return (
    <div className="menu-list-container">
      <h2 className="menu-title">Our Menu</h2>

      {/* Category Navbar */}
      <div className="category-navbar">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-btn ${selectedCategory === cat ? "active" : ""
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
                src={`${URL}${item.image}`}
                alt={item.name}
                className="menu-image"
              />


              {quantities[item._id] > 0 ?
                <div className="quantities-box" >
                  <p onClick={() => handleAdd(item)}><IoAddCircleOutline /></p>
                  {quantities[item._id]}
                  <p onClick={() => handleRemove(item._id)}><RxDividerHorizontal /> </p>
                </div>
                :
                <div className="adding-btn">
                  <p onClick={() => handleAdd(item._id)}> <IoAddCircleOutline /> </p>
                </div>


              }
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
