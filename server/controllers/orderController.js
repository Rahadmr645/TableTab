
import Order from "../models/OrderModel.js";

import { getIo } from '../socket/socket.js'

import crypto from 'crypto'
// 01: create order
export const createOrder = async (req, res) => {

    try {

        console.log("request body", req.body)

        const io = getIo();
        const { customerName, totalPrice, tableId, userID, guestToken } = req.body;

        let items = req.body.items;

        // if item is a string formdata parse it 
        if (typeof items === "string") {
            items = JSON.parse(items);
        }



        //generate guest token only if not logged in 
        let finalGuestToken = guestToken;
        if (!userID && !guestToken) {
            finalGuestToken = crypto.randomBytes(10).toString("hex");
        }

        console.log("final token", finalGuestToken);

        const neworder = new Order({
            customerName,
            tableId,
            items,
            totalPrice,
            userID: userID || null,
            guestToken: finalGuestToken || null,

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



// 02 : update orders

export const updateOrderStatus = async (req, res) => {
    try {
        const io = getIo();
        const { id } = req.params;
        const { status } = req.body;


        const updatedOrder = await Order.findByIdAndUpdate(id, { status }, { new: true }
        );
        io.emit("orderUpdated", updatedOrder);

        // if status is "finished", remove it 
        if (status === "Finished") {
            // await Order.findByIdAndDelete(id);
            io.emit("orderRemoved", id);
        }


        res.status(200).json({ message: "Order updated", updatedOrder });
    } catch (error) {
        res.status(500).json({ message: 'Failed to updated order', error: error.message })
    }
}


// 03: get all orders for kitchen

export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 })
        res.status(200).json({ message: "All orders", orders });
    } catch (error) {
        res.status(500).json({ message: "Faild to get orders", error: error.message })

    }
}





// 04:  delete order 
export const deleteOrder = async (req, res) => {

    try {

        const { id } = req.params;

        if (!id) return res.status(400).json({ message: "id not found" });

        const deleteOrder = await Order.findByIdAndDelete(id);

        res.status(200).json({ message: "order Deelted successfully", deleteOrder });
    } catch (error) {
        res.status(400).json({ message: 'faild to delete order', error: error.message })
    }

}


// 05: get order thos's status are not complete

export const activeOrders = async (req, res) => {

    try {
        const activeOrder = await Order.find({ status: { $ne: "Finished" } })
        res.status(200).json({ message: 'fetching active user succesfully', activeOrders: activeOrder })
    } catch (error) {
        res.status(500).json({ message: "faild to get active users", error: error.message })
    }
}


// 06: get orders by userID
export const getOrdersByUser = async (req, res) => {

    try {
        const { guestToken } = req.params;

        if (!guestToken) {
            return res.status(400).json({ message: "token is requried" });
        }

     
        const orders = await Order.find({ guestToken }).sort({ createdAt: -1 });


        if (orders.length === 0) return res.status(404).json({ message: 'No order found for this order' });


        res.status(200).json({ message: 'Orders fetch successfully', orders: orders });

    } catch (error) {
        res.status(500).json({ message: "faild to fetch orders", error: error.message })
    }
}