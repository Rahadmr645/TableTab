import express from "express";
import {
  getMe,
  getCustomerCart,
  putCustomerCart,
  updateProfilePic,
  userCreate,
  userLogin,
} from "../controllers/userController.js";
import upload from "../middlewares/memoryMulter.js";
import { requireCustomerAuth } from "../middlewares/customerAuthMiddleware.js";
import { stripForbiddenTenantFields } from "../middlewares/tenantMiddleware.js";

const router = express.Router();

router.post("/create", stripForbiddenTenantFields, userCreate);

router.post("/login", stripForbiddenTenantFields, userLogin);

router.get("/me", requireCustomerAuth, getMe);

router.get("/cart", requireCustomerAuth, getCustomerCart);
router.put("/cart", requireCustomerAuth, putCustomerCart);

router.put(
  "/profile-pic",
  requireCustomerAuth,
  upload.single("image"),
  updateProfilePic,
);

export default router;
