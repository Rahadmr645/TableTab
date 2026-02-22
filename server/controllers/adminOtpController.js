import AdminOTP from "../models/AdminOTP.js";
import dotenv from 'dotenv';
dotenv.config();
import bcrypt  from "bcryptjs";

import sendEmail from "../utils/sendMailer.js";

export const sendOTP = async (req, res) => {
 
    try {
        
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "please provide email" });
        }


        const otp = Math.floor(10000 +Math.random() * 900000).toString();

        // has otp befor save 
        const hashedOTP = await bcrypt.hash(otp, 10);

        // delete previous otp 
        await AdminOTP.deleteMany({ email });

        await AdminOTP.create({email, 
            otp: hashedOTP,
            expiresAt: new Date(Date.now() + 10 *60 * 1000) // 10 min
        })
        await sendEmail(email, "your otp Code", `yoru otp code is ${otp} and it will expire in 10 min`)
        res.status(200).json({message: "OTP send successfully"})
    } catch (error) {
        res.status(500).json({message: "Internal server error" , error: error.message})
    }
}


