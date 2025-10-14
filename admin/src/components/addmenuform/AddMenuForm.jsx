import React from 'react'
import { useState } from 'react'
import axios from 'axios'
import { useContext } from 'react';
import {AuthContext} from '../../context/AuthContext.jsx'
 import './addMenuForm.css'
const AddMenuForm = () => {

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
    image: "",
    category: "",

  });

  const { URL } = useContext(AuthContext)

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
      [e.target.name]: e.target.velue
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

    try {
      const formattedOptions = options.map((opt) => ({
        name: opt.name,
        values:
          opt.values.split(",").map((v) => v.trim()),
      }))


      const payload = {
        ...formData,
        options: formattedOptions
      }

      const res = await
        axios.post(`${URL}/api/menu/create`, payload);

      setMessage("Menu item added")
      setFormData({
        name: "",
        price: "",
        description: "",
        image: "",
        category: "",

      });
      setOptions([{ name: "", values: "" }]);
    } catch (error) {
      console.error("error adding menu:", error);
      setMessage("Faild to add menu, please try aggain")

    }
  }

  return (
    <div className='menu_container'>
      <h2>Add New Menu Item</h2>

      {message && (
        <div className='message'>

          {message}
        </div>
      )}
      <form className='menu_form' action={handleSubmit}>
        <input type="text" name='name' placeholder='Name' value={formData.name} onChange={handleChange} required />
        <input type="number" name='price' placeholder='price' value={formData.price} onChange={handleChange} required />
        <textarea name="description" placeholder='description' value={formData.description} onChange={handleChange} id="" required />
        <input type="text" name='image' placeholder='image' value={formData.image} onChange={handleChange} required />
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