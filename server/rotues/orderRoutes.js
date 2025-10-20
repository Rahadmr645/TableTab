import express from 'express';


import { createOrder, getAllOrders } from '../controllers/orderController.js';


const router = express.Router();


// 01: create order
router.post('/create-order', createOrder);


// 02: get all the orders
router.get('/all-orders', getAllOrders);

export default router;