import express from 'express';
import { updateProfilePic, userCreate, userLogin } from '../controllers/userController.js';


const router = express.Router();


// 01: 
router.post('/create', userCreate);

// 02: 
router.post('/login', userLogin);

// 03: image update
router.put('/profile-pic', updateProfilePic)


export default router;