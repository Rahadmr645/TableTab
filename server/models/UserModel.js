import mongoose from 'mongoose';
const usersSchema = mongoose.Schema({

    username: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    profilePic: {
        type: String,
        default: "",
    },
    role: {
        type: String,
        default: "user",
        enum: ["user", "chef", "admin"]
    }

}, { timestamps: true });

const User = mongoose.model('User', usersSchema);

export default User;