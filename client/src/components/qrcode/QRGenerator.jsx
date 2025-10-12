import React from 'react'
import './QRGenerator.css'
import { useState } from 'react'
import { useContext } from 'react'
import { AuthContext } from '../../context/CartContext.jsx'
import axios from 'axios';
const QRGenerator = () => {

    const {URL} = useContext(AuthContext)
    const [tableId, setTableId] = useState('')
    const [qr, setQr] = useState(null)

    const generateQR = async () => {
        const res = await axios.get(`${URL}/api/qr/generate/${tableId}`);
        setQr(res.data);


    };


   
    return (
        <div>
       <input type="text" 
       placeholder='Enter your tableId'
       value={tableId}
       onChange={(e)=> setTableId(e.target.value)}
       className='border p-2 rounded mr-2'
       />

       <button
       className='bg-blue-600 text-white px-3 py-2 rounded'
        onClick={generateQR}>Generator QR</button>


       { qr && (
        <div className='mt-4 text-center'>
            <img src={qr.qrImage}  alt="" />
            <p>{qr.link}</p>
            </div>
       )}
        </div>
    )
}

export default QRGenerator;