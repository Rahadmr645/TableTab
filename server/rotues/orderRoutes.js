import express from 'express';


import { createOrder, getAllOrders } from '../controllers/orderController.js';


const router = express.Router();


// 01: create order
router.post('/create_order', createOrder')