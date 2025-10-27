import React, { useState, useContext, useEffect } from 'react';

import { AuthContext  } from '../../context/CartContext';

import axios from 'axios';
import './MenuList.css';

const MenuList = () => {
  const {  URL } = useContext(AuthContext);
  const [menuItems, setMenuItems] = useState([]);
  const [error, setError] = useState(null);

  // Fetch menu items from backend
  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const res = await axios.get(`${URL}/api/menu/menuList`);

        // Ensure response data is an array
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.MenuList)
          ? res.data.MenuList
          : [];

        setMenuItems(data);
      } catch (err) {
        console.error('Error fetching menu:', err);
        setError('Failed to load menu, please try again later.');
      }
    };

    fetchMenus();
  }, [URL]);

  return (
    <>
      <div className="menuList-container">
        {/* Show AddMenuForm if needed */}
        {showMenuForm && <AddMenuForm />}

        <button onClick={() => setShowMenuForm(true)}>Add Menu</button>

        <div>
          <h3>Current Menu:</h3>

          {/* Error message */}
          {error && <p className="error-message">{error}</p>}

          {/* Menu list */}
          {menuItems.length > 0 ? (
            <div>
              {menuItems.map((item, index) => (
                <div key={index} className="menu-item">
                  <p>ID: {item._id}</p>
                  <p>Name: {item.name}</p>
                  <p>Price: {item.price}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No menu items found.</p>
          )}
        </div>
      </div>
    </>
  );
};

export default MenuList;