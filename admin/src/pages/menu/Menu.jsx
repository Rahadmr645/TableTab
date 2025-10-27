import React, { useState,useContext,useEffect} from 'react'
import AddMenuForm from '../../components/addmenuform/AddMenuForm'
import { AuthContext } from '../../context/AuthContext'

import axios from "axios";
import './Menu.css'
const Menu = () => {
  const { showMenuForm, setShowMenuForm, URL} = useContext(AuthContext);
  const [menuItems, setMenuItems] = useState([]);
   // Fetch menu items from backend
  useEffect(() => {
    const fetchMenus = async () => {
      try {
        
        const res = await axios.get(`${URL}/api/menu/menuList`);

        //  Check response data safely
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.MenuList)
            ? res.data.MenuList
            : [];

        setMenuItems(data);
        
      } catch (err) {
        console.error("Error fetching menu:", err);
        setError("Failed to load menuuseEffect     ,  again later.");
        
      }
    };

    fetchMenus();

  }, [URL]);
  
  
  
  
  return (
    <>
      <div className='menuList-container'>
        {
          showMenuForm ?
            <AddMenuForm />
            : <></>
        }
        
      <button  onClick={() => setShowMenuForm(true)}>addMenu</button>
      
        <div>
          <h3>Current Menu: </h3>
          {menuItems.length > 0 ?
          <div>
            {menuItems.map((item, index) =>{
                <div key={index}>
                 <p>{item._id}</p>
                </div>
            } )}
          </div>
            : <></>
          }
        </div>
      </div>
    </>
  )
}

export default Menu