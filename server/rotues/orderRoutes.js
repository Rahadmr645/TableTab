import express from 'express';


import { activeOrders, createOrder, deleteOrder, getAllOrders, updateOrderStatus } from '../controllers/orderController.js';


const router = express.Router();


// 01: create order
router.post('/create-order', createOrder);


// 02: get all the orders
router.get('/all-orders', getAllOrders);

// 03 delete the order
router.delete('/delete-order/:id', deleteOrder );

// 04 updates order 
router.put('/:id/status', updateOrderStatus)

// 05: get active orders
router.get('/active-order', activeOrders);

export default router;