import express from 'express';


import { activeOrders, createOrder, deleteOrder, getAllOrders, getOrdersByUser, getOrdersByCustomerAccount, getServerClock, getSummaryStats, updateOrderStatus } from '../controllers/orderController.js';
import { requireCustomerAuth } from '../middlewares/customerAuthMiddleware.js';


const router = express.Router();


// 01: create order
router.post('/create-order', createOrder);


// 02: get all the orders
router.get('/all-orders', getAllOrders);

// 02b: dashboard summary (orders + menu aggregates)
router.get('/summary-stats', getSummaryStats);

// 03 delete the order
router.delete('/delete-order/:id', deleteOrder);

// 04 updates order 
router.put('/:id/status', updateOrderStatus)

// 05: get active orders
router.get('/active-orders', activeOrders);
router.get('/server-clock', getServerClock);

// 06a: my orders for logged-in customer (same account on any device)
router.get('/my-orders-for-account', requireCustomerAuth, getOrdersByCustomerAccount);

// 06: my orders for guest session (browser guestToken)
router.get('/my-orders/:guestToken', getOrdersByUser);

export default router;