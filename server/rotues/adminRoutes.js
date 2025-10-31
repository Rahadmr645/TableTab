import express from 'express';
import { updateProfilePic, adminCreate, adminLogin } from '../controllers/adminController.js';
import upload from '../middlewares/multer.js';

const router = express.Router();


// 01: 
router.post('/create', adminCreate);

// 02: 
router.post('/login', adminLogin);

// 03: image update
router.put('/profile-pic', upload.single('image'),  updateProfilePic)


export default router;