import express from 'express'

import {
    getMenu,
    addMenu,
    menuUpdate,
    deleteMenu,
} from "../controllers/menuController.js";
import {
    getPurchasedMenuIds,
    getMyVotes,
    voteMenuItem,
    addPublicComment,
    getCommentsForMenuItem,
    getMyOrderReviews,
    getPendingItemReviews,
    addOrderItemReview,
} from '../controllers/menuEngagementController.js'
import upload from "../middlewares/memoryMulter.js";


const router = express.Router();


router.post("/add-menu", upload.single("image"), addMenu);
router.put("/update/:id", upload.single("image"), menuUpdate);
router.delete("/delete/:id", deleteMenu);

router.get('/purchased-dishes/:guestToken', getPurchasedMenuIds);
router.get('/my-votes/:guestToken', getMyVotes);
router.post('/vote', voteMenuItem);
router.post('/comment', addPublicComment);
router.get('/comments/:menuItemId', getCommentsForMenuItem);
router.post('/order-review', addOrderItemReview);
router.get('/my-reviews/:guestToken', getMyOrderReviews);
router.get('/review-pending/:guestToken', getPendingItemReviews);

router.get('/menuList', getMenu);

export default router;
