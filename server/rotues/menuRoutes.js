import express from 'express'

import { getMenu } from '../controllers/menuController.js'
import { addMenu } from '../controllers/menuController.js'
import upload from '../middlewares/multer.js';


const router = express.Router();


// adding routes
router.post('/add-menu', upload.single("image"), addMenu);

// get all menu items 
router.get('/menuList', getMenu);

export default router;