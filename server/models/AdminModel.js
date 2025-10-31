import mongoose from 'mongoose';
const adminSchema = mongoose.Schema({

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
        enum: ["chef", "admin"],
        require: true,
    }

}, { timestamps: true });

const Admin = mongoose.model('admin', adminSchema);

export default Admin;