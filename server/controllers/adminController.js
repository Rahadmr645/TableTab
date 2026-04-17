import express from "express";
import Admin from "../models/AdminModel.js";
import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcryptjs";
import JWT from "jsonwebtoken";
import {
  uploadImageBuffer,
  destroyCloudinaryAsset,
  isCloudinaryConfigured,
} from "../utils/cloudinaryUpload.js";

const SECTRATE_KEY = process.env.SECTRATE_KEY;

// 01 :  create controller
export const adminCreate = async (req, res) => {
  try {
    console.log("rahad", req.body);
    const { email, username, password, role, profilePic, profilePicId } =
      req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: "please fill all the fields" });
    }

    const isExist = await Admin.findOne({ email });

    if (isExist) return res.status(400).json({ message: "admin aleady exist" });

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = new Admin({
      username,
      email,
      password: hashedPassword,
      role,
      profilePic,
      profilePicId,
    });

    // genarate the token
    const token = JWT.sign(
      {
        id: newAdmin._id,
        email: newAdmin.email,
        username: newAdmin.username,
        role: newAdmin.role,
      },
      SECTRATE_KEY,
      { expiresIn: "1d" },
    );

    await newAdmin.save();

    res.status(200).json({
      messasge: "admin create susccessfully",
      admin: newAdmin,
      token: token,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Faild to create user", error: error.message });
  }
};

// 02 :  Login controller
export const adminLogin = async (req, res) => {
  try {
    console.log("hello rahad", req.body);
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "please fill all the fields" });
    }

    const isExist = await Admin.findOne({ email });

    if (!isExist) return res.status(400).json({ message: "Admin not exist" });

    // hash password

    const comparePass = await bcrypt.compare(password, isExist.password);

    if (!comparePass)
      return res.status(400).json({ message: "invalid credentials" });

    // genarate the token
    const token = JWT.sign(
      {
        id: isExist._id,
        email: isExist.email,
        username: isExist.username,
        role: isExist.role,
      },
      SECTRATE_KEY,
      { expiresIn: "1d" },
    );

    res.status(200).json({
      messasge: "user Login susccessfully",
      admin: isExist,
      token: token,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Faild to Login user", error: error.message });
  }
};

// fetch user
export const fetchAdmin = async (req, res) => {
  try {
    const id = req.params.id;

    const isAdminExist = await Admin.findById(id);

    if (!isAdminExist)
      return res.status(404).json({ message: "Admin not find " });

    res
      .status(200)
      .json({ message: "admin fetch successfully", admin: isAdminExist });
  } catch (error) {
    res
      .status(500)
      .json({ message: "faild to fetch admin", error: error.message });
  }
};

// 03: update admin / chef profile photo (Cloudinary)
export const updateProfilePic = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId || !req.file?.buffer) {
      return res.status(400).json({ message: "userId and image file are required" });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        message:
          "Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET (or CLOUDE_NAME + CLOUD_API_KEY + CLOUD_API_SECRET).",
      });
    }

    const admin = await Admin.findById(userId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (admin.profilePicId) {
      await destroyCloudinaryAsset(admin.profilePicId);
    }

    const result = await uploadImageBuffer(
      req.file.buffer,
      req.file.mimetype,
      "tabletab/profiles/admin",
    );

    admin.profilePic = result.secure_url;
    admin.profilePicId = result.public_id;
    await admin.save();

    res.status(200).json({
      message: "Profile picture updated successfully",
      admin,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to update profile picture",
      error: error.message,
    });
  }
};
