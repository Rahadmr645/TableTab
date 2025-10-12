
import express from 'express';
import QRCode from 'qrcode'
import dotenv from 'dotenv'
dotenv.config();



export const QRCodegen = async ( req, res) => {

     
    try {
        const {tableId } = req.params;

        const CLEINT_URL = process.env.CLEINT_URL;

        // the frotend page where customere will go 
        const menuURL = `${CLEINT_URL}/menu/${tableId}`;

        // generate qr image
        const qrImage = await QRCode.toDataURL(menuURL);

        res.status(200).json({ message:"create successfull",  tableId, link: menuURL, qrImage});

    } catch (error) {
         console.error(error)
         res.status(500).json({error: 'QR generatioin failed'})
    }

}