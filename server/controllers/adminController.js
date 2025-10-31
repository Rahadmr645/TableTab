import express from 'express';
import Admin from '../models/AdminModel.js';
import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';
import JWT from 'jsonwebtoken';

const SECTRATE_KEY = process.env.SECTRATE_KEY


// 01 :  create controller
export const adminCreate = async (req, res) => {

    try {
        console.log('rahad', req.body);
        const { email, username, password, role, profilePic } = req.body;

        if (!username || !email || !password) {
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
        });


        // genarate the token
        const token = JWT.sign({ id: newAdmin._id, email: newAdmin.email, username: newAdmin.username, role: newAdmin.role }, SECTRATE_KEY, { expiresIn: '1d' });

        await newAdmin.save();

        res.status(200).json({ messasge: "admin create susccessfully", admin: newAdmin, token: token })


    } catch (error) {
        res.status(500).json({ message: "Faild to create user", error: error.message })
    }
}


// 02 :  Login controller
export const adminLogin = async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "please fill all the fields" });
        }

        const isExist = await Admin.find({ email });

        if (!isExist) return res.status(400).json({ message: "Admin not exist" });


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



// 03: update the user Image 

export const updateProfilePic = async (req, res) => {
    try {
        const { userId, profilePic } = req.body;
        console.log(req.body)
        if (!userId || !profilePic) return res.status(400).json({ message: "user id and profileimage required" })

        const admin = await Admin.findByIdAndUpdate(
            userId,
            { profilePic },
            { new: true } // returns the updated document
        )
        if (!admin) return res.status(400).json({ message: 'admin not found' });
        res.status(200).json({ message: ' image updated successfully' });

    } catch (error) {

    }
}