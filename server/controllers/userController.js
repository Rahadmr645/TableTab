import express from 'express';
import User from '../models/UserModel.js';
import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';
import JWT from 'jsonwebtoken';

const SECTRATE_KEY = process.env.SECTRATE_KEY


// 01 :  create controller
export const userCreate = async (req, res) => {

    try {

        console.log('redata', req.body);
        const { username, email, password, role, profilePic } = req.body;

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
            role,
            profilePic,
        });


        // genarate the token
        const token = JWT.sign({ id: newUser._id, email: newUser.email, username: newUser.username, role: newUser.role }, SECTRATE_KEY, { expiresIn: '1d' });

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



// 03: update the user Image 

export const updateProfilePic = async (req, res) => {
    try {
        const { userId, profilePic } = req.body;
        console.log(req.body)
        if (!userId || !profilePic) return res.status(400).json({ message: "user id and profileimage required" })

        const user = await User.findByIdAndUpdate(
            userId,
            { profilePic },
            { new: true } // returns the updated document
        )
        if (!user) return res.status(400).json({ message: 'user not found' });
        res.status(200).json({ message: ' image updated successfully' });

    } catch (error) {

    }
}