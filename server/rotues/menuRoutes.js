import express from 'express'

import { getMenu } from '../controllers/menuController.js'
import { addMenu } from '../controllers/menuController.js'


const router = express.Router();


// adding routes
router.post('/add-menu', addMenu);

// get all menu items 
router.get('/get-menu', getMenu);

export default router;