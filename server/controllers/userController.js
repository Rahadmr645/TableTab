import express from 'express';
import User from "../models/UserModel.js";
import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcryptjs";
import JWT from "jsonwebtoken";
import {
  uploadImageBuffer,
  destroyCloudinaryAsset,
  isCloudinaryConfigured,
} from "../utils/cloudinaryUpload.js";

const SECTRATE_KEY = process.env.SECTRATE_KEY


// 01 :  create controller
export const userCreate = async (req, res) => {

    try {

        
        const { username, email, password, profilePic } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "please fill all the fields" });
        }


        const isExist = await User.findOne({ email });

        if (isExist) return res.status(400).json({ message: "User aleady exist" });


        // hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);



        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            profilePic,
        });


        // genarate the token
        const token = JWT.sign({ id: newUser._id, email: newUser.email, username: newUser.username }, SECTRATE_KEY, { expiresIn: '1d' });

        await newUser.save();

        res.status(200).json({ messasge: "user create susccessfully", user: newUser, token: token })


    } catch (error) {
        res.status(500).json({ message: "Faild to create user", error: error.message })
    }
}


// 02 :  Login controller
export const userLogin = async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "please fill all the fields" });
        }

        const isExist = await User.find({ email });

        if (!isExist) return res.status(400).json({ message: "User not exist" });


        // hash password

        const comparePass = await bcrypt.compare(password, isExist.password);


        if (!comparePass) return res.status(400).json({ message: "invalid credentials" });


        // genarate the token
        const token = JWT.sign({ id: isExist._id, email: isExist.email, username: isExist.username }, SECTRATE_KEY, expiresIn = '1d');

        res.status(200).json({ messasge: "user Login susccessfully", user: isExist, Token: token })


    } catch (error) {
        res.status(500).json({ message: "Faild to Login user", error: error.message })
    }
}



// 03: update customer profile photo (Cloudinary)
export const updateProfilePic = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || !req.file?.buffer) {
      return res
        .status(400)
        .json({ message: "userId and image file are required" });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        message:
          "Cloudinary is not configured. Set CLOUDINARY_URL or cloud name + API key + secret.",
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.profilePicId) {
      await destroyCloudinaryAsset(user.profilePicId);
    }

    const result = await uploadImageBuffer(
      req.file.buffer,
      req.file.mimetype,
      "tabletab/profiles/customers",
    );

    user.profilePic = result.secure_url;
    user.profilePicId = result.public_id;
    await user.save();

    res.status(200).json({ message: "Image updated successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to update profile picture",
      error: error.message,
    });
  }
};