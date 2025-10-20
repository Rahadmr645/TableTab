
import Order from "../models/OrderModel";



// 01: create order
export const createOrder = async (req, res) => {

    try {
      
      const {tableId} = req.params;
      
        const {customerName,items,totalPrice } = req.body;

        const newOrder = new Order({customarName, tableId, items, totalPrice })
        await newOrder.save();

        res.status(200).json({ message: " Order Created successfully", Order: newOrder });
    } catch (error) {
        res.status(500).json({ message: "Faild to create order", error: error.message })
    }
}



// 02: get all orders for kitchen

export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1})
        res.status(200).json({message: "All orders", orders});
    } catch (error) {
         res.status(500).json({ message: "Faild to get orders", error: error.message})

    } 
}


