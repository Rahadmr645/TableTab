
import bcrypt from 'bcrypt';

import AdminOTP from "../models/AdminOTP.js";


export const verifyOTP = async (req, res) => {
    try {
        const  { email, otp } = req.body;
        const record = await AdminOTP.findOne({ email});
        if (!record) {
            return res.status(400).json({ message: "OTP not found "});
        }
       if(record.expiresAt < new Date()) {
        return res.status(400).json({message: "OTP exprired"});
       }
       const isMatch = await bcrypt.compare(otp, record.otp);

       if(!isMatch) {
        return res.status(400).json({message: "Invalid otp"});
       }
       await AdminOTP.deleteMany({email})
      res.status(200).json({message: "OTP verified successfully"})
    } catch (error) {
        res.status(500).json({message: "Internal server error", error: error.message})
    }
}