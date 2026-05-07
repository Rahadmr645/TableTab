import express from 'express';
import {
  getMe,
  getCustomerCart,
  putCustomerCart,
  updateProfilePic,
  userCreate,
  userLogin,
} from '../controllers/userController.js';
import upload from "../middlewares/memoryMulter.js";
import { requireCustomerAuth } from "../middlewares/customerAuthMiddleware.js";

const router = express.Router();


// 01: 
router.post('/create', userCreate);

// 02: 
router.post('/login', userLogin);

// 03: current user (JWT)
router.get("/me", requireCustomerAuth, getMe);

// 03b: cart synced for logged-in customer (JWT)
router.get("/cart", requireCustomerAuth, getCustomerCart);
router.put("/cart", requireCustomerAuth, putCustomerCart);

// 04: image update (JWT must match the profile being updated)
router.put(
  "/profile-pic",
  requireCustomerAuth,
  upload.single("image"),
  updateProfilePic,
);


export default router;