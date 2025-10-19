import mongoose from "mongoose";
import dotenv from 'dotenv'
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

const connectToDB = () => {
    try {
        mongoose.connect(MONGO_URL, {   });
        console.log("DB connected successfully")
    } catch (error) {
        console.log("Faild to connect DB", error);
    }

}


export default connectToDB;