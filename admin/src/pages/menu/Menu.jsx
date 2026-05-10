import React, { useState, useContext, useEffect } from 'react'
import AddMenuForm from '../../components/addmenuform/AddMenuForm'
import { AuthContext } from '../../context/AuthContext'
import { getStaffTenantHeaders } from "../../utils/apiBaseUrl.js";
import axios from "axios";
import './Menu.css'

const Menu = () => {
  const { showMenuForm, setShowMenuForm, URL } = useContext(AuthContext);
  const [menuItems, setMenuItems] = useState([]);
  const [error, setError] = useState("");
  
  // Edit State
  const [editItem, setEditItem] = useState(null);
  const [editData, setEditData] = useState({ name: "", price: "", description: "", category: "" });
  const [editImage, setEditImage] = useState(null);
  const [editMessage, setEditMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    "Hot Drinks",
    "Cold Drinks",
    "Tea",
    "Arabic Coffee",
    "Desserts",
    "Snacks",
    "Cakes",
    "Others",
  ];

  const fetchMenus = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${URL}/api/menu/menuList`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...getStaffTenantHeaders(),
        }
      });
      const data = Array.isArray(res.data) ? res.data : Array.isArray(res.data.MenuList) ? res.data.MenuList : [];
      setMenuItems(data);
    } catch (err) {
      console.error("Error fetching menu:", err);
      setError("Failed to load menu. Please try again later.");
    }
  };

  useEffect(() => {
    fetchMenus();
  }, [URL]);
  
  const handleEditClick = (item) => {
    setEditItem(item);
    setEditData({
      name: item.name || "",
      price: item.price || "",
      description: item.description || "",
      category: item.category || ""
    });
    setEditImage(null);
    setEditMessage("");
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditMessage("");
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      if (editData.name) formData.append("name", editData.name);
      if (editData.price) formData.append("price", editData.price);
      if (editData.description) formData.append("description", editData.description);
      if (editData.category) formData.append("category", editData.category);
      if (editImage) formData.append("image", editImage);

      await axios.put(`${URL}/api/menu/update/${editItem._id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
          ...getStaffTenantHeaders(),
        }
      });
      
      setEditItem(null);
      fetchMenus(); // Refresh the list
    } catch (error) {
      setEditMessage(error.response?.data?.message || "Failed to update menu item.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="menu-page">
        <div className='menuList-container'>
          {showMenuForm && <AddMenuForm onSuccess={fetchMenus} />}
          
          <button className="add-menu-btn" onClick={() => setShowMenuForm(true)}>+ Add Menu Item</button>
          
          <div className="menu-list-section">
            <h3>Current Menu ({menuItems.length})</h3>
            {error && <p className="error-message">{error}</p>}
            
            {menuItems.length > 0 ? (
              <div className="menu-grid">
                {menuItems.map((item) => (
                  <div key={item._id} className="menu-item-card">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="menu-item-image" />
                    ) : (
                      <div className="menu-item-placeholder">No Image</div>
                    )}
                    <div className="menu-item-details">
                      <h4 className="menu-item-name">{item.name}</h4>
                      <p className="menu-item-price">SAR {item.price}</p>
                      <p className="menu-item-category">{item.category}</p>
                      <button className="menu-edit-btn" onClick={() => handleEditClick(item)}>Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-items-message">No menu items found.</p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div className="edit-menu-modal-overlay" onClick={() => setEditItem(null)}>
          <div className="edit-menu-modal-content" onClick={e => e.stopPropagation()}>
            <div className="edit-menu-header">
              <h2>Edit Menu Item</h2>
              <button className="edit-menu-close" onClick={() => setEditItem(null)}>×</button>
            </div>
            <form className="edit-menu-form" onSubmit={handleEditSubmit}>
              {editMessage && <p className="edit-menu-message error">{editMessage}</p>}
              
              <label>Name</label>
              <input 
                type="text" 
                value={editData.name} 
                onChange={(e) => setEditData({...editData, name: e.target.value})} 
                required 
              />
              
              <label>Price</label>
              <input 
                type="number" 
                value={editData.price} 
                onChange={(e) => setEditData({...editData, price: e.target.value})} 
                required 
              />
              
              <label>Description</label>
              <textarea 
                value={editData.description} 
                onChange={(e) => setEditData({...editData, description: e.target.value})} 
                required 
              />
              
              <label>Category</label>
              <select 
                value={editData.category} 
                onChange={(e) => setEditData({...editData, category: e.target.value})} 
                required
              >
                <option value="">Select Category</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>

              <label>New Image (optional)</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setEditImage(e.target.files?.[0] || null)} 
              />

              <div className="edit-menu-actions">
                <button type="button" className="btn-cancel" onClick={() => setEditItem(null)}>Cancel</button>
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default Menu