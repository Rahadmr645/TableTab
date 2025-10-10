import mongoose from 'mongoose';
const usersSchema = mongoose.Schema({

    name: {
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

}, { timestemps: true });

const User = mongoose.model('User', usersSchema);

export default User;