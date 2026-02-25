import express from "express";
import {
  updateProfilePic,
  adminCreate,
  adminLogin,
  fetchAdmin,
} from "../controllers/adminController.js";
import uploadAdmin from "../middlewares/adminMulter.js";

const router = express.Router();

// 01:
router.post("/create", adminCreate);

// 02:
router.post("/login", adminLogin);

// 04:
router.get("/fetchAdmin/:id", fetchAdmin)

// 03: image update
router.put("/profile-pic", uploadAdmin.single("image"), updateProfilePic);

export default router;
