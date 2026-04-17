import mongoose from "mongoose";

const menuSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    image: { type: String },
    /** Cloudinary public_id for replace/delete */
    imagePublicId: { type: String, default: "" },
    category: {
        type: String,
        enum: [
            "Hot Drinks",
            "Cold Dirinks",
            "Tea",
            "Arabic Coffee",
            "Desserts",
            "Snacks",
            "Cakes",
            "Othres"
        ],
        required: true,
    },


    // extra Options for customization
    options: [
        {
            name: { type: String },
            values: [String],
        }

    ],

    soldCount: { type: Number, default: 0, min: 0 },
    likeCount: { type: Number, default: 0, min: 0 },
    dislikeCount: { type: Number, default: 0, min: 0 },
    ratingSum: { type: Number, default: 0, min: 0 },
    ratingCount: { type: Number, default: 0, min: 0 },

}, { timestamps: true });



const Menu = mongoose.model("Menu", menuSchema);

export default Menu;


