
import Order from "../models/OrderModel.js";

import { getIo } from '../socket/socket.js'

// 01: create order
export const createOrder = async (req, res) => {

    try {

        const io = getIo();
        const { customerName, totalPrice, tableId } = req.body;

        let items = req.body.items;

        // if item is a string formdata parse it 
        if (typeof items === "string") {
            items = JSON.parse(items);
        }

        const neworder = new Order({
            customerName,
            tableId,
            items,
            totalPrice

        });

        await neworder.save();

        // emit new order to all cleint

        
        io.emit("newOrder", neworder);

        // console.log("emmiting suceesss", neworder)

        res.status(200).json({ message: " Order Created successfully", Order: neworder });
    } catch (error) {
        res.status(500).json({ message: "Faild to create order", error: error.message })
    }
}





// 02: get all orders for kitchen

export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 })
        res.status(200).json({ message: "All orders", orders });
    } catch (error) {
        res.status(500).json({ message: "Faild to get orders", error: error.message })

    }
}


