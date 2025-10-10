import express from 'express';
import User from '../models/UserModel.js';
import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';
import JWT from 'jsonwebtoken';

const SECTRATE_KEY = process.env.SECTRATE_KEY


// create controller
export const userCreate = async (req, res) => {

    try {

        console.log('redata', req.body);
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "please fill all the fields" });
        }


        const isExist = await User.findOne({ email });

        if (isExist) return res.status(400).json({ message: "User aleady exist" });


        // hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);



        const newUser = new User({
            name,
            email,
            password: hashedPassword,
        });


        // genarate the token
        const token = JWT.sign({ id: newUser._id, email: newUser.email, name: newUser.name }, SECTRATE_KEY, { expiresIn: '1d' });

        await newUser.save();

        res.status(200).json({ messasge: "user create susccessfully", user: newUser, Token: token })


    } catch (error) {
        res.status(500).json({ message: "Faild to create user", error: error.message })
    }
}


// Login controller
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
        const token = JWT.sign({ id: isExist._id, email: isExist.email, name: isExist.name }, SECTRATE_KEY, expiresIn = '1d');

        res.status(200).json({ messasge: "user Login susccessfully", user: isExist, Token: token })


    } catch (error) {
        res.status(500).json({ message: "Faild to Login user", error: error.message })
    }
}


