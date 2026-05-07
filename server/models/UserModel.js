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
    profilePicId: {
        type: String,
        default: "",
    },
    /** Snapshot `{ cart, quantities }` synced across devices when logged in */
    savedCart: {
        type: mongoose.Schema.Types.Mixed,
        default: undefined,
    },
}, { timestamps: true });

const User = mongoose.model('User', usersSchema);

export default User;