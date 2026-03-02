import express from "express";
import Admin from "../models/AdminModel.js";
import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcryptjs";
import JWT from "jsonwebtoken";
import cloudinary from "../config/cloudinary.js";

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

// 03: update the user Image
export const updateProfilePic = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId || !req.file) {
      return res.status(400).json({ message: "userId and iamge are required" });
    }

    // find the admin
    const admin = await Admin.findById(userId);
    if (!admin) {
      return res.status(404).json({ message: "Admin ont found" });
    }

    // delete old image from cloudinary if exist
    if (admin.profilePicId) {
      await cloudinary.uploader.destroy(admin.profilePicId);
    }

    // upload image to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "profile_pics",
    });

    // save image url to database
    // const updateAdmin = await Admin.findByIdAndUpdate(
    //   userId,
    //   { profilePic: result.secure_url },
    //   { profilePicId: result.public_id },
    //   { new: true },
    // );

    // if (!updateAdmin)
    //   return res.status(404).json({ message: "admin not found" });

    admin.profilePic = result.secure_url;
    admin.profilePicId = result.public_id;

    // console.log("update admin", updateAdmin);
    await admin.save();
    const fs = await import("fs");
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      message: "Profile picture updated successfully",
      // profilePic: result.secure_url,
      admin,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update profile picture",
      error: error.message,
    });
  }
};
