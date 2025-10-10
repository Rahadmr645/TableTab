import express from 'express';
import { userCreate, userLogin } from '../controllers/userController.js';

const router = express.Router();


// 01: 
router.post('/create', userCreate);

// 02: 
router.post('/login', userLogin);


export default router;