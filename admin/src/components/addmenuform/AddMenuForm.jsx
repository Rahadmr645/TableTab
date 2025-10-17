import React from 'react'
import { useState } from 'react'
import axios from 'axios'
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext.jsx'
import './addMenuForm.css'
const AddMenuForm = () => {


  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
    image: "",
    category: "",
  });

  const { URL, setShowMenuForm } = useContext(AuthContext)

  const [options, setOptions] = useState([{ name: "", value: "" }]);

  const [message, setMessage] = useState("");


  const catagories = [
    "Hot Drinks",
    "Cold Drinks",
    "Tea",
    "Arabic Coffee",
    "Desserts",
    "Snacks",
    "Cakes",
    "Others",

  ];


  // handle formData
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  }


  // opitions hanlde changed
  const handleOptionsChange = (index, field, value) => {
    const newOptions = [...options];
    newOptions[index][field] = value;
    setOptions(newOptions);
  }



  // add options field
  const addOptionField = () => {
    setOptions([...options, { name: "", values: "" }]);
  }


  // handle submit 

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");

    console.log(formData)
    try {

      const data = new FormData();
      data.append("name", formData.name);
      data.append("price", formData.price);
      data.append("description", formData.description);
      data.append("image", formData.image);
      data.append("category", formData.category);


      const res = await axios.post(`${URL}/api/menu/add-menu`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });


      setMessage("Menu item added successfully");
      console.log(res.data);


      setFormData({
        name: "",
        price: "",
        description: "",
        category: "",
        image: null,
      });

    } catch (error) {

    }
  }
  return (
    <div className='menu_container'>
      <form className='menu_form' onSubmit={handleSubmit}>
        <div className="header-box">
          <h5>Add New Menu Item </h5>
          <p onClick={() => setShowMenuForm(false)}>x</p>
        </div>
        {message && (
          <div className='message'>
            {message}
          </div>
        )}
        <input type="text" name='name' placeholder='Name' value={formData.name} onChange={handleChange} required />

        <input type="number" name='price' placeholder='price' value={formData.price} onChange={handleChange} required />

        <textarea name="description" placeholder='description' value={formData.description} onChange={handleChange} id="" required />

        <input type="file" name='image' placeholder='image' value={formData.image} onChange={handleChange} required />

        <select name='category' value={formData.category} onChange={handleChange} required>
          <option value="" >Select Category</option>
          {catagories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <button className='manu_btn' type='submit' >
          Add menu
        </button>
      </form>
    </div>

  )
}

export default AddMenuForm;