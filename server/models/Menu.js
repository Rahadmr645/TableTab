import mongoose from "mongoose";

const menuSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    image: { type: String },

  
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

    ]

}, { timestamps: true });



const Menu = mongoose.model("Menu", menuSchema);

export default Menu;


