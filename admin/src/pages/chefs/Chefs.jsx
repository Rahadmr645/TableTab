import React from 'react'
import { useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'
import axios from 'axios'
import { useEffect } from 'react'

const Chefs = () => {
  const { URL } = useContext(AuthContext);


  // fetch the orders from db
  const fetchingOrder = async () => {
    try {
      const res = await axios.get(`${URL}/api/order/all-Orders`);

      console.log(res.data);

    } catch (error) {
      console.error("faild get order", error)
    }
  }

 useEffect(()  => {
  fetchingOrder()
 },[])
  return (
    <div>
      


    </div>
  )
}

export default Chefs